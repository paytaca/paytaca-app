import * as wizardConnectService from 'src/wallet/wizardconnect/service'
import { Notify } from 'quasar'

const STORAGE_KEY = 'paytaca:wizardConnectUris'

function loadSavedUris () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUris (uris) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(uris))
}

function addSavedUri (uri) {
  const uris = loadSavedUris()
  if (!uris.includes(uri)) {
    uris.push(uri)
    saveUris(uris)
  }
}

function removeSavedUri (uri) {
  const uris = loadSavedUris().filter(u => u !== uri)
  saveUris(uris)
}

function serializeConnections (rawConnections) {
  const result = {}
  for (const [id, conn] of Object.entries(rawConnections)) {
    result[id] = serializeConnection(id, conn)
  }
  return result
}

function serializeConnection (id, conn) {
  return {
    id,
    uri: conn.uri || '',
    statusCode: conn.status?.status || 'disconnected',
    statusError: conn.status?.error || null,
    label: conn.label || '',
    dappName: conn.dappName || null,
    dappIcon: conn.dappIcon || null,
    connectedAt: conn.connectedAt || Date.now()
  }
}

export async function init ({ commit, dispatch, rootGetters }) {
  const walletIndex = rootGetters['global/getWalletIndex'] || 0
  const isChipnet = rootGetters['global/isChipnet'] || false
  wizardConnectService.setWalletConfig(walletIndex, isChipnet)

  let manager
  try {
    manager = await wizardConnectService.getManager()
  } catch (err) {
    // No wallet created yet — skip initialization silently
    console.log('WizardConnect: skipping init (no wallet):', err.message)
    return
  }

  manager.on('connectionStatusChanged', (connectionId) => {
    const conn = manager.getConnections()[connectionId]
    if (!conn) return
    commit('updateConnection', {
      connectionId,
      data: serializeConnection(connectionId, conn)
    })
  })

  manager.on('connectionsChanged', () => {
    const connections = serializeConnections(manager.getConnections())
    commit('setConnections', connections)
  })

  manager.on('pendingSignRequest', (pending) => {
    dispatch('handleSignRequest', pending)
  })

  manager.on('signCancelled', (connectionId, sequence) => {
    dispatch('handleSignCancelled', { connectionId, sequence })
  })

  manager.on('remoteDisconnect', (connectionId, reason, message) => {
    dispatch('handleRemoteDisconnect', { connectionId, reason, message })
  })

  // Clear stale pending requests from previous session
  commit('clearPendingRequests')

  // Restore saved connections
  const savedUris = loadSavedUris()
  for (const uri of savedUris) {
    try {
      manager.connect(uri)
    } catch (err) {
      console.warn('WizardConnect: failed to restore connection for URI:', err)
    }
  }

  // Sync initial connection state
  const connections = serializeConnections(manager.getConnections())
  commit('setConnections', connections)
}

export async function pair ({ commit, state }, { uri }) {
  if (!uri) throw new Error('URI is required')
  const normalizedUri = uri.trim()
  const connectionId = wizardConnectService.connect(normalizedUri)
  addSavedUri(normalizedUri)
  return connectionId
}

export async function disconnect ({ commit, state }, { connectionId }) {
  const connection = state.connections[connectionId]
  if (connection?.uri) {
    removeSavedUri(connection.uri)
  }
  wizardConnectService.disconnect(connectionId)
  commit('removeConnection', connectionId)
}

export async function handleSignRequest ({ commit, state }, pending) {
  const sequence = pending.request?.sequence
  const cancelledKey = `${pending.connectionId}:${sequence}`

  // Check if this request was already cancelled (race condition)
  if (state.cancelledKeys.includes(cancelledKey)) {
    commit('removeCancelledKey', cancelledKey)
    return
  }

  commit('addPendingRequest', {
    connectionId: pending.connectionId,
    sequence,
    userPrompt: pending.request?.transaction?.userPrompt || '',
    transactionJson: JSON.stringify(pending.request),
    summary: null
  })
}

export async function approveRequestWithData ({ commit }, { connectionId, sequence, transactionJson }) {
  commit('removePendingRequest', { connectionId, sequence })
  try {
    const request = JSON.parse(transactionJson)
    const signedTxHex = await wizardConnectService.signRequest(request)
    await wizardConnectService.sendSignResponse(connectionId, sequence, signedTxHex)
  } catch (err) {
    console.error('WizardConnect: sign error:', err)
    try {
      await wizardConnectService.sendSignError(connectionId, sequence, err.message || 'Signing failed')
    } catch {
      // Already disconnected
    }
  }
}

export async function rejectRequest ({ commit }, { connectionId, sequence }) {
  commit('removePendingRequest', { connectionId, sequence })
  try {
    await wizardConnectService.sendSignError(connectionId, sequence, 'User rejected')
  } catch {
    // Already disconnected
  }
}

export function handleSignCancelled ({ commit, state }, { connectionId, sequence }) {
  const key = `${connectionId}:${sequence}`
  const exists = state.pendingRequests.some(
    r => r.connectionId === connectionId && r.sequence === sequence
  )
  if (exists) {
    commit('removePendingRequest', { connectionId, sequence })
  } else {
    commit('addCancelledKey', key)
  }
}

export function handleRemoteDisconnect ({ commit, state }, { connectionId }) {
  const connection = state.connections[connectionId]
  if (connection?.uri) {
    removeSavedUri(connection.uri)
  }
  commit('removeConnection', connectionId)

  // Remove any pending requests for this connection
  const pending = state.pendingRequests.filter(r => r.connectionId === connectionId)
  for (const p of pending) {
    commit('removePendingRequest', { connectionId: p.connectionId, sequence: p.sequence })
  }

  Notify.create({
    message: `${connection?.dappName || 'dApp'} disconnected`,
    timeout: 3000,
    color: 'info',
    icon: 'mdi-connection'
  })
}

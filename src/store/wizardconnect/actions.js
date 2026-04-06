import * as wizardConnectService from 'src/wallet/wizardconnect/service'
import { Notify } from 'quasar'

function getStorageKey(walletHash) {
  if (!walletHash) return null
  return `paytaca:wizardConnectUris:${walletHash}`
}

function loadSavedUris(walletHash) {
  if (!walletHash) return []
  try {
    const key = getStorageKey(walletHash)
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUris(walletHash, uris) {
  if (!walletHash) return
  const key = getStorageKey(walletHash)
  localStorage.setItem(key, JSON.stringify(uris))
}

function addSavedUri(walletHash, uri) {
  if (!walletHash) return
  const uris = loadSavedUris(walletHash)
  if (!uris.includes(uri)) {
    uris.push(uri)
    saveUris(walletHash, uris)
  }
}

function removeSavedUri(walletHash, uri) {
  if (!walletHash) return
  const uris = loadSavedUris(walletHash).filter(u => u !== uri)
  saveUris(walletHash, uris)
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
  const walletHash = rootGetters['global/getWallet']?.('bch')?.walletHash || null
  
  wizardConnectService.setWalletConfig(walletIndex, isChipnet, walletHash)

  let manager
  try {
    manager = await wizardConnectService.getManager()
  } catch (err) {
    // No wallet created yet — skip initialization silently
    console.log('WizardConnect: skipping init (no wallet):', err.message)
    return
  }

  manager.off('connectionStatusChanged');
  manager.on('connectionStatusChanged', (connectionId) => {
    const conn = manager.getConnections()[connectionId]
    if (!conn) return
    console.log('WizC[connectionStatusChanged]', connectionId, conn);
    commit('updateConnection', {
      connectionId,
      data: serializeConnection(connectionId, conn)
    })
  })

  manager.off('connectionsChanged');
  manager.on('connectionsChanged', () => {
    const connections = serializeConnections(manager.getConnections())
    console.log('WizC[connectionsChanged]', connections);
    commit('setConnections', connections)
  })

  manager.off('pendingSignRequest');
  manager.on('pendingSignRequest', (pending) => {
    dispatch('handleSignRequest', pending)
  })

  manager.off('signCancelled');
  manager.on('signCancelled', (connectionId, sequence) => {
    dispatch('handleSignCancelled', { connectionId, sequence })
  })

  manager.off('remoteDisconnect');
  manager.on('remoteDisconnect', (connectionId, reason, message) => {
    dispatch('handleRemoteDisconnect', { connectionId, reason, message })
  })

  // Clear stale pending requests from previous session
  commit('clearPendingRequests')

  // Restore saved connections for this wallet
  const savedUris = loadSavedUris(walletHash)
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
  return manager;
}

export function reset ({ commit }) {
  wizardConnectService.reset()
  commit('clearPendingRequests')
  commit('setConnections', {})
}

export async function pair ({ commit, state, rootGetters }, { uri }) {
  if (!uri) throw new Error('URI is required')
  const normalizedUri = uri.trim()
  const walletHash = rootGetters['global/getWallet']?.('bch')?.walletHash || null
  const connectionId = wizardConnectService.connect(normalizedUri)
  addSavedUri(walletHash, normalizedUri)
  return connectionId
}

export async function disconnect ({ commit, state, rootGetters }, { connectionId }) {
  const walletHash = rootGetters['global/getWallet']?.('bch')?.walletHash || null
  const connection = state.connections[connectionId]
  if (connection?.uri) {
    removeSavedUri(walletHash, connection.uri)
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

export function handleRemoteDisconnect ({ commit, state, rootGetters }, { connectionId }) {
  const walletHash = rootGetters['global/getWallet']?.('bch')?.walletHash || null
  const connection = state.connections[connectionId]
  if (connection?.uri) {
    removeSavedUri(walletHash, connection.uri)
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

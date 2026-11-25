import { updatePubkey, sha256, getDeviceId } from './keys'
import { Store } from 'src/store'
import { backend, updateP2PProfile, assertP2PIdentity } from 'src/exchange/backend'
import { chatBackend } from './backend'
import { loadRampWallet, wallet } from 'src/exchange/wallet'
import { ChatIdentityManager } from './objects'
import { getEncryptionKeypairFromMnemonic, getAddress0_0PublicKey } from 'src/utils/memo-key-utils'

export const chatIdentityManager = new ChatIdentityManager()

const pendingChatIdentities = new Map()

function chatIdentityScope (usertype) {
  return JSON.stringify([
    Store.getters['global/getWallet']('bch')?.walletHash,
    Store.getters['global/getWalletIndex'], Store.getters['global/isChipnet'], usertype
  ])
}

/**
 * Loads or creates a chat identity for a user
 * @async
 * @param {string} usertype - The type of user (required) (valid values: peer | arbiter)
 * @param {Object} params - Parameters for chat identity
 * @param {string} params.name - The chat identity name of the user (required)
 * @param {string|null} params.chat_identity_id - The ID of an existing chat identity, if any
 * @throws {Error} Will throw an error if usertype or params.name is missing
 * @returns {Promise<Object>} The loaded or created chat identity object
 */
export async function loadChatIdentity (usertype, params = { name: null, chat_identity_id: null }) {
  if (!usertype) throw new Error('missing required parameter: usertype')
  if (!params.name) throw new Error('missing required parameter: params.name')
  if (!wallet) await loadRampWallet()
  const scope = chatIdentityScope(usertype)
  if (pendingChatIdentities.has(scope)) return pendingChatIdentities.get(scope)
  const pending = initializeChatIdentity(usertype, scope)
    .finally(() => {
      if (pendingChatIdentities.get(scope) === pending) pendingChatIdentities.delete(scope)
    })
  pendingChatIdentities.set(scope, pending)
  return pending
}

async function initializeChatIdentity (usertype, scope) {
  const assertCurrent = () => {
    if (scope !== chatIdentityScope(usertype) ||
        wallet?.walletHash !== Store.getters['global/getWallet']('bch')?.walletHash) {
      throw Object.assign(new Error('The active P2P wallet changed. Please reopen chat.'), { code: 'p2p_identity_mismatch' })
    }
  }
  assertCurrent()
  const profile = await assertP2PIdentity(null, usertype)
  assertCurrent()
  const linkedId = profile?.chat_identity_id
  const unavailable = () => Object.assign(new Error('Chat setup is temporarily unavailable. New or changed chat links cannot be enabled yet.'), { code: 'p2p_chat_link_unavailable' })
  if (!linkedId) throw unavailable()
  await chatIdentityManager._updateSignerData()
  assertCurrent()
  const existingIdentity = await fetchChatIdentityById(linkedId)
  assertCurrent()
  if (!existingIdentity || String(existingIdentity.id) !== String(linkedId) ||
      existingIdentity.ref !== generateChatIdentityRef(wallet.walletHash)) throw unavailable()

  const identity = chatIdentityManager.setIdentity(existingIdentity)
  try {
    await chatIdentityManager._updateEncryptionKeypair(true)
    assertCurrent()
  } catch (error) {
    chatIdentityManager.setIdentity(null)
    throw error
  }

  Store.commit('ramp/updateChatIdentity', { ref: identity?.ref, chatIdentity: identity })
  return identity
}

export function updateOrderChatSessionRef (orderId, chatRef) {
  return new Promise((resolve, reject) => {
    if (!orderId) {
      console.warn('Order ID is missing, skipping updateOrderChatSessionRef')
      resolve(null)
      return
    }
    const payload = { chat_session_ref: chatRef }
    backend.patch(`/ramp-p2p/order/${orderId}/`, payload, { authorize: true })
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to update order chat_session_ref:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to update order chat_session_ref:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function updateChatIdentityId (userType, id) {
  return new Promise((resolve, reject) => {
    const payload = { chat_identity_id: id }
    updateP2PProfile(userType, payload)
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to update chat identity id:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to update chat identity id:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function createChatIdentity (payload) {
  return new Promise((resolve, reject) => {
    chatBackend.post('chat/identities/', payload)
      .then(response => {
        // console.log('New chat identity:', response.data)
        resolve(response.data)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to create new chat identity:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to create new chat identity:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function fetchChatIdentityByRef (ref) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/identities/?ref=${ref}`, { forceSign: true })
      .then(response => {
        let identity = null
        if (response.data?.results?.length > 0) {
          identity = response.data?.results[0]
        }
        resolve(identity)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch chat identity:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to fetch chat identity:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function fetchChatIdentityById (id) {
  if (!id) return null
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/identities/${id}/`, { forceSign: true })
      .then(response => {
        resolve(response.data)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch chat identity:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to fetch chat identity:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function updateChatIdentity (payload) {
  return new Promise((resolve, reject) => {
    chatBackend.post('chat/identities/', payload, { forceSign: true })
      .then(response => {
        // console.log('Updated chat identity:', response.data)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to update chat identity:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to update chat identity:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function createChatSession (orderId, chatRef) {
  return new Promise((resolve, reject) => {
    // const chatRef = generateChatRef(orderId, createdAt, members)
    const payload = {
      ref: chatRef,
      title: `Ramp Order #${orderId} chat`
    }
    chatBackend.post('chat/sessions/', payload, { forceSign: true })
      .then(response => {
        // console.log('Created chat session:', response.data)
        resolve(response.data.ref)
      })
      .catch(error => {
        if (error.response) {
          // 403 means chat identity not found - this is expected if identity isn't created yet
          if (error.response.status === 403) {
            // Don't reject - let caller handle gracefully
            resolve(null)
          } else {
            console.error('Failed to create chat session:', error?.response?.status || error?.code || 'Request failed')
            reject(error)
          }
        } else {
          console.error('Failed to create chat session:', error?.code || 'Request failed')
          reject(error)
        }
      })
  })
}

export async function checkChatSessionAdmin (chatRef) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/sessions/${chatRef}/chat_member`, { forceSign: true })
      .then(response => {
        // console.log('Check chat admin:', response.data)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          // 403 means chat identity not found - this is expected if identity isn't created yet
          if (error.response.status === 403) {
            resolve(null)
          } else {
            console.error('Failed to check chat admin:', error?.response?.status || error?.code || 'Request failed')
            reject(error)
          }
        } else {
          console.error('Failed to check chat admin:', error?.code || 'Request failed')
          reject(error)
        }
      })
  })
}

export async function fetchChatSession (chatRef) {
  return chatBackend.get(`chat/sessions/${chatRef}/`, { forceSign: true })
}

export async function updateChatMembers (chatRef, members, removeMemberIds = []) {
  return new Promise((resolve, reject) => {
    const body = {
      chat_session_ref: chatRef,
      remove_chat_identities_id: removeMemberIds,
      members: members
    }
    chatBackend.patch(`chat/sessions/${chatRef}/members/`, body, { forceSign: true })
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          // 403 means chat identity not found - this is expected if identity isn't created yet
          if (error.response.status === 403) {
            // Resolve instead of reject to allow graceful handling
            resolve(null)
          } else {
            console.error('Failed to add chat members:', error?.response?.status || error?.code || 'Request failed')
            reject(error)
          }
        } else {
          console.error('Failed to add chat members:', error?.code || 'Request failed')
          reject(error)
        }
      })
  })
}

export async function fetchChatMembers (chatRef) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/members/full_info/?chat_ref=${chatRef}`, { forceSign: true })
      .then(response => {
        // console.log('Fetched chat members:', response)
        resolve(response.data.results)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch chat members:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to fetch chat members:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function updateLastRead (chatRef, messages) {
  if (!chatRef || !Array.isArray(messages)) return
  const msgTimestamps = messages
    .map(message => Number(message?.createdAt))
    .filter(timestamp => Number.isFinite(timestamp) && timestamp > 0)
  if (!msgTimestamps.length) return
  const latest = Math.max(...msgTimestamps)
  const lastRead = new Date(latest + 1000)
  if (!Number.isFinite(lastRead.getTime())) return
  const data = {
    last_read_timestamp: lastRead
  }
  return chatBackend.post(`chat/sessions/${chatRef}/chat_member/`, data, { forceSign: true })
    .then(response => {
      return response
    })
}

export function sendChatMessage (data, signData) {
  return new Promise((resolve, reject) => {
    const config = { forceSign: true }
    if (signData !== null) {
      config.signData = sha256(signData)
    }
    chatBackend.post('chat/messages/', data, config)
      .then(response => {
        // console.log('Sent message:', response)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to send message:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to send message:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export function fetchChatMessages (chatRef, offset = null, limit = 10) {
  return new Promise((resolve, reject) => {
    let url = `chat/messages/?chat_ref=${chatRef}&limit=${limit}`
    if (offset !== null && offset !== undefined) {
      url += `&offset=${offset}`
    }
    // console.log(`[fetchChatMessages] Requesting: ${url}`)
    chatBackend.get(url, { forceSign: true })
      .then(response => {
        // console.log('Messages: ', response)
        resolve(response.data)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch messages:', error?.response?.status || error?.code || 'Request failed')
        } else {
          console.error('Failed to fetch message:', error?.code || 'Request failed')
        }
        reject(error)
      })
  })
}

export async function fetchChatPubkeys (chatRef) {
  const response = await chatBackend.get(`chat/sessions/${chatRef}/pubkeys/`, { forceSign: true })
  if (!Array.isArray(response.data)) throw new Error('P2P chat public keys could not be read.')
  return response.data
}

export async function updateOrCreateKeypair (update = true, identity = null) {
  const userType = Store.getters['ramp/getUser']?.is_arbiter ? 'arbiter' : 'peer'
  const scope = chatIdentityScope(userType)
  const walletIndex = Store.getters['global/getWalletIndex']
  
  // Always derive fresh from mnemonic (no storage for cross-platform consistency)
  const keypair = await getEncryptionKeypairFromMnemonic(walletIndex)

  if (!keypair || !keypair.privkey || !keypair.pubkey) {
    throw new Error('Failed to generate keypair from mnemonic')
  }

  if (scope !== chatIdentityScope(userType)) {
    throw Object.assign(new Error('The active P2P wallet changed. Please reopen chat.'), { code: 'p2p_identity_mismatch' })
  }

  // Update pubkey on server if requested
  if (update) {
    const deviceId = await getDeviceId()
    if (scope !== chatIdentityScope(userType)) {
      throw Object.assign(new Error('The active P2P wallet changed. Please reopen chat.'), { code: 'p2p_identity_mismatch' })
    }
    const registered = deviceId && identity?.pubkeys?.some(pubkey =>
      pubkey.pubkey === keypair.pubkey && pubkey.deviceId === deviceId)
    if (registered) return keypair
    await updatePubkey(keypair.pubkey)
      .catch(error => {
        // Don't log 403 errors - they're expected when not authenticated yet
        // The error will be handled by the calling code
        if (error?.response?.status !== 403) {
          console.error(error.response || error)
        }
        // Still reject, but with a more informative message
        return Promise.reject('Failed to create/update chat pubkey to server')
      })
  }

  return keypair
}

export function generateChatRef (id, createdAt, members) {
  if (!members) throw Error('Missing required value: members')
  const hashVal = id + createdAt + members
  return sha256(hashVal)
}

export function generateChatIdentityRef (walletHash) {
  return sha256(walletHash)
}

export {
  sha256
}

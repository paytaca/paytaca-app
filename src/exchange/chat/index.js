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
  const pending = initializeChatIdentity(usertype, params, scope)
    .finally(() => {
      if (pendingChatIdentities.get(scope) === pending) pendingChatIdentities.delete(scope)
    })
  pendingChatIdentities.set(scope, pending)
  return pending
}

async function initializeChatIdentity (usertype, params, scope) {
  const assertCurrent = () => {
    if (scope !== chatIdentityScope(usertype) ||
        wallet?.walletHash !== Store.getters['global/getWallet']('bch')?.walletHash) {
      throw Object.assign(new Error('The active P2P wallet changed. Please reopen chat.'), { code: 'p2p_identity_mismatch' })
    }
  }
  assertCurrent()
  const payload = {
    user_type: usertype,
    name: params.name,
    chat_identity_id: params.chat_identity_id,
    ref: generateChatIdentityRef(wallet.walletHash)
  }

  const lookupIdentity = async () => {
    let identity = await fetchChatIdentityById(payload.chat_identity_id)
    assertCurrent()
    if (!identity || identity.ref !== payload.ref) {
      identity = await fetchChatIdentityByRef(payload.ref)
      assertCurrent()
    }
    return identity
  }
  const [, existingIdentity] = await Promise.all([
    assertP2PIdentity(null, usertype), lookupIdentity()
  ])
  assertCurrent()
  let identity = existingIdentity

  if (identity) {
    if (identity.ref !== payload.ref) throw new Error('The chat identity does not match the active wallet.')
    identity = chatIdentityManager.setIdentity(identity)
  }

  // Update chat verifying and encryption keypairs (short-circuits when not necessary)
  await chatIdentityManager._updateSignerData()
  assertCurrent()
  if (identity) await chatIdentityManager._updateEncryptionKeypair(true)
  assertCurrent()

  // Create identity, if not existing
  if (!identity) {
    try {
      identity = await chatIdentityManager.create(payload)
      assertCurrent()
    } catch (error) {
      const refErrors = error.response?.data?.ref
      if (error.response?.status !== 400 || !Array.isArray(refErrors) ||
          !refErrors.some(message => /already exists/i.test(message))) throw error
      identity = await fetchChatIdentityByRef(payload.ref)
      assertCurrent()
      if (!identity) throw error
      if (identity.ref !== payload.ref) throw new Error('The chat identity does not match the active wallet.')
      identity = chatIdentityManager.setIdentity(identity)
      await chatIdentityManager._updateEncryptionKeypair(true)
      assertCurrent()
    }
  }

  // Update chat identity id (in watchtower) if currently unset (null) or mismatch
  if (!payload.chat_identity_id || payload.chat_identity_id !== identity.id) {
    await updateChatIdentityId(payload.user_type, identity.id)
  }

  assertCurrent()
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
          console.error('Failed to update order chat_session_ref:', error.response)
        } else {
          console.error('Failed to update order chat_session_ref:', error)
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
          console.error('Failed to update chat identity id:', error.response)
        } else {
          console.error('Failed to update chat identity id:', error)
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
          console.error('Failed to create new chat identity:', error.response)
        } else {
          console.error('Failed to create new chat identity:', error)
        }
        reject(error)
      })
  })
}

export async function fetchChatIdentityByRef (ref) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/identities/?ref=${ref}`)
      .then(response => {
        let identity = null
        if (response.data?.results?.length > 0) {
          identity = response.data?.results[0]
        }
        resolve(identity)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch chat identity:', error.response)
        } else {
          console.error('Failed to fetch chat identity:', error)
        }
        reject(error)
      })
  })
}

export async function fetchChatIdentityById (id) {
  if (!id) return null
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/identities/${id}/`)
      .then(response => {
        resolve(response.data)
      })
      .catch(error => {
        if (error.response?.status === 404) {
          resolve(null)
          return
        }
        if (error.response) {
          console.error('Failed to fetch chat identity:', error.response)
        } else {
          console.error('Failed to fetch chat identity:', error)
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
          console.error('Failed to update chat identity:', error.response)
        } else {
          console.error('Failed to update chat identity:', error)
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
            console.error('Failed to create chat session:', error.response)
            reject(error)
          }
        } else {
          console.error('Failed to create chat session:', error)
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
            console.error('Failed to check chat admin:', error.response)
            reject(error)
          }
        } else {
          console.error('Failed to check chat admin:', error)
          reject(error)
        }
      })
  })
}

export async function fetchChatSession (chatRef) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/sessions/${chatRef}/`, { forceSign: true })
      .then(response => {
        // console.log('Chat session:', response.data)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          // 403 means chat identity not found - this is expected if identity isn't created yet
          if (error.response.status === 403) {
            // Resolve with null to indicate session doesn't exist yet
            resolve(null)
          } else if (error.response.status === 404) {
            // 404 means session doesn't exist - this is fine
            resolve(null)
          } else {
            console.error('Failed to fetch chat session:', error.response)
            reject(error)
          }
        } else {
          console.error('Failed to fetch chat session:', error)
          reject(error)
        }
      })
  })
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
            console.error('Failed to add chat members:', error.response)
            reject(error)
          }
        } else {
          console.error('Failed to add chat members:', error)
          reject(error)
        }
      })
  })
}

export async function fetchChatMembers (chatRef) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/members/full_info/?chat_ref=${chatRef}`)
      .then(response => {
        // console.log('Fetched chat members:', response)
        resolve(response.data.results)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch chat members:', error.response)
        } else {
          console.error('Failed to fetch chat members:', error)
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
          console.error('Failed to send message:', error.response)
        } else {
          console.error('Failed to send message:', error)
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
          console.error('Failed to fetch messages:', error.response)
        } else {
          console.error('Failed to fetch message:', error)
        }
        reject(error)
      })
  })
}

export function fetchChatPubkeys (chatRef) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/sessions/${chatRef}/pubkeys/`)
      .then(response => {
        if (!Array.isArray(response?.data)) reject({ response })
        // console.log('Chat pubkeys:', response?.data)
        resolve(response?.data)
      })
      .catch(error => {
        if (error.response) {
          // 403 means chat identity not found - this is expected if identity isn't created yet
          if (error.response.status === 403) {
            console.log('Chat pubkeys fetch failed - chat identity not ready yet')
            resolve([]) // Return empty array instead of rejecting
          } else {
            console.error('Failed to fetch chat pubkeys:', error.response)
            reject(error)
          }
        } else {
          console.error('Failed to fetch chat pubkeys:', error)
          reject(error)
        }
      })
  })
}

/**
 * Gets encryption keypair derived from mnemonic (address 0/0)
 * Always derives fresh from mnemonic to ensure cross-platform consistency
 * Optionally updates the pubkey on the server
 * @param {boolean} update - Whether to update pubkey on server
 * @returns {Promise<{privkey: string, pubkey: string}>}
 */
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

import { updatePubkey, saveKeypair, generateKeypair, sha256, getKeypair } from './keys'
import { loadWallet } from 'src/wallet'
import { Store } from 'src/store'
import { backend } from '../backend'
import { chatBackend } from './backend'
import { loadRampWallet, wallet } from 'src/exchange/wallet'
import { ChatIdentityManager } from './objects'

export const chatIdentityManager = new ChatIdentityManager()

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

  // const chatIDRef = generateChatIdentityRef(wallet.walletHash)

  const payload = {
    user_type: usertype,
    name: params.name,
    chat_identity_id: params.chat_identity_id
  }

  // let identity = await fetchChatIdentityByRef(chatIDRef)
  // fetch chat identity if existing, will return null if not existing
  let identity = await fetchChatIdentityById(payload.chat_identity_id)

  if (identity) {
    identity = chatIdentityManager.setIdentity(identity)
  }

  // Update chat verifying and encryption keypairs (short-circuits when not necessary)
  await chatIdentityManager._updateSignerData()
  await chatIdentityManager._updateEncryptionKeypair(!!identity)

  // Create identity, if not existing
  if (!identity) {
    payload.ref = generateChatIdentityRef(wallet.walletHash)
    identity = await chatIdentityManager.create(payload)
  }

  // Update chat identity id (in watchtower) if currently unset (null) or mismatch
  if (!payload.chat_identity_id || payload.chat_identity_id !== identity.id) {
    updateChatIdentityId(payload.user_type, identity.id)
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
    backend.patch(`/ramp-p2p/${userType}/`, payload, { authorize: true })
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
        if (error.response) {
          console.error('Failed to fetch chat identity:', error.response)
        } else {
          console.error('Failed to fetch chat identity:', error)
        }
        resolve()
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
  const msgTimestamps = messages
    .map(message => message.createdAt * 1)
    .filter(Boolean)
  const latest = Math.max(...msgTimestamps)
  const data = {
    last_read_timestamp: new Date(latest + 1000)
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

async function getKeypairSeed () {
  const wallet = await loadWallet('BCH', Store.getters['global/getWalletIndex'])
  const privkey = await wallet.BCH.getPrivateKey('0/0')
  return privkey
}

export async function updateOrCreateKeypair (update = true) {
  console.log('Updating chat encryption keypair')
  const seed = await getKeypairSeed()
  
  if (!seed || typeof seed !== 'string' || seed.length === 0) {
    throw new Error('Failed to get wallet private key from path 0/0 - cannot generate memo keypair. Memos require a deterministic keypair derived from the wallet.')
  }
  
  const keypair = generateKeypair({ seed: seed })

  try {
    const storedKeypair = await getKeypair()
    if (storedKeypair && storedKeypair.pubkey === keypair.pubkey && storedKeypair.privkey === keypair.privkey) {
      console.log('Chat encryption keypair still updated')
      return keypair // Return the keypair, not undefined
    }

  } catch (error) {
    console.error(error)
  }

  if (update) {
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

  await saveKeypair(keypair.privkey)
    .catch(error => {
      console.error(error)
      return Promise.reject('Failed to save chat privkey')
    })

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

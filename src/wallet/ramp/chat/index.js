import { updatePubkey, savePrivkey, generateKeypair, sha256 } from './keys'
import { loadWallet } from 'src/wallet'
import { Store } from 'src/store'
import { chatBackend, backend } from './backend'

export async function updatePeerChatIdentityId (id) {
  return new Promise((resolve, reject) => {
    const payload = { chat_identity_id: id }
    backend.put('/ramp-p2p/peer/detail', payload, { authorize: true })
      .then(response => {
        console.log('Updated chat identity id:', response.data)
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
        console.log('New chat identity:', response.data)
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

export async function fetchChatIdentity (ref) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/identities/?ref=${ref}`)
      .then(response => {
        let identity = null
        if (response.data?.results?.length > 0) {
          identity = response.data?.results[0]
          console.log('Chat identity:', identity)
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

export async function updateChatIdentity (payload) {
  return new Promise((resolve, reject) => {
    chatBackend.post('chat/identities/', payload, { forceSign: true })
      .then(response => {
        console.log('Updated chat identity:', response.data)
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

export async function createChatSession (orderId) {
  return new Promise((resolve, reject) => {
    const payload = {
      ref: `ramp-order-${orderId}-chat`,
      title: `Ramp Order #${orderId} chat`
    }
    chatBackend.post('chat/sessions/', payload, { forceSign: true })
      .then(response => {
        console.log('Created chat session:', response.data)
        resolve(response.data.ref)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to create chat session:', error.response)
        } else {
          console.error('Failed to create chat session:', error)
        }
        reject(error)
      })
  })
}

export async function checkChatSessionAdmin (chatRef) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/sessions/${chatRef}/chat_member`, { forceSign: true })
      .then(response => {
        console.log('Check chat admin:', response.data)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to check chat admin:', error.response)
        } else {
          console.error('Failed to check chat admin:', error)
        }
        reject(error)
      })
  })
}

export async function addChatMembers (chatRef, members) {
  return new Promise((resolve, reject) => {
    const body = {
      chat_session_ref: chatRef,
      members: members
    }
    chatBackend.patch(`chat/sessions/${chatRef}/members/`, body, { forceSign: true })
      .then(response => {
        console.log('Added chat members:', response)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to add chat members:', error.response)
        } else {
          console.error('Failed to add chat members:', error)
        }
        reject(error)
      })
  })
}

export async function fetchChatMembers (chatRef) {
  return new Promise((resolve, reject) => {
    console.log('chatRef:', chatRef)
    chatBackend.get(`chat/members/?chat_ref=${chatRef}`, { forceSign: true })
      .then(response => {
        console.log('Fetched chat members:', response)
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

export function sendChatMessage (data, signData) {
  return new Promise((resolve, reject) => {
    const config = { forceSign: true }
    if (signData !== null) {
      config.signData = sha256(signData)
    }
    chatBackend.post('chat/messages/', data, config)
      .then(response => {
        console.log('Sent message:', response)
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

export function fetchChatMessages (chatRef, limit = 10) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/messages/?chat_ref=${chatRef}&limit=${limit}`, { forceSign: true })
      .then(response => {
        console.log('Messages: ', response)
        resolve(response.data?.results)
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
        console.log('Chat pubkeys:', response?.data)
        resolve(response?.data)
      })
      .catch(error => {
        if (error.response) {
          console.error('Failed to fetch pubkeys:', error.response)
        } else {
          console.error('Failed to fetch pubkeys:', error)
        }
        reject(error)
      })
  })
}

async function getKeypairSeed () {
  const wallet = await loadWallet('BCH', Store.getters['global/getWalletIndex'])
  const privkey = await wallet.BCH.getPrivateKey('0')
  return privkey
}

export async function updateOrCreateKeypair () {
  console.log('Updating chat keypair')
  const seed = await getKeypairSeed()
  const keypair = generateKeypair({ seed })

  await savePrivkey(keypair.privkey)
    .catch(error => {
      console.error(error)
      return Promise.reject('Failed to save privkey')
    })

  await updatePubkey(keypair.pubkey)
    .catch(error => {
      console.error(error)
      if (error.response) {
        console.error(error.response)
      }
      return Promise.reject('Failed to save pubkey to server')
    })

  return keypair
}

export {
  sha256
}

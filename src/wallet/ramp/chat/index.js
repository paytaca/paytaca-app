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
          console.error('New chat identity:', error.response)
        } else {
          console.error('New chat identity:', error)
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
        if (response.results.length > 0) {
          identity = response.data?.results[0]
          console.log('Chat identity:', identity)
        }
        resolve(identity)
      })
      .catch(error => {
        if (error.response) {
          console.error(error.response)
        } else {
          console.error(error)
        }
        reject(error)
      })
  })
}

export async function updateChatIdentity (payload) {
  console.log('Updating chat identity')
  return new Promise((resolve, reject) => {
    chatBackend.post('chat/identities/', payload, { forceSign: true })
      .then(response => {
        console.log('updated chat identity:', response.data)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error(error.response)
        } else {
          console.error(error)
        }
        reject(error)
      })
  })
}

export async function createChatSession (orderId) {
  console.log('Creating chat session')
  const payload = {
    ref: `order-${orderId}-chat`,
    title: `Order #${orderId} chat`,
    order_id: orderId
  }
  return new Promise((resolve, reject) => {
    chatBackend.post('chat/sessions/', payload, { forceSign: true })
      .then(response => {
        console.log('created chat session:', response.data)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error(error.response)
        } else {
          console.error(error)
        }
        reject(error)
      })
  })
}

export async function checkChatSessionAdmin (chatRef) {
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/sessions/${chatRef}/chat_member`, { forceSign: true })
      .then(response => {
        console.log('Checking chat session admin:', response.data)
        resolve(response)
      })
      .catch(error => {
        if (error.response) {
          console.error('Checking chat session admin:', error.response)
        } else {
          console.error('Checking chat session admin:', error)
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

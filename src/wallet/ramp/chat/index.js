import { updatePubkey, savePrivkey, generateKeypair, sha256 } from './keys'
import { loadWallet } from 'src/wallet'
import { Store } from 'src/store'
import { chatBackend } from './backend'

export async function createChatIdentity (payload) {
  console.log('Creating chat identity')
  return new Promise((resolve, reject) => {
    chatBackend.post('chat/identities/', payload)
      .then(response => {
        console.log('new chat identity:', response.data)
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

export async function fetchChatIdentity (ref) {
  console.log('Fetching chat identity')
  return new Promise((resolve, reject) => {
    chatBackend.get(`chat/identities/?ref=${ref}`)
      .then(response => {
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

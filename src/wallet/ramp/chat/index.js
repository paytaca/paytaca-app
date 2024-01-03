import { updatePubkey, savePrivkey, generateKeypair, sha256 } from './keys'
import { loadWallet } from 'src/wallet'
import { Store } from 'src/store'

async function getKeypairSeed () {
  const wallet = await loadWallet('BCH', Store.getters['global/getWalletIndex'])
  const privkey = await wallet.BCH.getPrivateKey('0')
  return privkey
}

export async function updateOrCreateKeypair () {
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

import { updatePubkey, generateKeypair, sha256 } from './keys'
import { loadWallet } from 'src/wallet'
import { Store } from 'src/store'

async function getKeypairSeed() {
  const wallet = await loadWallet('BCH', Store.getters['global/getWalletIndex'])
  const privkey = await wallet.BCH.getPrivateKey('0')
  return privkey
}

export async function updateOrCreateKeypair() {
  const seed = await getKeypairSeed()
  
  if (!seed || typeof seed !== 'string' || seed.length === 0) {
    throw new Error('Failed to get wallet private key from path 0 - cannot generate memo keypair. Memos require a deterministic keypair derived from the wallet.')
  }
  
  const keypair = generateKeypair({ seed })

  await updatePubkey(keypair.pubkey)
    .catch(error => {
      console.error(error)
      return Promise.reject('Failed to save pubkey to server')
    })

  return keypair
}


export {
  sha256,
}

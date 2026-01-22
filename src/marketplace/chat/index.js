import { updatePubkey, sha256 } from './keys'
import { Store } from 'src/store'
import { getEncryptionKeypairFromMnemonic } from 'src/utils/memo-key-utils'

/**
 * Gets encryption keypair derived from mnemonic (address 0/0)
 * Always derives fresh from mnemonic to ensure cross-platform consistency
 * Updates the pubkey on the server
 * @returns {Promise<{privkey: string, pubkey: string}>}
 */
export async function updateOrCreateKeypair() {
  const walletIndex = Store.getters['global/getWalletIndex']
  
  // Always derive fresh from mnemonic (no storage for cross-platform consistency)
  const keypair = await getEncryptionKeypairFromMnemonic(walletIndex)

  if (!keypair || !keypair.privkey || !keypair.pubkey) {
    throw new Error('Failed to generate keypair from mnemonic')
  }

  // Update pubkey on server
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

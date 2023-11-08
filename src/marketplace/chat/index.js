import crypto from 'crypto'
import { getKeypair, savePrivkey, privToPub, updatePubkey } from './keys'

export async function updateOrCreateKeypair() {
  const keypair = await getKeypair()
    .catch(error => {
      console.error(error)
      return { privkey: '', pubkey: '' }
    })

  if (!keypair?.privkey) {
    const newPrivkey = crypto.randomFillSync(new Uint8Array(32))
    keypair.privkey = Buffer.from(newPrivkey).toString('hex')
    keypair.pubkey = privToPub(keypair.privkey)

    await savePrivkey(keypair.privkey)
      .then(success => success || Promise.reject())
      .catch(() => Promise.reject('Failed to save privkey locally'))
  }
  await updatePubkey(keypair.pubkey)
    .catch(error => {
      console.error(error)
      return Promise.reject('Failed to save pubkey to server')
    })

  return keypair
}

/**
 * @param {String} data 
 */
export function sha256(data) {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, 'utf8'))
  return _sha256.digest().toString('hex')
}
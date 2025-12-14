import crypto from 'crypto'
import { chatBackend } from './backend'
import * as secp from '@noble/secp256k1'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { Device } from '@capacitor/device'

const AES_STORAGE_KEY = 'ramp-chat-aes-key'

let deviceId
export async function getDeviceId () {
  if (!deviceId) {
    const deviceIdResp = await Device.getId()
    deviceId = deviceIdResp?.uuid || deviceIdResp?.identifier
  }
  return deviceId
}

/**
 * @param {String} pubkey
 */
export async function updatePubkey (pubkey) {
  const pubkeyBytes = Buffer.from(pubkey, 'hex')
  if (pubkeyBytes.length !== 33) throw new Error('Pubkey is not a 33 byte hex')

  const data = {
    pubkey: {
      pubkey: pubkey,
      device_id: await getDeviceId().catch(console.error)
    }
  }
  return chatBackend.post('chat/identities/', data, { forceSign: true })
}

export async function getKeypair () {
  try {
    const storageData = await SecureStoragePlugin.get({ key: AES_STORAGE_KEY })
    const parsedData = JSON.parse(storageData?.value)

    const response = { pubkey: '', privkey: '' }
    response.pubkey = parsedData?.pubkey
    response.privkey = parsedData?.privkey
    
    // If keypair is empty or invalid, return null to signal it needs regeneration
    if (!response.pubkey || !response.privkey) {
      console.warn('[getKeypair] Stored keypair is empty or invalid')
      return null
    }
    
    return response
  } catch (error) {
    // If storage read fails, return null to signal it needs regeneration
    console.warn('[getKeypair] Failed to read stored keypair:', error)
    return null
  }
}

/**
 * @param {String} privkey
 */
export async function saveKeypair (privkey) {
  const privkeyBytes = Buffer.from(privkey, 'hex')
  if (privkeyBytes.length !== 32) throw new Error('Privkey is not a 32 byte hex')

  const pubkey = privToPub(privkey)
  const keypair = { pubkey, privkey }
  const serializdKeypair = JSON.stringify(keypair)
  const response = await SecureStoragePlugin.set({ key: AES_STORAGE_KEY, value: serializdKeypair })
  return response.value
}

/**
 * @param {Object} opts
 * @param {String} opts.seed - Wallet private key from path '0' (required)
 */
export function generateKeypair (opts = { seed: '' }) {
  const seed = opts?.seed
  if (!seed || typeof seed !== 'string' || seed.length === 0) {
    throw new Error('generateKeypair requires a valid seed (wallet private key from path 0). Memos must be encrypted with a deterministic keypair derived from the wallet.')
  }
  
  const privkey = sha256(seed)
  const pubkey = privToPub(privkey)
  return { privkey, pubkey }
}

export function privToPub (priv) {
  const privBytes = secp.etc.hexToBytes(priv)
  const pub = secp.getPublicKey(privBytes)
  const pubHex = secp.etc.bytesToHex(pub)
  return pubHex
}

/**
 * @param {String} data
 * @returns {String}
 */
export function sha256 (data) {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, 'utf8'))
  return _sha256.digest().toString('hex')
}

import { backend } from "../backend"
import * as secp from '@noble/secp256k1'
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Device } from "@capacitor/device";

const AES_STORAGE_KEY = 'marketplace-chat-aes-key'

let deviceId
async function getDeviceId() {
  if (!deviceId) {
    const deviceIdResp = await Device.getId()
    deviceId = deviceIdResp?.uuid
  }
  return deviceId
}

/**
 * @param {String} pubkey 
 */
export async function updatePubkey(pubkey) {
  const pubkeyBytes = Buffer.from(pubkey, 'hex')
  if (pubkeyBytes.length !== 33) throw new Error('Pubkey is not a 33 byte hex')

  const data = {
    pubkey: { pubkey: pubkey, device_id: await getDeviceId().catch(console.error) },
  }
  return backend.post(`chat/identities/`, data)
}


export async function getKeypair() {
  const storageData = await SecureStoragePlugin.get({ key: AES_STORAGE_KEY })
  const parsedData = JSON.parse(storageData?.value)

  const response = { pubkey: '', privkey: '' }
  response.pubkey = parsedData?.pubkey
  response.privkey = parsedData?.privkey
  return response
}

/**
 * @param {String} privkey
 */
export async function savePrivkey(privkey) {
  const privkeyBytes = Buffer.from(privkey, 'hex')
  if (privkeyBytes.length !== 32) throw new Error('Privkey is not a 32 byte hex')
  
  const pubkey = privToPub(privkey)
  const keypair = { pubkey, privkey }
  const serializdKeypair = JSON.stringify(keypair)
  const response = await SecureStoragePlugin.set({ key: AES_STORAGE_KEY, value: serializdKeypair })
  return response.value
}


export function privToPub(priv) {
  const privBytes = secp.etc.hexToBytes(priv)
  const pub = secp.getPublicKey(privBytes)
  const pubHex = secp.etc.bytesToHex(pub)
  return pubHex
}

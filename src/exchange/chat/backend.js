import BCHJS from '@psf/bch-js'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { loadRampWallet } from 'src/exchange/wallet'
import axios from 'axios'
import { generateChatIdentityRef } from '.'

const bchjs = new BCHJS()

export const chatBackend = axios.create({
  baseURL: process.env.MARKETPLACE_BASE_URL || 'https://commercehub.paytaca.com/api'
})

chatBackend.interceptors.request.use(async (config) => {
  let data = config.data
  try {
    data = JSON.stringify(data)
  } catch (error) {}

  if (config.signData) {
    data = config.signData
    config.headers['X-Chat-Identity-Signdata'] = data
  }

  if (config.forceSign) {
    if (data === null || data === undefined) data = ''
    const timestamp = Date.now()
    data = Buffer.from(`${data}${timestamp}`).toString('hex')

    const signResponse = await signRequestData(data)
    if (!signResponse.signature) return config

    const chatIdentityRef = generateChatIdentityRef(signResponse.walletHash)
    config.headers['X-Chat-Identity'] = [chatIdentityRef, timestamp, signResponse.signature].join(':')
  }
  return config
})

const SIGNER_STORAGE_KEY = 'ramp-api-customer-signer-data'

export async function signRequestData (data) {
  const response = { walletHash: '', signature: '' }
  const { value } = await getSignerData()
  if (!value) {
    console.error('signRequestData value undefined')
    return response
  }

  const [walletHash, privkey] = value.split(':')
  if (!walletHash || !privkey) {
    console.error('signRequestData undefined walletHash || privkey')
    return response
  }
  response.walletHash = walletHash

  response.signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, data)
  return response
}

export async function getSignerData () {
  try {
    const data = await SecureStoragePlugin.get({ key: SIGNER_STORAGE_KEY })
    return { success: true, value: data.value }
  } catch (error) {
    return { success: false, error: error }
  }
}

export async function setSignerData (value = '') {
  try {
    if (!value) {
      const removeResp = await SecureStoragePlugin.remove({ key: SIGNER_STORAGE_KEY })
      return { success: removeResp.value }
    }

    const setResponse = await SecureStoragePlugin.set({ key: SIGNER_STORAGE_KEY, value: value })
    return { success: setResponse.value }
  } catch (error) {
    console.error(error)
    return { success: false, error: error }
  }
}

export async function updateSignerData () {
  console.log('Updating chat signer data')
  const wallet = loadRampWallet()

  // fetches the verifying keypair at adress path 0/0
  const verifyingPubkeyIndex = 0 // fixed verifying pubkey index
  const privkey = await wallet.privkey(null, `0/${verifyingPubkeyIndex}`)
  const verifyingPubkey = await wallet.pubkey(null, `0/${verifyingPubkeyIndex}`)

  // generate message and signature to verify
  const message = `${Date.now()}`
  const signature = await (await wallet.raw()).signMessage(message, verifyingPubkeyIndex)

  // get address from verifyingPubkey
  const pubkeyBuffer = Buffer.from(verifyingPubkey, 'hex')
  const ecPair = bchjs.ECPair.fromPublicKey(pubkeyBuffer)
  const address = bchjs.ECPair.toLegacyAddress(ecPair)

  // verify if signature is valid for address
  const valid = await (await wallet.raw()).verifyMessage(address, signature, message)
  if (!valid) return Promise.reject('Invalid signature on updateSignerData')

  // store this walletHash:privkey pair as current chat signer
  const walletHash = wallet?.walletHash
  await setSignerData(`${walletHash}:${privkey}`)
}

export function getChatBackendWsUrl () {
  return process.env.MARKETPLACE_WS_URL || ''
}

import BCHJS from '@psf/bch-js'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { loadRampWallet } from 'src/wallet/ramp/wallet'
import axios from 'axios'

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

    config.headers['X-Chat-Identity'] = [signResponse.walletHash, timestamp, signResponse.signature].join(':')
  }
  return config
})

const SIGNER_STORAGE_KEY = 'ramp-api-customer-signer-data'

export async function signRequestData (data) {
  const response = { walletHash: '', signature: '' }
  const { value } = await getSignerData()
  if (!value) {
    console.log('signRequestData value undefined')
    return response
  }

  const [walletHash, privkey] = value.split(':')
  if (!walletHash || !privkey) {
    console.log('signRequestData undefined walletHash || privkey')
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

export async function updateSignerData (currentVerifyingPubkey, currentIndex = 0) {
  console.log('Updating signer data')

  const wallet = loadRampWallet()
  const walletHash = wallet?.walletHash

  const verifyingPubkeyIndex = 0 // fixed verifying pubkey index
  const privkey = await wallet.privkey(null, `0/${verifyingPubkeyIndex}`)
  const verifyingPubkey = await wallet.pubkey(null, `0/${verifyingPubkeyIndex}`)
  if (currentVerifyingPubkey && currentVerifyingPubkey !== verifyingPubkey) {
    // Resolve the correct keypair
    console.log('Pubkeys do not match. Resolving correct keypair')
    const [keypair, index] = await resolveMatchingKeypair(wallet, currentVerifyingPubkey, currentIndex)
    if (!keypair || !index) {
      return Promise.reject('Failed to updateVerifyingPubkey: Could not find matching keypair/index')
    }
    // Update the verifying pubkey in the server
    await updateVerifyingPubkey(wallet, keypair, verifyingPubkey, index)
  }

  const pubkeyBuffer = Buffer.from(verifyingPubkey, 'hex')
  const message = `${Date.now()}`
  const signature = await (await wallet.raw()).signMessage(message, verifyingPubkeyIndex)
  const ecPair = bchjs.ECPair.fromPublicKey(pubkeyBuffer)
  const address = bchjs.ECPair.toLegacyAddress(ecPair)
  const valid = await (await wallet.raw()).verifyMessage(address, signature, message)
  if (!valid) return Promise.reject('Invalid signature on updateSignerData')

  const result = await setSignerData(`${walletHash}:${privkey}`)
  console.log('setSignerData result:', result)
}

async function resolveMatchingKeypair (wallet, currentVerifyingPubkey, endIndex) {
  let keypair = null
  let matchingIndex = null
  console.log(`Starting at index ${endIndex}`)
  for (let index = endIndex; index >= 0; index--) {
    const verifyingPubkey = await wallet.pubkey(null, `0/${index}`)
    if (verifyingPubkey === currentVerifyingPubkey) {
      console.log(`Found match at index ${index}`)
      const privateKey = await wallet.privkey(null, `0/${index}`)
      keypair = {
        publicKey: verifyingPubkey,
        privateKey: privateKey
      }
      matchingIndex = index
      break
    }
  }
  return [keypair, matchingIndex]
}

async function updateVerifyingPubkey (wallet, keypair, verifyingPubkey, index) {
  // set the signer data temporarily
  const pubkeyBuffer = Buffer.from(keypair.publicKey, 'hex')
  const message = `${Date.now()}`
  const signature = await (await wallet.raw()).signMessage(message, index)
  const ecPair = bchjs.ECPair.fromPublicKey(pubkeyBuffer)
  const address = bchjs.ECPair.toLegacyAddress(ecPair)
  const valid = await (await wallet.raw()).verifyMessage(address, signature, message)
  if (!valid) return Promise.reject('Invalid signature in updateVerifyingPubkey')
  setSignerData(`${wallet.walletHash}:${keypair.privateKey}`)

  // set the verifying pubkey to the pubkey at 0/0
  const data = {
    verifying_pubkey: verifyingPubkey
  }
  await chatBackend.post('chat/identities/', data, { forceSign: true })
    .then(response => {
      console.log('Updated verifying pubkey:', response.data)
    })
    .catch(error => {
      console.error(error.response)
    })
}

export function getChatBackendWsUrl () {
  return process.env.MARKETPLACE_WS_URL || ''
}

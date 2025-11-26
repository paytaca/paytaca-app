import BCHJS from '@psf/bch-js'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { loadRampWallet, wallet } from 'src/exchange/wallet'
import axios from 'axios'
import { generateChatIdentityRef } from '.'
import { getCurrentWalletStorageKey, getWalletStorageKey } from 'src/utils/wallet-storage'

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

    console.log('signResponse.walletHash:', signResponse.walletHash)
    const chatIdentityRef = generateChatIdentityRef(signResponse.walletHash)
    config.headers['X-Chat-Identity'] = [chatIdentityRef, timestamp, signResponse.signature].join(':')
  }
  return config
})

const SIGNER_STORAGE_KEY_PREFIX = 'ramp-api-customer-signer-data'

/**
 * Get wallet-specific storage key for chat signer data
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {string} Storage key with wallet hash
 */
function getSignerDataStorageKey(walletHash = null) {
  if (walletHash) {
    return getWalletStorageKey(SIGNER_STORAGE_KEY_PREFIX, walletHash)
  }
  return getCurrentWalletStorageKey(SIGNER_STORAGE_KEY_PREFIX)
}

export async function signRequestData (data, walletHash = null) {
  const response = { walletHash: '', signature: '' }
  const { value } = await getSignerData(walletHash)
  if (!value) {
    console.error('signRequestData value undefined')
    return response
  }

  const [storedWalletHash, privkey] = value.split(':')
  if (!storedWalletHash || !privkey) {
    console.error('signRequestData undefined walletHash || privkey')
    return response
  }
  response.walletHash = storedWalletHash

  response.signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, data)
  return response
}

export async function getSignerData (walletHash = null) {
  try {
    const key = getSignerDataStorageKey(walletHash)
    const data = await SecureStoragePlugin.get({ key })
    return { success: true, value: data.value }
  } catch (error) {
    return { success: false, error: error }
  }
}

export async function setSignerData (value = '', walletHash = null) {
  try {
    const key = getSignerDataStorageKey(walletHash)
    if (!value) {
      const removeResp = await SecureStoragePlugin.remove({ key })
      return { success: removeResp.value }
    }

    const setResponse = await SecureStoragePlugin.set({ key, value: value })
    return { success: setResponse.value }
  } catch (error) {
    console.error(error)
    return { success: false, error: error }
  }
}

export async function updateSignerData () {
  console.log('Updating chat signer data')
  if (!wallet) await loadRampWallet()

  // fetches the verifying keypair at address path 0/0
  const verifyingPubkeyIndex = 0 // fixed verifying pubkey index at 0
  const addressPath = wallet.addressPath(verifyingPubkeyIndex)
  const privkey = wallet.privkey(addressPath)
  const verifyingPubkey = wallet.pubkey(addressPath)
  const walletHash = wallet?.walletHash

  if (!walletHash) {
    console.error('Wallet hash not available for updating signer data')
    return Promise.reject('Wallet hash not available')
  }

  // return if no need to update signer data
  const signerData = await getSignerData(walletHash)
  const storedWalletHash = signerData?.value?.split(':')[0]
  const storedPrivKey = signerData?.value?.split(':')[1]
  if (storedWalletHash === walletHash && storedPrivKey === privkey) {
    console.log('Chat signer data is still updated.')
    return
  }

  // generate message and signature to verify
  const message = `${Date.now()}`
  const signature = wallet.signMessage(privkey, message)

  // verify if signature is valid for address
  const valid = wallet.verifyMessage(verifyingPubkey, message, signature)
  if (!valid) return Promise.reject('Invalid signature on updateSignerData')

  // store this walletHash:privkey pair as current chat signer
  await setSignerData(`${walletHash}:${privkey}`, walletHash)
  console.log('Chat signer data updated')
}

export function getChatBackendWsUrl () {
  return process.env.MARKETPLACE_WS_URL || ''
}

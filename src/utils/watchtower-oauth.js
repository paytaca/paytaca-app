import axios from 'axios'
import { Store } from 'src/store'
import { BitcoinCashOAuthClient } from 'bitcoincash-oauth-client'
import {
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
} from "@bitauth/libauth"
import { mnemonicToSeedSync } from 'bip39'
import { getMnemonicByHash } from 'src/wallet'
import { pubkeyToAddress } from 'src/utils/crypto'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

const OAUTH_TOKEN_KEY = 'watchtower-oauth-token'
const OAUTH_ADDRESS_PATH = "0/0"
const BCH_DERIVATION_PATH = "m/44'/145'/0'"

function getWalletHash () {
  return Store.getters['global/getWallet']('bch')?.walletHash
}

function getWatchtowerUrl () {
  const isChipnet = Store.getters['global/isChipnet']
  return isChipnet
    ? (process.env.CHIPNET_WATCHTOWER_BASE_URL || 'https://chipnet.watchtower.cash/api')
    : (process.env.MAINNET_WATCHTOWER_BASE_URL || 'https://watchtower.cash/api')
}

function getOAuthDomain() {
  const baseURL = getWatchtowerUrl()
  if (!baseURL) return 'localhost'
  try {
    const url = new URL(baseURL)
    return url.hostname
  } catch (e) {
    const match = baseURL.match(/https?:\/\/([^\/]+)/)
    return match ? match[1] : 'localhost'
  }
}

async function deriveOAuthCredentials() {
  const walletHash = getWalletHash()
  if (!walletHash) throw new Error('Wallet hash not available')

  const mnemonic = await getMnemonicByHash(walletHash)
  if (!mnemonic) throw new Error('Mnemonic not available for wallet')

  const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
  const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)
  const fullPath = `${BCH_DERIVATION_PATH}/${OAUTH_ADDRESS_PATH}`
  const addressNode = deriveHdPath(rootNode, fullPath)
  if (typeof addressNode === 'string') {
    throw new Error(`Failed to derive address node: ${addressNode}`)
  }

  const publicNode = deriveHdPublicNode(addressNode)
  const publicKey = binToHex(publicNode.publicKey)
  const address = pubkeyToAddress(publicKey, false)

  return {
    privateKey: binToHex(addressNode.privateKey),
    publicKey,
    address,
    walletHash
  }
}

async function getStoredToken() {
  try {
    const result = await SecureStoragePlugin.get({ key: OAUTH_TOKEN_KEY })
    return result.value
  } catch (error) {
    return null
  }
}

async function saveToken(token) {
  try {
    await SecureStoragePlugin.set({ key: OAUTH_TOKEN_KEY, value: token })
  } catch (error) {
    console.error('[Watchtower OAuth] Failed to save token:', error)
  }
}

export async function clearToken() {
  try {
    await SecureStoragePlugin.remove({ key: OAUTH_TOKEN_KEY })
  } catch (error) {
    // Token might not exist
  }
}

async function axiosFetch(url, options = {}) {
  const { method = 'GET', headers = {}, body } = options
  try {
    const response = await axios({ url, method, headers, data: body })
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
      json: async () => response.data,
      text: async () => JSON.stringify(response.data)
    }
  } catch (error) {
    if (error.response) {
      return {
        ok: false,
        status: error.response.status,
        statusText: error.response.statusText,
        headers: new Headers(error.response.headers),
        json: async () => error.response.data,
        text: async () => JSON.stringify(error.response.data)
      }
    }
    throw error
  }
}

export async function getAuthHeaders() {
  const walletHash = getWalletHash()
  if (!walletHash) throw new Error('Wallet hash not available')

  const storedToken = await getStoredToken()
  if (storedToken) {
    return { 'Authorization': `Bearer ${storedToken}` }
  }

  const credentials = await deriveOAuthCredentials()
  
  const isChipnet = Store.getters['global/isChipnet']
  const client = new BitcoinCashOAuthClient({
    serverUrl: getWatchtowerUrl(),
    network: isChipnet ? 'chipnet' : 'mainnet',
    authBasePath: '/bch-auth',
    fetch: axiosFetch
  })

  const domain = getOAuthDomain()
  const timestamp = Math.floor(Date.now() / 1000)

  try {
    // Try to authenticate first
    const auth = await client.authenticate(
      walletHash,
      credentials.privateKey,
      credentials.publicKey,
      timestamp,
      domain
    )
    
    await saveToken(auth.access_token)
    return { 'Authorization': `Bearer ${auth.access_token}` }
  } catch (err) {
    // If user not found (404), register first then authenticate
    const statusCode = err?.statusCode || err?.status
    if (statusCode === 404) {
      await client.register(
        credentials.address,
        credentials.privateKey,
        credentials.publicKey,
        walletHash,
        timestamp,
        domain
      )
      
      // Retry authentication after registration
      const newTimestamp = Math.floor(Date.now() / 1000)
      const auth = await client.authenticate(
        walletHash,
        credentials.privateKey,
        credentials.publicKey,
        newTimestamp,
        domain
      )
      
      await saveToken(auth.access_token)
      return { 'Authorization': `Bearer ${auth.access_token}` }
    }
    
    throw err
  }
}

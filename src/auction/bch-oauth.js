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

export const baseURL = process.env.AUCTION_HUB_API ?? 'http://localhost:8000/api'

// Token key information and paths
const OAUTH_TOKEN_KEY = 'auctionhub-oauth-token'
const OAUTH_ADDRESS_PATH = "0/0"
const BCH_DERIVATION_PATH = "m/44'/145'/0'"


// Gets the user's wallet hash
export function getWalletHash () {
  return Store.getters['global/getWallet']('bch')?.walletHash
}

// Gets the oauth domain (localhost for now)
function getOAuthDomain() {
  if (!baseURL) return 'localhost'
  try {
    const url = new URL(baseURL)
    return url.hostname
  } catch (error) {
    console.error('[OAuth] Failed to get OAuth Domain', error)
    const match = baseURL.match(/https?:\/\/([^/]+)/)
    return match ? match[1] : 'localhost'
  }
}

// Fetch existing oauth credentials
export async function deriveOAuthCredentials() {
  // Get the wallet hash
  const walletHash = getWalletHash()
  if (!walletHash) throw new Error('Wallet hash not available')

  // Get the wallet's mnemonic
  const mnemonic = await getMnemonicByHash(walletHash)
  if (!mnemonic) throw new Error('Mnemonic not available for wallet')

  // Data needed for the address node
  const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
  const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)
  const fullPath = `${BCH_DERIVATION_PATH}/${OAUTH_ADDRESS_PATH}`
  const addressNode = deriveHdPath(rootNode, fullPath)
  
  if (typeof addressNode === 'string') 
    throw new Error(`Failed to derive address node: ${addressNode}`)

  // Get wallet information
  const isChipnet = Store.getters['global/isChipnet']
  const publicNode = deriveHdPublicNode(addressNode)
  const publicKey = binToHex(publicNode.publicKey)
  const address = pubkeyToAddress(publicKey, isChipnet)

  return {
    privateKey: binToHex(addressNode.privateKey),
    publicKey,
    address,
    walletHash
  }
}

// Fetch stored token
export async function getStoredToken() {
  try {
    // Fetch the stored token
    const result = await SecureStoragePlugin.get({ key: OAUTH_TOKEN_KEY })
    let stored
    try {
      stored = JSON.parse(result.value)
    } catch {
      return null // failed to parse stored token
    }

    // Check if the stored wallet hash matches the one from getWalletHash 
    const walletHash = getWalletHash()
    if (!stored || stored.walletHash !== walletHash) return null
    return stored

  } catch (error) {
    console.error('[OAuth] Failed to get stored token:', error)
    return null
  }
}

// Save the token 
async function saveToken(auth, walletHash) {
  try {
    const expiresAt = auth.expires_in
      ? Date.now() + (auth.expires_in * 1000)
      : null
    await SecureStoragePlugin.set({
      key: OAUTH_TOKEN_KEY,
      value: JSON.stringify({
        token: auth.access_token,
        refreshToken: auth.refresh_token,
        expiresAt,
        walletHash
      })
    })
  } catch (error) {
    console.error('[OAuth] Failed to save token:', error)
  }
}

// Clear token from secure storage
export async function clearToken() {
  try {
    await SecureStoragePlugin.remove({ key: OAUTH_TOKEN_KEY })
  } catch (error) {
    console.error('[OAuth] Failed to clear token:', error)
  }
}

// AxiosFetch used for getAuthHeaders
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

// Gets the auth headers to permit API requests
export async function getAuthHeaders() {
  const walletHash = getWalletHash()
  if (!walletHash) throw new Error('Wallet hash not available')
  
  const stored = await getStoredToken()
  if (stored?.token && (!stored.expiresAt || Date.now() < stored.expiresAt)) {
    return { 'Authorization': `Bearer ${stored.token}` }
  }

  const credentials = await deriveOAuthCredentials()

  const isChipnet = Store.getters['global/isChipnet']
  const client = new BitcoinCashOAuthClient({
    serverUrl: baseURL,
    network: isChipnet ? 'chipnet' : 'mainnet', // for production
    authBasePath: '/auth', // for auth base path in the baseURL
    fetch: axiosFetch
  })

  // Re-derive to get raw private key bytes
  //const mnemonic = await getMnemonicByHash(walletHash)
  //const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
  //const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)
  //const fullPath = `${BCH_DERIVATION_PATH}/${OAUTH_ADDRESS_PATH}`
  //const addressNode = deriveHdPath(rootNode, fullPath)

	// Convert private key to hex format expected by OAuth client
	//const privateKeyHex = binToHex(addressNode.privateKey)

  const domain = getOAuthDomain()
  const timestamp = Math.floor(Date.now() / 1000)
	//const message = client.createAuthMessage(walletHash, timestamp, domain)
  //const signature = await client.signAuthMessage(message, privateKeyHex)

  try {
    if (stored?.refreshToken) {
      try {
        const auth = await client.refreshToken(stored.refreshToken)
        await saveToken(auth, walletHash)
        return { 'Authorization': `Bearer ${auth.access_token}` }
      } catch (error) {
        console.warn('[OAuth] Token refresh failed, re-authenticating:', error)
      }
    }

    // Try to authenticate first
    const auth = await client.authenticate(
      walletHash,
      credentials.privateKey,
      credentials.publicKey,
      timestamp,
      domain
    )

    await saveToken(auth, walletHash)
    return { 'Authorization': `Bearer ${auth.access_token}` }
  } catch (error) {
    // If user not found (404), register first then authenticate
    const statusCode = error?.statusCode ?? error?.status

    if (statusCode === 404) {
		  console.error('[OAuth] User not found, registering...')
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
      
      await saveToken(auth, walletHash)
      return { 'Authorization': `Bearer ${auth.access_token}` }
    } 
    console.error('[OAuth] status code: ' + statusCode)
    throw error
  }
}


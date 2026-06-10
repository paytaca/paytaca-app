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

const OAUTH_TOKEN_KEY = 'auctionhub-oauth-token'
const OAUTH_ADDRESS_PATH = "0/0"
const BCH_DERIVATION_PATH = "m/44'/145'/0'"

export const baseURL = process.env.AUCTION_HUB_API || 'http://localhost:8000/api'

// oauth: gets wallet hash
export function getWalletHash () {
  return Store.getters['global/getWallet']('bch')?.walletHash
}

// oauth: gets the oauth domain (localhost for now)
function getOAuthDomain() {
  if (!baseURL) return 'localhost'
  try {
    const url = new URL(baseURL)
    console.log('[getoauthdomain] url.domain = ' + url.hostname);
    return url.hostname
  } catch (e) {
    const match = baseURL.match(/https?:\/\/([^\/]+)/)
    return match ? match[1] : 'localhost'
  }
}

// oauth: fetch existing oauth credentials
export async function deriveOAuthCredentials() {
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
  const address = pubkeyToAddress(publicKey, true)

  return {
    privateKey: binToHex(addressNode.privateKey),
    publicKey,
    address,
    walletHash
  }
}

// oauth: fetch stored token
export async function getStoredToken() {
  try {
    const result = await SecureStoragePlugin.get({ key: OAUTH_TOKEN_KEY })
    return result.value
  } catch (error) {
    return null
  }
}

// oauth: save token 
async function saveToken(token) {
  try {
    await SecureStoragePlugin.set({ key: OAUTH_TOKEN_KEY, value: token })
		console.log('[OAuth] Token saved to secure storage')
  } catch (error) {
    console.error('[OAuth] Failed to save token:', error)
  }
}

// oauth: clear token from secure storage
export async function clearToken() {
  try {
    await SecureStoragePlugin.remove({ key: OAUTH_TOKEN_KEY })
		console.log('[OAuth] Token cleared from secure storage')
  } catch (error) {
    // Token might not exist
  }
}

// oauth: axiosFetch used for getAuthHeaders
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

// oauth: gets the auth headers to permit API requests
export async function getAuthHeaders() {
  const walletHash = getWalletHash()
  if (!walletHash) throw new Error('Wallet hash not available')

  const storedToken = await getStoredToken()
  if (storedToken) {
		console.log('[OAuth] Using stored token')
    return { 'Authorization': `Bearer ${storedToken}` }
  }

	console.log('[OAuth] No stored token, authenticating...')
  const credentials = await deriveOAuthCredentials()
  console.log('private key: ' + credentials.privateKey)
  console.log('pubkey: ' + credentials.publicKey)
  console.log('address: ' + credentials.address)
  console.log('walletHash: ' + credentials.walletHash)

  //const isChipnet = Store.getters['global/isChipnet']
  const client = new BitcoinCashOAuthClient({
    serverUrl: baseURL,
    network: 'chipnet', // for production
    authBasePath: '/auth', // for auth base path in the baseURL
    fetch: axiosFetch
  })

  // Re-derive to get raw private key bytes
  const mnemonic = await getMnemonicByHash(walletHash)
  const mnemonicBin = new Uint8Array(mnemonicToSeedSync(mnemonic))
  const rootNode = deriveHdPrivateNodeFromSeed(mnemonicBin)
  const fullPath = `${BCH_DERIVATION_PATH}/${OAUTH_ADDRESS_PATH}`
  const addressNode = deriveHdPath(rootNode, fullPath)

	// Convert private key to hex format expected by OAuth client
	const privateKeyHex = binToHex(addressNode.privateKey)

  const domain = getOAuthDomain()
  console.log('[OAuth] Domain: ', domain)
  const timestamp = Math.floor(Date.now() / 1000)
  console.log('[OAuth] Timestamp: ', timestamp)
	const message = client.createAuthMessage(walletHash, timestamp, domain)
	console.log('[OAuth] Message to sign:', message)
  const signature = await client.signAuthMessage(message, privateKeyHex)
	console.log('[OAuth] Signature:', signature)

  try {
    // Try to authenticate first
    console.log('[OAuth] Attempting to authenticate user...')
    const auth = await client.authenticate(
      walletHash,
      credentials.privateKey,
      credentials.publicKey,
      timestamp,
      domain
    )

    console.log('[OAuth] after client.authenticate: ' + auth)
    
    await saveToken(auth.access_token)
    return { 'Authorization': `Bearer ${auth.access_token}` }
  } catch (err) {
    // If user not found (404), register first then authenticate
    const statusCode = err?.statusCode || err?.status

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
      
      await saveToken(auth.access_token)
      return { 'Authorization': `Bearer ${auth.access_token}` }
    } 
    console.error('[OAuth] status code: ' + statusCode)
    
    throw err
  }
}



/**
 * Utility functions for dynamically generating addresses from seed phrase
 * This approach is more reliable than storing addresses, especially with multi-wallet setups
 * 
 * IMPORTANT: All generated addresses are subscribed to watchtower before being returned
 * This ensures the wallet can track transactions to/from these addresses
 */

import BCHJS from '@psf/bch-js'
import Watchtower from 'src/lib/watchtower'
import sha256 from 'js-sha256'
import { convertCashAddress } from 'src/wallet/chipnet'
import { getMnemonic } from 'src/wallet'

const bchjs = new BCHJS()

const projectId = {
  mainnet: process.env.WATCHTOWER_PROJECT_ID,
  chipnet: process.env.WATCHTOWER_CHIP_PROJECT_ID
}

/**
 * Computes wallet hash the same way BchWallet does
 * @param {string} mnemonic 
 * @param {string} derivationPath 
 * @returns {string}
 */
function computeWalletHash(mnemonic, derivationPath) {
  const mnemonicHash = sha256(mnemonic)
  const derivationPathHash = sha256(derivationPath)
  const walletHash = sha256(mnemonicHash + derivationPathHash)
  return walletHash
}

/**
 * Dynamically generates an address set (receiving + change) from mnemonic
 * and subscribes them to watchtower before returning
 * 
 * @param {Object} opts
 * @param {number} opts.walletIndex - Index of the wallet in vault
 * @param {string} opts.derivationPath - BIP44 derivation path (e.g., "m/44'/145'/0'")
 * @param {number} opts.addressIndex - Address index to generate
 * @param {boolean} opts.isChipnet - Whether to generate chipnet address
 * @returns {Promise<{success: boolean, addresses?: {receiving: string, change: string}, error?: string}>}
 */
export async function generateAddressSetFromMnemonic(opts) {
  const { walletIndex = 0, derivationPath, addressIndex, isChipnet = false } = opts

  if (!derivationPath) {
    return { success: false, error: 'Derivation path is required' }
  }

  // Validate addressIndex - must be a non-negative integer
  // Default to 0 if invalid (new wallets start with -1)
  let validAddressIndex = addressIndex
  if (typeof addressIndex !== 'number' || addressIndex < 0 || !Number.isInteger(addressIndex)) {
    validAddressIndex = 0
  }

  try {
    // Get mnemonic from secure storage
    const mnemonic = await getMnemonic(walletIndex)
    if (!mnemonic) {
      return { success: false, error: 'Mnemonic not found' }
    }

    // Generate master HD node from mnemonic
    const seedBuffer = await bchjs.Mnemonic.toSeed(mnemonic)
    const masterHDNode = bchjs.HDNode.fromSeed(seedBuffer)
    
    // Derive child node for the given derivation path
    const childNode = masterHDNode.derivePath(derivationPath)
    
    // Generate receiving address (0/index) and change address (1/index)
    const receivingAddressNode = childNode.derivePath('0/' + validAddressIndex)
    const changeAddressNode = childNode.derivePath('1/' + validAddressIndex)

    let receivingAddress = bchjs.HDNode.toCashAddress(receivingAddressNode)
    let changeAddress = bchjs.HDNode.toCashAddress(changeAddressNode)

    // Convert to chipnet format if needed
    if (isChipnet) {
      receivingAddress = convertCashAddress(receivingAddress, isChipnet, false)
      changeAddress = convertCashAddress(changeAddress, isChipnet, false)
    }

    // CRITICAL: Subscribe addresses to watchtower before returning
    const addressSet = {
      receiving: receivingAddress,
      change: changeAddress
    }

    const walletHash = computeWalletHash(mnemonic, derivationPath)
    const projId = isChipnet ? projectId.chipnet : projectId.mainnet
    
    const watchtower = new Watchtower(isChipnet)
    const subscriptionData = {
      addresses: addressSet,
      projectId: projId,
      walletHash: walletHash,
      addressIndex: validAddressIndex
    }

    let subscriptionResult
    try {
      subscriptionResult = await watchtower.subscribe(subscriptionData)
    } catch (error) {
      console.error('[generateAddressSetFromMnemonic] Watchtower subscribe threw an error:', error)
      return {
        success: false,
        error: `Watchtower subscription error: ${error.message || 'Unknown error'}`
      }
    }
    
    if (!subscriptionResult || !subscriptionResult.success) {
      console.error('[generateAddressSetFromMnemonic] Failed to subscribe addresses to watchtower:', subscriptionResult)
      return { 
        success: false, 
        error: subscriptionResult?.error || subscriptionResult?.message || 'Failed to subscribe addresses to watchtower. Addresses not returned for safety.' 
      }
    }

    return {
      success: true,
      addresses: addressSet
    }
  } catch (error) {
    console.error('Error generating and subscribing address set:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to generate address set' 
    }
  }
}

/**
 * Generates just the receiving address (with watchtower subscription)
 * @param {Object} opts - Same as generateAddressSetFromMnemonic
 * @returns {Promise<string|null>} Returns address if successful, null if subscription failed
 */
export async function generateReceivingAddress(opts) {
  const result = await generateAddressSetFromMnemonic(opts)
  if (!result.success) {
    console.error('Failed to generate receiving address:', result.error)
    return null
  }
  return result.addresses.receiving
}

/**
 * Generates just the change address (with watchtower subscription)
 * @param {Object} opts - Same as generateAddressSetFromMnemonic
 * @returns {Promise<string|null>} Returns address if successful, null if subscription failed
 */
export async function generateChangeAddress(opts) {
  const result = await generateAddressSetFromMnemonic(opts)
  if (!result.success) {
    console.error('Failed to generate change address:', result.error)
    return null
  }
  return result.addresses.change
}

/**
 * Gets the derivation path for a wallet type
 * @param {string} walletType - 'bch', 'slp', or 'sbch'
 * @returns {string}
 */
export function getDerivationPathForWalletType(walletType) {
  const derivationPaths = {
    bch: "m/44'/145'/0'",
    slp: "m/44'/245'/0'",
    sbch: "m/44'/60'/0'/0"
  }
  
  return derivationPaths[walletType] || derivationPaths.bch
}

/**
 * Generates sBCH address from mnemonic and subscribes to watchtower
 * @param {Object} opts
 * @param {number} opts.walletIndex - Index of the wallet in vault
 * @returns {Promise<string|null>} Returns address if successful, null if subscription failed
 */
export async function generateSbchAddress(opts) {
  const { walletIndex = 0 } = opts
  
  try {
    // Get mnemonic from secure storage
    const mnemonic = await getMnemonic(walletIndex)
    if (!mnemonic) {
      console.error('Mnemonic not found for sBCH address generation')
      return null
    }

    const derivationPath = "m/44'/60'/0'/0"
    
    // Generate seed and derive the sBCH address
    const seedBuffer = await bchjs.Mnemonic.toSeed(mnemonic)
    const masterHDNode = bchjs.HDNode.fromSeed(seedBuffer)
    const childNode = masterHDNode.derivePath(derivationPath)
    const addressNode = childNode.derivePath('0')
    const privateKey = bchjs.HDNode.toKeyPair(addressNode).d.toBuffer().toString('hex')
    
    // Use ethers to get the address
    const { ethers } = await import('ethers')
    const wallet = new ethers.Wallet(privateKey)
    const address = wallet.address
    
    // CRITICAL: Subscribe sBCH address to watchtower before returning
    const walletHash = computeWalletHash(mnemonic, derivationPath)
    
    const watchtower = new Watchtower(false) // sBCH is mainnet only
    const subscriptionData = {
      address: address,
      projectId: projectId.mainnet,
      walletHash: walletHash,
      walletIndex: 0,
      addressIndex: 0
    }

    const subscriptionResult = await watchtower.subscribe(subscriptionData)
    
    if (!subscriptionResult.success) {
      console.error('Failed to subscribe sBCH address to watchtower:', subscriptionResult)
      return null
    }

    return address
  } catch (error) {
    console.error('Error generating and subscribing sBCH address:', error)
    return null
  }
}


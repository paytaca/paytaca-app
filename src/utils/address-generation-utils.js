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
import axios from 'axios'
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
    
    // Generate receiving address (0/index) and change address (1/index).
    // Addresses are always generated as a pair sharing one index.
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
 * Generates an address set without subscribing (for checking balance, etc.)
 * @param {Object} opts - Same as generateAddressSetFromMnemonic
 * @returns {Promise<{success: boolean, addresses?: {receiving: string, change: string}, error?: string}>}
 */
export async function generateAddressSetWithoutSubscription(opts) {
  const { walletIndex = 0, derivationPath, addressIndex, isChipnet = false } = opts

  if (!derivationPath) {
    return { success: false, error: 'Derivation path is required' }
  }

  // Validate addressIndex - must be a non-negative integer
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

    return {
      success: true,
      addresses: {
        receiving: receivingAddress,
        change: changeAddress
      }
    }
  } catch (error) {
    console.error('Error generating address set:', error)
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
 * Normalizes an address to the prefix-qualified cashaddr form expected by
 * watchtower. Prefix-less cashaddrs and `simpleledger:` SLP addresses are
 * accepted, but the SLP form must be converted: watchtower treats it as a
 * different address and would otherwise report a used address as unused.
 * @param {string} address
 * @param {boolean} isChipnet
 * @returns {string}
 */
function toWatchtowerAddress(address, isChipnet) {
  const networkPrefix = isChipnet ? 'bchtest' : 'bitcoincash'
  let cashAddress = String(address || '').trim()

  if (cashAddress.startsWith('simpleledger:')) {
    cashAddress = bchjs.SLP.Address.toCashAddress(cashAddress)
  }

  if (cashAddress.startsWith('simpleledger:') ||
      cashAddress.startsWith('bitcoincash:') ||
      cashAddress.startsWith('bchtest:')) {
    cashAddress = cashAddress.split(':')[1]
  }

  return `${networkPrefix}:${cashAddress}`
}

/**
 * Derives a contiguous run of addresses on one chain without subscribing
 * (used for freshness scanning).
 * @param {Object} opts
 * @param {number} opts.walletIndex
 * @param {string} opts.derivationPath
 * @param {'receiving'|'change'} opts.chain
 * @param {number} opts.startIndex
 * @param {number} opts.count
 * @param {boolean} opts.isChipnet
 * @returns {Promise<Array<{address: string, addressIndex: number}>>}
 */
async function deriveAddressBatch(opts) {
  const { walletIndex = 0, derivationPath, chain = 'receiving', startIndex = 0, count = 1, isChipnet = false } = opts

  const mnemonic = await getMnemonic(walletIndex)
  if (!mnemonic) {
    throw new Error('Mnemonic not found')
  }

  const seedBuffer = await bchjs.Mnemonic.toSeed(mnemonic)
  const masterHDNode = bchjs.HDNode.fromSeed(seedBuffer)
  const childNode = masterHDNode.derivePath(derivationPath)
  const chainPath = chain === 'change' ? '1' : '0'

  const addresses = []
  for (let i = 0; i < count; i++) {
    const addressIndex = startIndex + i
    let address = bchjs.HDNode.toCashAddress(childNode.derivePath(`${chainPath}/${addressIndex}`))
    if (isChipnet) {
      address = convertCashAddress(address, isChipnet, false)
    }
    addresses.push({ address, addressIndex })
  }

  return addresses
}

/**
 * Placeholder wallet hash for history checks. Watchtower's discovery endpoint
 * requires the field but never uses it: the endpoint only reports which
 * addresses have history and does not subscribe or persist anything, so no
 * address is attached to a wallet by these checks.
 */
const HISTORY_CHECK_WALLET_HASH = '0'.repeat(64)

/**
 * Checks which addresses have on-chain transaction history.
 *
 * Uses watchtower's discovery endpoint, which queries the node directly
 * (`blockchain.address.get_first_use`) instead of watchtower's local database.
 * This matters for safety: an address used by another wallet instance but never
 * subscribed to watchtower has no local record, so database-based checks report
 * it as fresh.
 *
 * The check is per address, not per index: querying the receiving address of a
 * pair says nothing about its change address, because watchtower's
 * `last-address-index` treats either one as making the index exist. Callers must
 * pass the specific chain they intend to use.
 *
 * @param {Array<{addressIndex: number, address: string}>} candidates
 * @param {Object} opts
 * @param {boolean} opts.isChipnet
 * @param {'receiving'|'change'} opts.chain
 * @returns {Promise<Map<number, boolean>>} addressIndex -> has history
 */
async function checkAddressHistory(candidates, opts = {}) {
  const { isChipnet = false, chain = 'receiving' } = opts

  if (!candidates.length) return new Map()

  const baseUrl = isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'
  const addressSets = candidates.map(({ addressIndex, address }) => ({
    address_index: addressIndex,
    [chain]: toWatchtowerAddress(address, isChipnet)
  }))

  const response = await axios.post(`${baseUrl}/api/wallet/address-discover/`, {
    wallet_hash: HISTORY_CHECK_WALLET_HASH,
    address_sets: addressSets
  })

  const results = response?.data?.results
  if (!Array.isArray(results)) {
    throw new Error('Invalid response while verifying address freshness')
  }

  const historyByIndex = new Map()
  for (const result of results) {
    const detail = result?.[chain]
    if (typeof detail?.has_history === 'boolean') {
      historyByIndex.set(result.address_index, detail.has_history)
    }
  }

  return historyByIndex
}

/**
 * Scans forward from startIndex until an address is positively confirmed
 * unused (no on-chain transaction history). Throws when watchtower cannot
 * confirm an address's status, so callers never use an unverified one.
 *
 * Works for the receiving chain ('0/i') and the change chain ('1/i'), which are
 * checked independently: watchtower reports history per address, so a used
 * receiving address says nothing about the change address at the same index.
 *
 * Candidates are checked in batches of one request each. Additional batches are
 * only requested when every address in the previous batch had history, which
 * lets a long run of used addresses be skipped instead of failing the scan.
 *
 * @param {Object} opts
 * @param {'receiving'|'change'} opts.chain
 * @param {number} opts.startIndex
 * @param {number} opts.walletIndex
 * @param {string} opts.derivationPath
 * @param {boolean} opts.isChipnet
 * @param {number} [opts.maxAttempts] - Addresses checked per batch
 * @param {number} [opts.maxBatches]
 * @returns {Promise<{address: string, addressIndex: number}>}
 */
export async function findUnusedAddressIndex(opts = {}) {
  const {
    chain = 'receiving',
    startIndex = 0,
    walletIndex = 0,
    derivationPath,
    isChipnet = false,
    maxAttempts = 20,
    maxBatches = 10
  } = opts

  if (!derivationPath) throw new Error('Derivation path is required')

  const attemptsLimit = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 20
  const batchesLimit = Number.isInteger(maxBatches) && maxBatches > 0 ? maxBatches : 1
  // Receiving index 0/0 is reserved for message encryption
  let scanIndex = Number.isInteger(startIndex) && startIndex > 0 ? startIndex : 0
  if (chain === 'receiving' && scanIndex === 0) scanIndex = 1

  for (let batch = 0; batch < batchesLimit; batch++) {
    const candidates = await deriveAddressBatch({
      walletIndex,
      derivationPath,
      chain,
      startIndex: scanIndex,
      count: attemptsLimit,
      isChipnet
    })

    const historyByIndex = await checkAddressHistory(candidates, { isChipnet, chain })

    for (const candidate of candidates) {
      const hasHistory = historyByIndex.get(candidate.addressIndex)
      if (hasHistory === undefined) {
        console.debug('[AddressScan] unverified candidate', {
          chain,
          addressIndex: candidate.addressIndex,
          address: candidate.address
        })
        throw new Error('Unable to verify address freshness')
      }
      if (hasHistory === false) {
        console.debug('[AddressScan] found unused address', {
          chain,
          addressIndex: candidate.addressIndex,
          address: candidate.address
        })
        return { address: candidate.address, addressIndex: candidate.addressIndex }
      }
    }

    scanIndex = candidates[candidates.length - 1].addressIndex + 1
  }

  throw new Error(`No unused ${chain} address found within scan limit`)
}

/**
 * Gets the derivation path for a wallet type
 * @param {string} walletType - 'bch' or 'slp'
 * @returns {string}
 */
export function getDerivationPathForWalletType(walletType) {
  const derivationPaths = {
    bch: "m/44'/145'/0'",
    slp: "m/44'/245'/0'"
  }

  return derivationPaths[walletType] || derivationPaths.bch
}


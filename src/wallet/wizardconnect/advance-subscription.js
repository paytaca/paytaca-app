/**
 * WizardConnect Advance Subscription Manager
 * 
 * Manages advance subscription buffer to prevent race conditions when dApps
 * derive addresses from xpub keys faster than Watchtower can subscribe them.
 * 
 * Maintains a 50-pair buffer of pre-subscribed addresses ahead of the last used index.
 */

import Watchtower from 'src/lib/watchtower'
import {
  deriveHdPrivateNodeChild,
  deriveHdPath,
  deriveHdPublicNode,
  secp256k1,
  encodePrivateKeyWif,
  encodeCashAddress,
  lockingBytecodeToCashAddress,
  hash160,
  encodeLockingBytecodeP2pkh,
} from 'bitauth-libauth-v3'

const BUFFER_SIZE = 50 // 50 complete address pairs (100 total addresses)
const MAX_BATCH_SIZE = 50 // API limit: 50 pairs per request

/**
 * Get advance subscription count for a wallet
 * @param {Watchtower} watchtower - Watchtower instance
 * @param {string} walletHash - Wallet hash
 * @returns {Promise<Object>} Counts object
 */
export async function getAdvanceSubscriptionCount(watchtower, walletHash) {
  try {
    const counts = await watchtower.getAdvanceSubscriptionCount(walletHash)
    return counts
  } catch (error) {
    console.error('Error getting advance subscription count:', error)
    return {
      pairs_advance_subscribed: 0,
      receiving_advance_subscribed: 0,
      change_advance_subscribed: 0,
      total_advance_subscribed: 0,
      highest_pair_index: -1
    }
  }
}

/**
 * Get last used address index for a wallet
 * @param {Watchtower} watchtower - Watchtower instance
 * @param {string} walletHash - Wallet hash
 * @returns {Promise<number>} Last used index
 */
export async function getLastUsedIndex(watchtower, walletHash) {
  try {
    const result = await watchtower.getLastExternalAddressIndex(walletHash)
    if (result && result.address_index !== undefined) {
      return result.address_index
    }
    return -1 // No addresses used yet
  } catch (error) {
    console.error('Error getting last used index:', error)
    return -1
  }
}

/**
 * Derive address from HD node
 * @param {Object} hdChain - HD chain node
 * @param {number} index - Address index
 * @param {string} prefix - Address prefix (bitcoincash or bchtest)
 * @returns {Object} Address info
 */
function deriveAddress(hdChain, index, prefix) {
  const child = deriveHdPrivateNodeChild(hdChain, index)
  const pubKey = secp256k1.derivePublicKeyCompressed(child.privateKey)
  if (typeof pubKey === 'string') throw new Error(pubKey)
  
  // Create P2PKH locking bytecode using hash160
  const pubkeyHash = hash160(pubKey)
  const lockingBytecode = encodeLockingBytecodeP2pkh(pubkeyHash)
  
  const addressResult = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix })
  if (typeof addressResult === 'string') throw new Error(addressResult)
  
  return {
    address: addressResult.address,
    publicKey: pubKey,
    lockingBytecode
  }
}

/**
 * Calculate how many pairs need to be subscribed to reach buffer size
 * @param {number} pairsAdvanceSubscribed - Current number of advance subscribed pairs
 * @returns {number} Number of pairs to subscribe
 */
export function calculatePairsNeeded(pairsAdvanceSubscribed) {
  // We want to maintain a buffer of BUFFER_SIZE pairs
  // Regardless of where they are in the index range
  const pairsNeeded = BUFFER_SIZE - pairsAdvanceSubscribed
  return Math.max(0, Math.min(pairsNeeded, MAX_BATCH_SIZE))
}

/**
 * Generate address pairs for advance subscription
 * @param {Object} hdNodes - HD nodes object with hdMain and hdChange
 * @param {number} startIndex - Starting address index
 * @param {number} count - Number of pairs to generate
 * @param {string} prefix - Address prefix
 * @returns {Array} Array of {receiving, change} pairs
 */
export function generateAddressPairs(hdNodes, startIndex, count, prefix) {
  const pairs = []
  
  for (let i = 0; i < count; i++) {
    const index = startIndex + i
    
    // Receiving address (0/X)
    const receivingAddr = deriveAddress(hdNodes.hdMain, index, prefix)
    
    // Change address (1/X)
    const changeAddr = deriveAddress(hdNodes.hdChange, index, prefix)
    
    pairs.push({
      receiving: receivingAddr.address,
      change: changeAddr.address
    })
  }
  
  return pairs
}

/**
 * Ensure buffer is maintained at target size
 * @param {Watchtower} watchtower - Watchtower instance
 * @param {string} walletHash - Wallet hash
 * @param {Object} hdNodes - HD nodes object
 * @param {string} prefix - Address prefix
 * @returns {Promise<Object>} Result with subscribed count
 */
export async function ensureBuffer(watchtower, walletHash, hdNodes, prefix) {
  try {
    // Get current state
    const [lastUsedIndex, counts] = await Promise.all([
      getLastUsedIndex(watchtower, walletHash),
      getAdvanceSubscriptionCount(watchtower, walletHash)
    ])
    
    const pairsNeeded = calculatePairsNeeded(counts.pairs_advance_subscribed)
    
    if (pairsNeeded === 0) {
      return {
        success: true,
        subscribed: 0,
        message: 'Buffer is sufficient'
      }
    }
    
    // Calculate start index:
    // We need to start from the first index that is NOT already subscribed
    // This is either:
    // 1. One after the highest pair index (if we have any pairs), OR
    // 2. One after the last used index (if we have no pairs)
    const highestPairIndex = counts.highest_pair_index ?? -1
    const startIndex = Math.max(highestPairIndex + 1, lastUsedIndex + 1)
    
    // Detect if there are gaps (indices with regular subscriptions between advance subscriptions)
    // If there are no gaps, highest_pair_index should be close to (lastUsedIndex + pairs_advance_subscribed)
    const expectedHighestIfNoGaps = lastUsedIndex + counts.pairs_advance_subscribed
    const gapSize = Math.max(0, highestPairIndex - expectedHighestIfNoGaps)
    const hasGaps = gapSize > 0
    
    // Generate extra pairs based on the gap size we've observed
    // This estimates how many more gaps might exist ahead
    const extraPairsForGaps = hasGaps ? Math.min(gapSize, 10) : 0
    const pairsToGenerate = Math.min(pairsNeeded + extraPairsForGaps, MAX_BATCH_SIZE)
    
    const addressPairs = generateAddressPairs(hdNodes, startIndex, pairsToGenerate, prefix)
    
    // Subscribe addresses
    const result = await watchtower.advanceSubscribeAddresses(walletHash, startIndex, addressPairs)
    
    return {
      success: true,
      subscribed: result.subscribed || 0,
      message: `Subscribed ${result.subscribed || 0} addresses in ${pairsNeeded} pairs`
    }
  } catch (error) {
    console.error('[WizardConnect] Error ensuring buffer:', error)
    return {
      success: false,
      subscribed: 0,
      error: error.message
    }
  }
}

/**
 * Check and maintain buffer with debouncing
 */
let bufferCheckTimeout = null
export function scheduleBufferCheck(watchtower, walletHash, hdNodes, prefix, delayMs = 0) {
  if (bufferCheckTimeout) {
    clearTimeout(bufferCheckTimeout)
  }
  
  bufferCheckTimeout = setTimeout(async () => {
    await ensureBuffer(watchtower, walletHash, hdNodes, prefix)
    bufferCheckTimeout = null
  }, delayMs)
}

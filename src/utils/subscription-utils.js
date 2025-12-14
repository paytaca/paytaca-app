import { Store } from 'src/store'
import { loadWallet } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'

// LIFT token category ID from environment variable
export const LIFT_TOKEN_CATEGORY = process.env.LIFT_TOKEN_CATEGORY || '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'

// LIFT token has 2 decimals
const LIFT_TOKEN_DECIMALS = 2

/**
 * Check LIFT token balance for the current wallet
 * Uses the standard wallet balance checking method
 * @returns {Promise<number>} LIFT token balance (in human-readable format, e.g., 100.50)
 */
export async function checkLiftTokenBalance () {
  try {
    const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
    if (!walletHash) {
      console.warn('No wallet hash available for checking LIFT token balance')
      return 0
    }
    
    const walletIndex = Store.getters['global/getWalletIndex']
    
    // Load wallet using the standard method
    const wallet = await loadWallet('BCH', walletIndex)
    if (!wallet) {
      console.warn('Failed to load wallet for checking LIFT token balance')
      return 0
    }
    
    // Get the correct wallet network (chipnet or mainnet)
    const bchWallet = getWalletByNetwork(wallet, 'bch')
    if (!bchWallet) {
      console.warn('Failed to get BCH wallet for checking LIFT token balance')
      return 0
    }
    
    try {
      // Use the standard wallet getBalance method with token category
      const response = await bchWallet.getBalance(LIFT_TOKEN_CATEGORY)
      
      // Response format from watchtower: { balance: number, spendable: number, pending: number }
      // The balance is in the smallest unit (satoshis for tokens), need to divide by 10^decimals
      const balance = response?.spendable || response?.balance || 0
      const humanReadableBalance = balance / Math.pow(10, LIFT_TOKEN_DECIMALS)
      
      return humanReadableBalance
    } catch (error) {
      // If balance check fails (e.g., no tokens, 404), return 0
      if (error?.response?.status === 404 || error?.message?.includes('404')) {
        // No tokens found, which is fine
        return 0
      }
      console.debug('LIFT token balance check failed:', error)
      return 0
    }
  } catch (error) {
    console.error('Error checking LIFT token balance:', error)
    return 0
  }
}

/**
 * Check if user is eligible for Plus subscription
 * @param {number} balance - LIFT token balance
 * @returns {boolean}
 */
export function isPlusEligible (balance) {
  return balance >= 100
}

/**
 * Get subscription tier based on LIFT token balance
 * @param {number} balance - LIFT token balance
 * @returns {'free' | 'plus'}
 */
export function getSubscriptionTier (balance) {
  return isPlusEligible(balance) ? 'plus' : 'free'
}


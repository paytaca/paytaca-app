import { Store } from 'src/store'
import Watchtower from 'watchtower-cash-js'

// LIFT token category ID from environment variable
export const LIFT_TOKEN_CATEGORY = process.env.LIFT_TOKEN_CATEGORY || '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'

// LIFT token has 2 decimals
const LIFT_TOKEN_DECIMALS = 2

/**
 * Check LIFT token balance across all wallets in the vault
 * Uses the watchtower API directly to avoid loading wallets into memory
 * @returns {Promise<number>} LIFT token balance (in human-readable format, e.g., 100.50)
 */
export async function checkLiftTokenBalance () {
  try {
    const vault = Store.getters['global/getVault'] || []
    
    if (vault.length === 0) {
      return 0
    }

    const isChipnet = Store.getters['global/isChipnet']
    const watchtower = new Watchtower(isChipnet)
    
    const balancePromises = vault.map(async (wallet) => {
      if (!wallet || wallet.deleted) return 0
      
      const walletHash = wallet?.wallet?.bch?.walletHash || 
                         wallet?.wallet?.BCH?.walletHash ||
                         wallet?.BCH?.walletHash || 
                         wallet?.bch?.walletHash ||
                         wallet?.walletHash
                         
      if (!walletHash) return 0
      
      try {
        const response = await watchtower.Wallet.getBalance({ 
          walletHash, 
          tokenId: LIFT_TOKEN_CATEGORY 
        })
        
        // Response format from watchtower: { balance: number, spendable: number, pending: number }
        // The balance is in the smallest unit (satoshis for tokens), need to divide by 10^decimals
        const balance = response?.spendable || response?.balance || 0
        return balance / Math.pow(10, LIFT_TOKEN_DECIMALS)
      } catch (error) {
        // If balance check fails (e.g., no tokens, 404), return 0
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          // No tokens found, which is fine
          return 0
        }
        console.debug(`LIFT token balance check failed for wallet ${walletHash}:`, error)
        return 0
      }
    })

    const balances = await Promise.all(balancePromises)
    const totalBalance = balances.reduce((sum, balance) => sum + balance, 0)
    
    return totalBalance
  } catch (error) {
    console.error('Error checking total LIFT token balance:', error)
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

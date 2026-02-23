import { Store } from 'src/store'
import Watchtower from 'watchtower-cash-js'

export const LIFT_TOKEN_CATEGORY = process.env.LIFT_TOKEN_CATEGORY || '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'

const LIFT_TOKEN_DECIMALS = 2
const CACHE_DURATION = 30000 // 30 seconds
const balanceCache = {
  totalBalance: null,
  timestamp: 0
}

/**
 * Check LIFT token balance across all wallets in the vault
 * Uses the watchtower API directly to avoid loading wallets into memory
 * Results are cached for CACHE_DURATION to prevent API burst
 * @returns {Promise<number>} LIFT token balance (in human-readable format, e.g., 100.50)
 */
export async function checkLiftTokenBalance () {
  if (balanceCache.totalBalance !== null && Date.now() - balanceCache.timestamp < CACHE_DURATION) {
    return balanceCache.totalBalance
  }

  try {
    const vault = Store.getters['global/getVault'] || []
    const getWalletHashByIndex = Store.getters['global/getWalletHashByIndex']
    
    if (vault.length === 0) {
      return 0
    }

    const isChipnet = Store.getters['global/isChipnet']
    const watchtower = new Watchtower(isChipnet)
    
    const balancePromises = vault.map(async (wallet, index) => {
      if (!wallet || wallet.deleted) return 0
      
      const walletHash = getWalletHashByIndex(index)
                         
      if (!walletHash) {
        console.warn(`No wallet hash available for vault index ${index} when checking LIFT token balance`)
        return 0
      }
      
      try {
        const response = await watchtower.Wallet.getBalance({ 
          walletHash, 
          tokenId: LIFT_TOKEN_CATEGORY 
        })
        
        const balance = response?.spendable || response?.balance || 0
        return balance / Math.pow(10, LIFT_TOKEN_DECIMALS)
      } catch (error) {
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          return 0
        }
        console.debug(`LIFT token balance check failed for wallet ${walletHash}:`, error)
        return 0
      }
    })

    const balances = await Promise.all(balancePromises)
    const totalBalance = balances.reduce((sum, balance) => sum + balance, 0)
    
    balanceCache.totalBalance = totalBalance
    balanceCache.timestamp = Date.now()
    
    return totalBalance
  } catch (error) {
    console.error('Error checking total LIFT token balance:', error)
    return 0
  }
}

/**
 * Clear the LIFT token balance cache
 * Call this when wallet balances may have changed (e.g., after a transaction)
 */
export function clearLiftBalanceCache () {
  balanceCache.totalBalance = null
  balanceCache.timestamp = 0
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

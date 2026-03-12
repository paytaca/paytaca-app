import { REWARDS_URL } from "./rewards"

/**
 * Fetch marketplace transaction history for a user
 * @param {number} upId - User promo ID
 * @param {Object} params - Query parameters
 * @param {string} params.type - Filter by type: 'all' | 'orders' | 'otc'
 * @param {number} params.limit - Number of items to fetch
 * @param {number} params.offset - Offset for pagination
 * @returns {Promise<{transactions: Array, total_count: number, total_points: number}>}
 */
export async function fetchMarketplaceHistory(upId, params = {}) {
  // PLACEHOLDER: Replace with actual API call when ready
  // return await MARKETPLACE_HISTORY_URL.get(`/${upId}`, { params })
  //   .then(resp => {
  //     if (resp.status === 200) return resp.data
  //     else if (resp.status === 404) return { transactions: [], total_count: 0, total_points: 0 }
  //     else return null
  //   })
  //   .catch(error => {
  //     console.error('Error fetching marketplace history:', error)
  //     return null
  //   })

  // Mock data for development
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = generateMockData()
      resolve({
        transactions: mockData.transactions,
        total_count: mockData.transactions.length,
        total_points: mockData.transactions.reduce((sum, t) => sum + t.points_earned, 0),
        order_count: mockData.transactions.filter(t => t.type === 'order').length,
        otc_count: mockData.transactions.filter(t => t.type === 'otc').length
      })
    }, 500)
  })
}

/**
 * Generate mock data for development
 * Simplified structure:
 * - Orders: order_id (numeric), date, points_earned
 * - OTC: ref_id (string), tx_id (string), date, points_earned
 */
function generateMockData() {
  const transactions = []

  // Generate order transactions
  for (let i = 1; i <= 15; i++) {
    transactions.push({
      type: 'order',
      id: 1000 + i,
      order_id: i, // numeric order_id
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      points_earned: 8
    })
  }

  // Generate OTC transactions
  for (let i = 1; i <= 10; i++) {
    transactions.push({
      type: 'otc',
      id: 2000 + i,
      ref_id: `${Math.random().toString(10).substring(2, 10)}`, // displayed ref_id
      tx_id: `abc${Math.random().toString(36).substring(2, 15)}def`, // for deep linking
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      points_earned: 12
    })
  }

  // Sort by date (newest first)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date))

  return { transactions }
}

/**
 * Filter transactions by type
 * @param {Array} transactions - All transactions
 * @param {string} type - Filter type: 'all' | 'orders' | 'otc'
 * @returns {Array}
 */
export function filterTransactionsByType(transactions, type) {
  if (type === 'all') return transactions
  if (type === 'orders') return transactions.filter(t => t.type === 'order')
  if (type === 'otc') return transactions.filter(t => t.type === 'otc')
  return transactions
}

/**
 * Calculate summary statistics
 * @param {Array} transactions - All transactions
 * @returns {Object}
 */
export function calculateSummaryStats(transactions) {
  const orders = transactions.filter(t => t.type === 'order')
  const otc = transactions.filter(t => t.type === 'otc')

  return {
    total_transactions: transactions.length,
    total_points: transactions.reduce((sum, t) => sum + t.points_earned, 0),
    order_count: orders.length,
    order_points: orders.reduce((sum, t) => sum + t.points_earned, 0),
    otc_count: otc.length,
    otc_points: otc.reduce((sum, t) => sum + t.points_earned, 0)
  }
}

import { cardApi } from "./api"

// ==================== AUTH NFT OPERATIONS ====================

/**
 * Fetch authentication NFTs
 * @param {Object} params - Query parameters
 * @param {string} params.walletAddress - Wallet address to fetch NFTs for
 * @param {number} params.limit - Limit number of results
 * @param {number} params.offset - Offset for pagination
 * @returns {Promise} API response with auth NFTs
 */
export async function fetchAuthNFTs(wallet_hash) {
  try {
    const response = await cardApi.get(`/auth-nfts/wallet/${wallet_hash}`)
    console.log('response:', response)
    return response.data
  } catch (error) {
    console.error('Error fetching auth NFTs:', error)
    throw error
  }
}

/**
 * Create authentication NFTs
 * @param {Object} nftData - The NFT data to create
 * @param {string} nftData.txid - Transaction ID of the NFT
 * @param {string} nftData.wallet_hash - Target wallet hash
 * @param {string} nftData.category - Token category ID
 * @param {string} nftData.capability - NFT capability
 * @param {string} nftData.commitment - NFT commitment
 * @param {number} nftData.satoshis - Satoshis value
 * @param {string|number} nftData.amount - Token amount
 * @returns {Promise} API response with created auth NFT
 */
export async function createNFTs(nftData) {
  try {
    const response = await cardApi.post('/auth-nfts/', nftData)
    return response.data
  } catch (error) {
    console.error('Error creating auth NFTs:', error.response || error)
    throw error
  }
}

/** * Mutate (update) authentication NFTs
 * @param {Object} mutationData - The mutation data for NFTs
 * @returns {Promise} API response with updated auth NFTs
 */
export async function mutateNFTs(mutationData) {
  try {
    const response = await cardApi.patch(`/auth-nfts/batch-update/`, mutationData)
    return response.data
  } catch (error) {
    console.error('Error mutating NFTs in server:', error)
    throw error
  }
}
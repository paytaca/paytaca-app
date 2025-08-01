import axios from 'axios'
import { Store } from 'src/store'
import Watchtower from 'src/lib/watchtower'
const isChipnet = Store.getters['global/isChipnet']
const watchtower = new Watchtower(isChipnet)

// You might want to create a backend configuration similar to other services
// For now, I'll use a base configuration that you can customize
const API_BASE_URL = process.env.CARD_API_BASE_URL || 'http:/localhost:3000/api' // Adjust this to your actual card API base URL

const cardApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// // Add request interceptor for auth if needed
// cardApi.interceptors.request.use(
//   (config) => {
//     // Add auth token if available
//     const token = localStorage.getItem('authToken') // Adjust based on your auth system
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`
//     }
//     return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   }
// )

/**
 * Fetch card information
 * @param {string} cardId - The card ID to fetch
 * @returns {Promise} API response with card information
 */
export async function fetchCardInfo(identifier) {
  try {
    console.log('url:', cardApi.defaults.baseURL)
    const response = await cardApi.get(`/cards/${identifier}/`)
    const balance = await getCardBalance(response.data.cash_address)
    return { ...response.data, balance }
  } catch (error) {
    console.error('Error fetching card info:', error)
    throw error
  }
}

export async function getCardBalance(address) {
  try {
    const response = await watchtower.BCH._api.get(`/balance/bch/${address}`)
    console.log('Card balance response:', response.data)
    return response.data.balance
  } catch (error) {
    console.error('Error fetching card balance:', error)
    throw error
  }
}

/**
 * Create new card information
 * @param {Object} cardData - The card data to create
 * @param {string} cardData.name - Card name
 * @param {string} cardData.description - Card description
 * @param {Object} cardData.metadata - Additional card metadata
 * @returns {Promise} API response with created card information
 */
export async function createCard(cardData) {
  try {
    const response = await cardApi.post('/cards', cardData)
    return response.data
  } catch (error) {
    console.error('Error creating card:', error)
    throw error
  }
}

/**
 * Fetch authentication NFTs
 * @param {Object} params - Query parameters
 * @param {string} params.walletAddress - Wallet address to fetch NFTs for
 * @param {number} params.limit - Limit number of results
 * @param {number} params.offset - Offset for pagination
 * @returns {Promise} API response with auth NFTs
 */
export async function fetchAuthNFTs(params = {}) {
  try {
    const response = await cardApi.get('/auth-nfts', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching auth NFTs:', error)
    throw error
  }
}

/**
 * Create authentication NFTs
 * @param {Object} nftData - The NFT data to create
 * @param {string} nftData.walletAddress - Target wallet address
 * @param {string} nftData.tokenCategory - Token category ID
 * @param {Object} nftData.metadata - NFT metadata
 * @param {Array} nftData.permissions - NFT permissions array
 * @returns {Promise} API response with created auth NFT
 */
export async function createAuthNFTs(nftData) {
  try {
    const response = await cardApi.post('/auth-nfts', nftData)
    return response.data
  } catch (error) {
    console.error('Error creating auth NFTs:', error)
    throw error
  }
}

/**
 * Mutate existing NFTs
 * @param {Object} mutationData - The mutation data
 * @param {string} mutationData.nftId - NFT ID to mutate
 * @param {string} mutationData.operation - Mutation operation type
 * @param {Object} mutationData.updates - Updates to apply
 * @param {string} mutationData.signature - Transaction signature
 * @returns {Promise} API response with mutation result
 */
export async function mutateNFTs(mutationData) {
  try {
    const response = await cardApi.post('/nfts/mutate', mutationData)
    return response.data
  } catch (error) {
    console.error('Error mutating NFTs:', error)
    throw error
  }
}

// Export the axios instance for advanced usage if needed
export { cardApi }

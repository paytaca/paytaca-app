/**
 * Card API Service Module
 * 
 * Provides a centralized API client and utility functions for managing card-related operations
 * in the Paytaca application. This module handles communication with the Card API backend service
 * and integrates with the Watchtower service for blockchain balance queries.
 * 
 */

import axios from 'axios'
import { Store } from 'src/store'
import Watchtower from 'src/lib/watchtower'
const isChipnet = Store.getters['global/isChipnet']
const watchtower = new Watchtower(isChipnet)

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

// ==================== CARD OPERATIONS ====================

/**
 * Create new card information
 * @param {Object} cardData - The card data to create
 * @param {string} cardData.wallet_hash - Wallet hash associated with the card
 * @param {string} cardData.public_key - Public key of the card
 * @param {string} cardData.category - Token category ID
 * @returns {Promise} API response with created card information
 */
export async function createCard(cardData) {
  console.log('cardData:', cardData)
  try {
    const response = await cardApi.post('/cards/', cardData)
    return response.data
  } catch (error) {
    console.error('Error creating card:', error)
    throw error
  }
}

/**
 * Fetch card information
 * @param {string} cardId - The card ID to fetch
 * @returns {Promise} API response with card information
 */
export async function fetchCard(identifier) {
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

/**
 * Get the BCH balance of a card address
 * @param {string} address - The BCH address of the card
 * @returns {Promise<number>} The BCH balance of the card
 */
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

// ==================== TERMINAL OPERATIONS ====================

export async function createTerminal(terminalData) {
  try {
    const response = await cardApi.post('/terminals/', terminalData)
    return response.data
  } catch (error) {
    console.error('Error creating terminal:', error)
    throw error
  }
}

export async function fetchTerminals(params = {}) {
  try {
    const response = await cardApi.get('/terminals/', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching terminals:', error)
    throw error
  }
}

export async function fetchUnissuedTerminals(cardId) {
  try {
    const response = await cardApi.get(`/terminals/unissued/${cardId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching unissued terminals:', error)
    throw error
  }
}

// ==================== EXPORTS ====================
export { cardApi }

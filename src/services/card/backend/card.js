import { cardApi } from "./api"

/**
 * Create new card information
 * @param {Object} cardData - The card data to create
 * @param {string} cardData.wallet_hash - Wallet hash associated with the card
 * @param {string} cardData.public_key - Public key of the card
 * @param {string} cardData.category - Token category ID
 * @returns {Promise} API response with created card information
 */
async function createCard(cardData) {
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
async function fetchCard(identifier) {
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
async function getCardBalance(address) {
  try {
    const response = await watchtower.BCH._api.get(`/balance/bch/${address}`)
    console.log('Card balance response:', response.data)
    return response.data.balance
  } catch (error) {
    console.error('Error fetching card balance:', error)
    throw error
  }
}

export { createCard, fetchCard, getCardBalance }
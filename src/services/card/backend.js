import axios from 'axios'
import { getAuthToken } from './user'
import { loadWallet } from '../wallet';

const API_BASE_URL = process.env.MAINNET_CARD_API_BASE_URL || 'http://localhost:8002/api' 

export const backend = axios.create({
  baseURL: API_BASE_URL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
})

backend.interceptors.request.use(async (config) => {
  if (config.authorize === false) {
    return config
  }
  const wallet = await loadWallet();
  config.headers['wallet-hash'] = wallet.walletHash
  await getAuthToken().then(token => {
    config.headers.Authorization = `Token ${token}`
  })
  return config
})

/**
 * Fetches the active delivery public key from the backend.
 * This key is used to encrypt the DEK (Data Encryption Key) for encrypting customer addresses.
 * 
 * @async
 * @returns {Promise<string>} The active delivery public key in Base64 format.
 */
export async function fetchActiveDeliveryPublicKey() {
  try {
    const response = await backend.get('/card/delivery/public-key/');
    return response.data.public_key;
  } catch (error) {
    console.error('Error fetching active delivery public key:', error);
    throw error;
  }
}
import axios from 'axios'
import packageInfo from '../../package.json'

/**
 * Check watchtower server status with required headers
 * @param {string|null} walletHash - The wallet hash to include in headers (optional)
 * @returns {Promise<Object>} Promise that resolves with status response
 */
export async function checkWatchtowerStatus(walletHash = null) {
  const headers = {
    'paytaca-app-version': packageInfo.version
  }

  // Add wallet-hash header if provided
  if (walletHash) {
    headers['wallet-hash'] = walletHash
  }

  try {
    const response = await axios.get('https://watchtower.cash/api/status/', {
      headers,
      timeout: 30000
    })
    return response
  } catch (error) {
    console.error('Watchtower status check failed:', error)
    throw error
  }
}


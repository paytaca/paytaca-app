import axios from 'axios'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'

/**
 * Check if a transaction exists in wallet history via the watchtower API.
 * Shared by send and receive pages to avoid duplicate logic.
 *
 * @param {string} txid - Transaction ID to check
 * @param {Object} options
 * @param {string} options.walletHash - Wallet hash (from BCH wallet for BCH/CT, SLP wallet for SLP)
 * @param {string} [options.assetId] - Asset ID (e.g. 'bch', 'ct/tokenId', 'slp/tokenId') for token history path
 * @param {boolean} options.isChipnet - Whether to use chipnet watchtower
 * @returns {Promise<boolean>} True if the transaction exists in history
 */
export async function checkTransactionExistsInHistory (txid, { walletHash, assetId, isChipnet }) {
  try {
    if (!walletHash || typeof walletHash !== 'string' || !walletHash.trim()) {
      return false
    }

    const baseUrl = getWatchtowerApiUrl(isChipnet)
    let categoryPath = ''

    if (assetId?.startsWith?.('ct/') || assetId?.startsWith?.('slp/')) {
      const tokenId = assetId.split('/')[1]
      categoryPath = `/${tokenId}`
    }

    const url = `${baseUrl}/history/wallet/${encodeURIComponent(walletHash)}${categoryPath}/`
    const { data } = await axios.get(url, { params: { txids: txid } })
    const tx = Array.isArray(data?.history) ? data.history[0] : (Array.isArray(data) ? data[0] : data)

    return !!tx
  } catch (error) {
    console.error('Error checking transaction in history:', error)
    return false
  }
}

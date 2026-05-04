/**
 * Chat send command utilities.
 * Parses "send X BCH" messages and checks Nostr pubkey registration status.
 */

import Watchtower from 'src/lib/watchtower'
import store from 'src/store'

/**
 * Pattern to match send commands like:
 * - "send 0.0001 BCH"
 * - "send 1.5 BCH"
 * - "send 100 bch"
 * - "Send 0.001"
 */
const SEND_PATTERN = /^\s*send\s+([\d.]+)\s*(bch)?\s*$/i

/**
 * Parse a message for a "send X BCH" command.
 * @param {string} content - Message text
 * @returns {{ amount: number } | null} Parsed amount or null if not a send command
 */
export function parseSendCommand (content) {
  if (!content || typeof content !== 'string') return null
  const match = content.trim().match(SEND_PATTERN)
  if (!match) return null

  const amount = parseFloat(match[1])
  if (isNaN(amount) || amount <= 0) return null

  return { amount }
}

/**
 * Check if a Nostr pubkey is registered in Watchtower.
 * This indicates the pubkey is associated with a Paytaca wallet.
 * @param {string} pubKeyHex - Hex public key
 * @returns {Promise<boolean>}
 */
export async function isNostrPubkeyRegistered (pubKeyHex) {
  try {
    const isChipnet = store().getters['global/isChipnet']
    const watchtower = new Watchtower(isChipnet)
    const response = await watchtower.BCH._api.get(`/nostr/check/${pubKeyHex}/`)
    console.log('[Nostr] Push check response:', response?.data)
    return response?.data?.registered === true
  } catch (err) {
    console.warn('[Nostr] Push check failed:', err?.response?.status, err?.response?.data, err?.message)
    return false
  }
}

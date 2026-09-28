import { sha256, utf8ToBin, secp256k1, decodePrivateKeyWif, binToHex } from '@bitauth/libauth';

/**
 * Builds the canonical FT-sweep message the server verifies:
 *   sweep_ft:{card_ref}:{token_id}:{token_address}
 *
 * card_ref is the card's uid string when non-empty, else str(card.id). It is
 * derived from the looked-up Card object, never from the URL.
 * @param {Object} card
 * @param {string} tokenId
 * @param {string} tokenAddress
 * @returns {string}
 */
export function buildSweepMessage(card, tokenId, tokenAddress) {
  const cardRef = card?.uid || String(card?.id)
  return `sweep_ft:${cardRef}:${tokenId}:${tokenAddress}`
}

/**
 * Signs a sweep message with the owner's WIF, returning a DER-hex signature
 * over sha256(utf8(message)).
 * @param {string} privateKeyWif
 * @param {string} message
 * @returns {string} DER-hex
 */
export function signSweepMessage(privateKeyWif, message) {
  const messageHash = sha256.hash(utf8ToBin(message))
  const privateKeyBin = decodePrivateKeyWif(privateKeyWif).privateKey
  if (typeof privateKeyBin === 'string') throw new Error(privateKeyBin)
  const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
  if (typeof signatureBin === 'string') throw new Error(signatureBin)
  return binToHex(signatureBin)
}

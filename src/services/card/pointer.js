/**
 * On-chain pointer NFT codec and helpers.
 *
 * A pointer is a mutable NFT that lives at the ORIGIN contract forever. Its
 * commitment encodes the contract version the card has been migrated to and
 * the target contract category. POS consumes the pointer on tap to resolve the
 * active contract version; the pointer is authoritative over the server.
 *
 * Wire format (34 bytes):
 *   0x02 || version(1) || reverseHex(category)(32)
 *
 * `category` is passed in the same encoding as the contract's `params.category`
 * (the reversed/little-endian display form), so the stored bytes are the raw
 * on-chain category. Decoding reverses them back to the input encoding.
 */

export const POINTER_PREFIX = 0x02;
export const POINTER_COMMITMENT_LENGTH = 34;

function reverseHex(hex) {
  if (!hex) return hex;
  const bytes = Buffer.from(hex, 'hex');
  bytes.reverse();
  return bytes.toString('hex');
}

/**
 * Encodes a pointer commitment.
 * @param {Object} params
 * @param {number} params.version - Target contract version (integer 1..255).
 * @param {string} params.category - Target contract category (hex, params.category encoding).
 * @returns {string} 34-byte commitment hex.
 */
export function encodePointerCommitment({ version, category } = {}) {
  if (!Number.isInteger(version) || version < 1 || version > 255) {
    throw new Error('Pointer version must be an integer in [1, 255]');
  }
  if (typeof category !== 'string' || category.length === 0) {
    throw new Error('Pointer category is required');
  }
  const rawCategory = reverseHex(category);
  if (rawCategory.length !== 64) {
    throw new Error('Pointer category must be a 32-byte hex string');
  }
  const buf = Buffer.concat([
    Buffer.from([POINTER_PREFIX, version]),
    Buffer.from(rawCategory, 'hex'),
  ]);
  return buf.toString('hex');
}

/**
 * Returns true when the commitment's first byte marks a pointer (0x02).
 * Never treat a pointer as an auth/ownership NFT.
 * @param {string} hex
 * @returns {boolean}
 */
export function isPointerCommitment(hex) {
  if (typeof hex !== 'string' || hex.length < 2) return false;
  return parseInt(hex.slice(0, 2), 16) === POINTER_PREFIX;
}

/**
 * Decodes a pointer commitment.
 * @param {string} hex
 * @returns {{ version: number, category: string }|null} null when not a
 *   pointer or when the length is not exactly 34 bytes.
 */
export function decodePointerCommitment(hex) {
  if (!isPointerCommitment(hex)) return null;
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== POINTER_COMMITMENT_LENGTH) return null;
  return {
    version: buf[1],
    category: reverseHex(buf.subarray(2).toString('hex')),
  };
}

/**
 * Finds the pointer UTXO in a list of token UTXOs.
 * @param {Array<Object>} utxos
 * @returns {Object|null}
 */
export function findPointerUtxo(utxos = []) {
  return utxos.find(utxo => isPointerCommitment(utxo?.token?.nft?.commitment)) || null;
}

/**
 * Human-readable migration status derived from pointer-state plus on-chain funding.
 * @param {Object} pointerState - GET /cards/{id}/pointer-state/ response.
 * @param {Object} [opts]
 * @param {boolean} [opts.originFunded] - Whether the origin contract still holds funds.
 * @returns {{ status: string, version: number|null, label: string }}
 */
export function describeMigrationState(pointerState, { originFunded = false } = {}) {
  const present = !!pointerState?.pointer_present;
  const version = pointerState?.target_version ?? pointerState?.origin_version ?? null;
  if (!present) {
    return { status: 'not_migrated', version: null, label: 'Not migrated' };
  }
  if (originFunded) {
    return { status: 'funds_on_origin', version, label: `Pointer set but funds still on origin` };
  }
  return { status: 'migrated', version, label: version != null ? `Migrated to v${version}` : 'Migrated' };
}

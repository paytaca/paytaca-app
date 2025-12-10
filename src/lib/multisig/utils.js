import Big from 'big.js'
import { hexToBin, cashAddressToLockingBytecode, binToHex, binsAreEqual, binToBigIntUintBE } from 'bitauth-libauth-v3'

export const shortenString = (str, maxLength) => {
  // If the string is shorter than or equal to the maxLength, return it as is.
  if (str.length <= maxLength) {
    return str
  }
  // Calculate how much to keep before and after the '...'.
  const halfLength = Math.floor((maxLength - 3) / 2)
  const start = str.slice(0, halfLength)
  const end = str.slice(-halfLength)

  return `${start}...${end}`
}

export const getTotalBchInputAmount = (tx, unit = 'bch') => {
  const amount = tx.inputs.reduce((total, input) => {
    return total + Number(input.sourceOutput.valueSatoshis)
  }, 0)
  if (unit === 'bch') return amount / 1e8
  return amount
}

export const getTotalBchOutputAmount = (tx, unit = 'bch') => {
  const amount = tx.outputs.reduce((total, output) => {
    return total + Number(output.valueSatoshis)
  }, 0)
  if (unit === 'bch') return amount / 1e8
  return amount
}

export const getTotalBchDebitAmount = (tx, senderAddresses, unit = 'bch') => {
  const senderLockingBytecodes = senderAddresses.map(address => binToHex(cashAddressToLockingBytecode(address).bytecode))
  const amount = tx.outputs.reduce((total, output) => {
    if (senderLockingBytecodes.includes(binToHex(Uint8Array.from(Object.values(output.lockingBytecode))))) {
      return total
    }
    return total + Number(output.valueSatoshis)
  }, 0)
  if (unit === 'bch') return amount / 1e8
  return amount
}

export const getTotalBchFee = (tx, unit = 'bch') => {
  const amount = getTotalBchInputAmount(tx, 'satoshis') - getTotalBchOutputAmount(tx, 'satoshis')
  if (unit === 'bch') return amount / 1e8
  return amount
}

export const getTxRecipientsCount = (tx, senderAddresses) => {
  const senderLockingBytecodes = senderAddresses.map(address => binToHex(cashAddressToLockingBytecode(address).bytecode))
  const recipientCount = tx.outputs.reduce((count, output) => {
    if (!senderLockingBytecodes.includes(binToHex(Uint8Array.from(Object.values(output.lockingBytecode))))) {
      count = count + 1
    }
    return count
  }, 0)
  return recipientCount
}

/**
 * Compute the change amount in a BCH transaction.
 * @param {Object} tx - Transaction object with 'inputs' and 'outputs'.
 * @param {string} senderAddress - The address to identify as the change address.
 * @param {function} formatAddress - Function to format output's address
 * @returns {number} - Change amount in satoshis.
 */
export const getTotalBchChangeAmount = (tx, senderAddress, unit = 'bch') => { 
  const senderLockingBytecode = binToHex(cashAddressToLockingBytecode(senderAddress).bytecode)
  if (!tx || !Array.isArray(tx.inputs) || !Array.isArray(tx.outputs)) {
    throw new Error("Transaction must have 'inputs' and 'outputs' arrays.")
  }
  if (!senderAddress || typeof senderAddress !== 'string') {
    throw new Error('A valid sender address must be provided.')
  }
  // Find outputs going back to the sender (i.e., change)
  const changeOutputs = tx.outputs.filter(output => {
    if (senderLockingBytecode === binToHex(Uint8Array.from(Object.values(output.lockingBytecode)))) {
      return true
    }
    return false
    //return senderLockingBytecode == binToHex(Uint8Array.from(Object.values(output.lockingBytecode)))
  })
  // Sum the value of change outputs (some wallets may split change across multiple outputs)
  const amount = changeOutputs.reduce((total, output) => {
    total = total + BigInt(output.valueSatoshis)
    return total
  }, 0n)
  if (unit === 'bch') return Big(amount) / Big(1e8)
  return amount
}

/**
 * Revives special types formatted by the stringify function:
 * - `<Uint8Array: 0x...>` → Uint8Array
 * - `<bigint: ...n>` → bigint
 * - `<function: ...>` → string representation (cannot fully reconstruct)
 * - `<symbol: ...>` → string representation (cannot fully reconstruct)
 *
 * @param { string } _ - Key
 * @param { any } value
 * @returns The reconstructed JavaScript value with proper types
 */
export const libauthStringifyReviver = (_, value) => {
  if (typeof value !== 'string') return value

  // Uint8Array pattern: "<Uint8Array: 0x...>"
  const uint8ArrayMatch = value.match(/^<Uint8Array: 0x([0-9a-f]+)>$/i)
  if (uint8ArrayMatch) {
    return hexToBin(uint8ArrayMatch[1])
  }

  // Bigint pattern: "<bigint: ...n>"
  const bigintMatch = value.match(/^<bigint: (-?\d+)n>$/)
  if (bigintMatch) {
    return BigInt(bigintMatch[1])
  }

  // Function pattern: "<function: ...>"
  const functionMatch = value.match(/^<function: (.+)>$/)
  if (functionMatch) {
    // Note: We can't reconstruct actual functions, just return the string representation
    return { type: 'function', value: functionMatch[1] }
  }

  // Symbol pattern: "<symbol: ...>"
  const symbolMatch = value.match(/^<symbol: (.+)>$/)
  if (symbolMatch) {
    // Note: We can't reconstruct actual symbols, just return the string representation
    return { type: 'symbol', value: symbolMatch[1] }
  }

  return value
}

/**
  * @typedef { Object } MultisigSpec
  * @property { Number } m
  * @property { Number } n
*/

/**
 * Estimates the serialized size (in bytes) of a P2SH multisig input,
 * taking into account whether the UTXO is a CashToken.
 *
 * @param { import('../../utils/utxo-utils').CommonUTXO } utxo
 * @param { MultisigSpec } multisigSpec
 * @param { 'ecdsa'|'schnorr' } [sigType='schnorr'] - Signature type to estimate size for.
 * @returns {number} Estimated byte size of the input.
 */
export const estimateP2SHMultisigInputSize = (utxo, multisigSpec, sigType = 'schnorr') => {
  const sigSize = sigType === 'ecdsa' ? 73 : 64 // ECDSA is DER-encoded
  const sigPushSize = 1

  const { m, n } = multisigSpec

  if (typeof m !== 'number' || typeof n !== 'number') {
    throw new Error('Multisig spec (m-of-n) is required')
  }

  const signatureBytes = m * (sigSize + sigPushSize)

  const redeemScriptSize =
    1 + // OP_m
    (n * 33) + // pubkeys
    1 + // OP_n
    1 // OP_CHECKMULTISIG

  const redeemScriptPushSize =
    redeemScriptSize < 76
      ? 1
      : redeemScriptSize < 256
        ? 2
        : 3

  const scriptSigSize =
    1 + // OP_0 dummy
    signatureBytes +
    redeemScriptPushSize +
    redeemScriptSize

  let inputSize =
    32 + // outpoint txid
    4 + // outpoint index
    1 + // scriptSig varint length
    scriptSigSize +
    4 // sequence

  if (utxo.token) {
    const TOKEN_INPUT_OVERHEAD = 10 // adjust as needed for BCH CashTokens
    inputSize += TOKEN_INPUT_OVERHEAD
  }

  return inputSize
}

/**
 * Estimate unlocking bytecode size (scriptSig) for a P2SH m-of-n multisig input.
 *
 * @param {number} m - Number of required signatures.
 * @param {number} n - Total number of public keys.
 * @param {'ecdsa' | 'schnorr'} [sigType='ecdsa'] - Signature type.
 * @returns {number} Estimated scriptSig size in bytes.
 */
export const estimateUnlockingBytecodeSize = (m, n, sigType = 'ecdsa') => {
  const sigSize = sigType === 'schnorr' ? 64 : 72 // avg sizes
  const sigPushOverhead = 1 // push opcode per signature

  const totalSigSize = m * (sigSize + sigPushOverhead)

  const pubkeySize = 33 // compressed pubkeys

  const redeemScriptSize =
    1 + // OP_m
    (n * pubkeySize) + // n pubkeys
    1 + // OP_n
    1 // OP_CHECKMULTISIG

  const redeemScriptPushSize =
    // eslint-disable-next-line multiline-ternary
    redeemScriptSize < 0x4c ? 1 // direct push
      // eslint-disable-next-line multiline-ternary
      : redeemScriptSize <= 0xff ? 2 // OP_PUSHDATA1
        // eslint-disable-next-line multiline-ternary
        : redeemScriptSize <= 0xffff ? 3 // OP_PUSHDATA2
          : 5 // OP_PUSHDATA4

  const scriptSigSize =
    1 + // OP_0
    totalSigSize +
    redeemScriptPushSize +
    redeemScriptSize

  return scriptSigSize
}

/**
 * Return the non-hardened part of a BIP32 derivation path.
 * Example: "m/48'/145'/0'/0/5" → "0/5"
 */
export const bip32ExtractRelativePath = (fullPath) => {
  if (!fullPath.startsWith("m/")) {
    throw new Error("Path must start with 'm/'");
  }

  const parts = fullPath
    .slice(2)
    .split('/')
    .filter(Boolean);

  const lastHardenedIndex = parts.reduce(
    (idx, el, i) => (el.endsWith("'") ? i : idx),
    -1
  );

  const nonHardened = parts.slice(lastHardenedIndex + 1).join('/');
  return nonHardened || '';
}

/**
 * Encode a BIP32 derivation path string (e.g. "m/44'/145'/0'/0/5")
 * into a Uint8Array of 32-bit little-endian integers. The derivation 
 * path is represented as 32 bit unsigned integer indexes concatenated 
 * with each other.
 */
export function bip32EncodeDerivationPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string');
  }

  const trimmed = path.trim();

  if (trimmed === 'm') {
    return new Uint8Array();
  }

  if (!trimmed.startsWith("m/")) {
    throw new Error("Path must start with 'm/'");
  }

  const elements = trimmed
    .slice(2)
    .split("/")
    .filter(Boolean);

  const bytes = new Uint8Array(elements.length * 4);
  const view = new DataView(bytes.buffer);

  elements.forEach((el, i) => {
    const hardened = el.endsWith("'");
    const indexStr = hardened ? el.slice(0, -1) : el;

    if (!/^[0-9]+$/.test(indexStr)) {
      throw new Error(`Invalid derivation index '${el}'`);
    }

    const index = Number.parseInt(indexStr, 10);

    if (!Number.isSafeInteger(index) || index < 0 || index > 0x7fffffff) {
      throw new Error(`Derivation index out of range '${el}'`);
    }

    if (!hardened && index >= 0x80000000) {
      throw new Error(`Unhardened index must be < 2^31 ('${el}')`);
    }

    const value = hardened ? index + 0x80000000 : index;
    view.setUint32(i * 4, value, true); // little-endian
  });

  return bytes;
}


/**
 * Decode a Uint8Array of 32-bit little-endian integers
 * back into a BIP32 path string (e.g. "m/44'/145'/0'/0/5").
 */
export function bip32DecodeDerivationPath(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('Derivation path bytes must be a Uint8Array');
  }

  if (bytes.byteLength === 0) {
    return 'm';
  }

  if (bytes.byteLength % 4 !== 0) {
    throw new Error("Invalid derivation path bytes");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const elements = [];

  for (let i = 0; i < bytes.byteLength; i += 4) {
    const value = view.getUint32(i, true); // little-endian
    const hardened = value >= 0x80000000;
    const index = hardened ? value - 0x80000000 : value;
    elements.push(hardened ? `${index}'` : `${index}`);
  }

  return elements.length ? `m/${elements.join('/')}` : 'm';
}

/**
 * Decode a binary HD public key payload back to its components
 * 
 * Reverse of import('@bitauth/libauth').encodeHdPublicKeyPayload
 * 
 * @param {Uint8Array} payload - 78 bytes
 * @returns {import('@bitauth/libauth').DecodedHdKey<HdPublicNodeValid>} 
 */
export function decodeHdPublicKeyPayload(payload) {
  if (payload.length !== 78) throw new Error("Invalid payload length");
  return {
    network: binsAreEqual(payload.slice(0, 4), hexToBin('0488B21E')) ? 'mainnet': 'testnet',
    node: {
      version: payload.slice(0, 4),                     // Uint8Array(4)
      depth: payload[4],                                // number
      parentFingerprint: payload.slice(5, 9),          // Uint8Array(4)
      childIndex: Number(binToBigIntUintBE(payload.slice(9, 13))), // Uint8Array(4)
      chainCode: payload.slice(13, 45),                // Uint8Array(32)
      publicKey: payload.slice(45, 78)
    }
  };
}
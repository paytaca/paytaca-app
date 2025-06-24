import Big from 'big.js'
import { hexToBin, cashAddressToLockingBytecode, binToHex } from 'bitauth-libauth-v3'

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

export const getTotalBchFee = (tx, unit = 'bch') => {
  const amount = getTotalBchInputAmount(tx, 'satoshis') - getTotalBchOutputAmount(tx, 'satoshis')
  if (unit === 'bch') return amount / 1e8
  return amount
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

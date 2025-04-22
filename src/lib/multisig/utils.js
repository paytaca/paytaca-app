
import { hexToBin } from 'bitauth-libauth-v3'

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
  console.log('🚀 ~ getTotalBchOutputAmount ~ tx:', tx)
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
export const getTotalBchChangeAmount = (tx, senderAddress, formatAddress, unit = 'bch') => {
  if (!tx || !Array.isArray(tx.inputs) || !Array.isArray(tx.outputs)) {
    throw new Error("Transaction must have 'inputs' and 'outputs' arrays.")
  }
  if (!senderAddress || typeof senderAddress !== 'string') {
    throw new Error('A valid sender address must be provided.')
  }
  // Find outputs going back to the sender (i.e., change)
  const changeOutputs = tx.outputs.filter(output => {
    console.log('formatAddress(output.address) === senderAddress', formatAddress(output.address))
    console.log('formatAddress(output.address) === senderAddress', senderAddress)
    if (formatAddress) {
      return formatAddress(output.address) === senderAddress
    }
    return output.address === senderAddress
  })
  console.log('🚀 ~ getTotalBchChangeAmount ~ changeOutputs:', changeOutputs)

  if (changeOutputs.length === 0) {
    return 0 // No change output
  }
  // Sum the value of change outputs (some wallets may split change across multiple outputs)
  const amount = changeOutputs.reduce((total, output) => {
    // if (typeof output.valueSatoshis !== 'number') {
    //   throw new Error("Each output must have a numeric 'value' in satoshis.")
    // }
    return total + Number(output.valueSatoshis)
  }, 0)
  if (unit === 'bch') return amount / 1e8
  return amount
}

/**
 * Parses a libauth stringified value back into its original JavaScript types.
 * Handles special types formatted by the stringify function:
 * - `<Uint8Array: 0x...>` → Uint8Array
 * - `<bigint: ...n>` → bigint
 * - `<function: ...>` → string representation (cannot fully reconstruct)
 * - `<symbol: ...>` → string representation (cannot fully reconstruct)
 *
 * @param str - The stringified value to parse
 * @returns The reconstructed JavaScript value with proper types
 */
export const parseStringified = (str) => {
  // First, parse the basic JSON structure
  const parsed = JSON.parse(str, (_, value) => {
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
  })

  return parsed
}

/**
 * Parses a test vector string (output from stringifyTestVector) back into
 * proper JavaScript types.
 *
 * @param str - The stringified test vector to parse
 * @returns The reconstructed JavaScript value with proper types
 */
export const parseTestVector = (str) => {
  // Convert test vector format to something JSON.parse can handle
  const jsonCompatible = str
    .replace(/hexToBin\('([0-9a-f]+)'\)/gi, '"<Uint8Array: 0x$1>"')
    .replace(/(\d+)n/g, '"<bigint: $1n>"')

  return parseStringified(jsonCompatible)
}

// Example usage:
/*
const example = {
  num: 42,
  big: BigInt(123),
  bytes: Uint8Array.from([1, 2, 3]),
  fn: (x) => x * 2,
  sym: Symbol('test')
};

const stringified = stringify(example);
const parsed = parseStringified(stringified);

const testVector = stringifyTestVector(example);
const parsedTestVector = parseTestVector(testVector);
*/

import { decodeCashAddress, hexToBin, isHex } from '@bitauth/libauth'
import { Contract, ElectrumNetworkProvider } from 'cashscript13'

export function getPkhash(addr) {
  if (/^[0-9a-fA-F]{40}$/.test(addr)) {
    return new Uint8Array(addr.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  }
  if (!addr.includes(':')) addr = 'bitcoincash:' + addr
  const decoded = decodeCashAddress(addr)
  if (typeof decoded === 'string') throw new Error(decoded)
  return decoded.payload
}


/**
 * @param {Object} sub 
 * @param {import('cashscript13').Artifact} artifactObj 
 */
export function getSubscriptionContractInstance(sub, artifactObj, isChipnet) {
  const provider = new ElectrumNetworkProvider(isChipnet ? 'chipnet' : 'mainnet')
  const reversedCategoryHex = sub.category.match(/.{1,2}/g).reverse().join('')
  const categoryBytes = new Uint8Array(reversedCategoryHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))

  const merchantPayload = getPkhash(sub.merchant_address)
  const funderPayload = getPkhash(sub.funder_address)
  const paytacaPayload = getPkhash(sub.paytaca_address)

  const contract = new Contract(artifactObj, [
    merchantPayload,
    funderPayload,
    paytacaPayload,
    BigInt(sub.max_fee),
    BigInt(sub.max_pledge || sub.pledge_satoshis), // fallback to pledge_satoshis if max_pledge is undefined
    BigInt(sub.min_period || sub.period_blocks),
    BigInt(sub.max_period || sub.period_blocks),
    categoryBytes,
    BigInt(sub.contract_timestamp),
    BigInt(sub.max_payments || 0)
  ], { provider })

  return contract
}


/**
 * @returns {import('cashscript13').Utxo}
 */
export function formatKitInput(inputData) {
  const input = {
    ...inputData,
    satoshis: BigInt(inputData.satoshis)
  }

  if (input.token) {
    input.token = {
      ...input.token,
      amount: BigInt(input.token.amount)
    }
  }

  return input;
}

/**
 * 
 * @returns {import('cashscript13').Output}
 */
export function formatKitOutput(outputData) {
  const output = {
    ...outputData,
    to: typeof outputData.to === 'string' && isHex(outputData.to) ? hexToBin(outputData.to) : outputData.to,
    amount: BigInt(outputData.satoshis),
  }

  if (output.token) {
    output.token = {
      ...output.token,
      amount: BigInt(output.token.amount)
    }
  }

  return output;
}

import { CashAddressType, decodeCashAddress, encodeCashAddress, CashAddressNetworkPrefix} from '@bitauth/libauth'

/**
 * Util function
 * @return true if address is a token address
 */
export const isTokenAddress = (address /* :string */) => {
  try {
    const decodedAddress = decodeCashAddress(address)
    if (typeof decodedAddress === 'string') return false
    return decodedAddress.type === CashAddressType.p2pkhWithTokens || decodedAddress.type === CashAddressType.p2shWithTokens
  } catch (error) {
    return false
  }
}

/**
 * Shortens address for display
 * @return bchtest:qz97d...fwe if address is bchtest:qz97djdjktl0dvawp79a73jlq7cy95stcvx8sk9fwe
 */
export const shortenAddressForDisplay = (address /* :string */) => {
  let startIndex = 16
  if (address?.startsWith('bchtest:')) {
    startIndex = 12
  }
  return address.replace(address.slice(startIndex, address.length - 4), '...')
}

export const toP2pkhTestAddress = (p2pkhAddress /* :string */) => {
  const decodedAddress = decodeCashAddress(p2pkhAddress)
  return encodeCashAddress(CashAddressNetworkPrefix.testnet, CashAddressType.p2pkh, decodedAddress.payload)
}

export const toP2pkhTestTokenAddress = (p2pkhAddress /* :string */) => {
  const decodedAddress = decodeCashAddress(p2pkhAddress)
  return encodeCashAddress(CashAddressNetworkPrefix.testnet, CashAddressType.p2pkhWithTokens, decodedAddress.payload)
}

export const toP2shTestAddress = (p2shAddress /* :string */) => {
  const decodedAddress = decodeCashAddress(p2shAddress)
  return encodeCashAddress(CashAddressNetworkPrefix.testnet, CashAddressType.p2sh, decodedAddress.payload)
}

export const toP2shTestTokenAddress = (p2shAddress /* :string */) => {
  const decodedAddress = decodeCashAddress(p2shAddress)
  return encodeCashAddress(CashAddressNetworkPrefix.testnet, CashAddressType.p2shWithTokens, decodedAddress.payload)
}

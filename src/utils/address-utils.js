import { CashAddressType, decodeCashAddress } from '@bitauth/libauth'

/**
 * Util function
 * @return true if address is a token address
 */
export const isTokenAddress = (address /* :string */) => {
  const { type } = decodeCashAddress(address)
  return type === CashAddressType.p2pkhWithTokens || type === CashAddressType.p2shWithTokens
}

/**
 * Shortens address for display
 * @return bchtest:qz97d...fwe if address is bchtest:qz97djdjktl0dvawp79a73jlq7cy95stcvx8sk9fwe
 */
export const shortenAddressForDisplay = (address /* :string */) => {
  return address.replace(address.slice(13, address.length - 3), '...')
}

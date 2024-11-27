import { CashAddressType, decodeCashAddress, encodeCashAddress, CashAddressNetworkPrefix} from '@bitauth/libauth'

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

/**
 * Shortens address for display
 * @return bchtest:qz97d...fwe if address is bchtest:qz97djdjktl0dvawp79a73jlq7cy95stcvx8sk9fwe
 */
export const toP2pkhTestAddress = (p2pkhAddress /* :string */, withTokens = false /* ?: boolean */) => {
  const decodedAddress = decodeCashAddress(p2pkhAddress)
  const addressType = withTokens ? CashAddressType.p2pkhWithTokens : CashAddressType.p2pkh
  return encodeCashAddress(CashAddressNetworkPrefix.testnet, addressType, decodedAddress.payload)
}

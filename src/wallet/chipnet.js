import store from 'src/store'
import { Address } from './index'
import {
  CashAddressNetworkPrefix,
  CashAddressType,
  encodeCashAddress,
  decodeCashAddress,
} from '@bitauth/libauth'


export function getWatchtowerApiUrl (isChipnet) {
  if (isChipnet)
    return 'https://chipnet.watchtower.cash/api'
  return 'https://watchtower.cash/api'
}

export function getWatchtowerWebsocketUrl (isChipnet) {
  if (isChipnet)
    return 'wss://chipnet.watchtower.cash/ws'
  return 'wss://watchtower.cash/ws'
}

export function getWalletByNetwork (wallet, type) {
  const w = wallet
  const idx = Number(store().getters['global/isChipnet'])
  
  if (type === 'bch')
    return [w.BCH, w.BCH_CHIP][idx]
  if (type === 'slp')
    return [w.SLP, w.SLP_TEST][idx]
  return w.sBCH
}

export function convertCashAddress (address, toTestNet = true, toTokenAddress = true) {
  const decodedAddress = decodeCashAddress(address)
  const prefix = toTestNet ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
  const addressType = toTokenAddress ? CashAddressType.p2pkhWithTokens : CashAddressType.p2pkh
  return encodeCashAddress(prefix, addressType, decodedAddress.payload)
}

export function isValidTokenAddress (address) {
  const isChipnet = store().getters['global/isChipnet']
  const prefix = isChipnet ? 'bchtest' : 'bitcoincash'

  if (address.startsWith(`${prefix}:z`)) {
    const cashAddr = convertCashAddress(address, isChipnet, false)
    const addressObj = new Address(cashAddr)
    return addressObj.isValidBCHAddress(isChipnet)
  }

  return false
}

export function getBlockChainNetwork () {
  const isChipnet = store().getters['global/isChipnet']
  return isChipnet ? 'chipnet' : 'mainnet'
}

export function convertTokenAmount (amount, decimals, decimalPlaces=2, isBCH=false, isSLP=false) {
  if (isBCH || isSLP) return amount
  if (amount === 0) return amount
  const parsedAmount = parseInt(amount) || 0
  const finalAmount = parsedAmount / (10 ** decimals)
  return finalAmount.toLocaleString('en-us', {maximumFractionDigits: decimalPlaces})
}

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
  
  // Unknown wallet type
  throw new Error(`Unknown wallet type: ${type}`)
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
  // BCH amounts are already human-readable; token amounts (including SLP) are in base units
  // and should be scaled by `decimals`.
  if (isBCH) return amount
  if (amount === 0) return amount
  const parsedAmount = parseInt(amount) || 0
  const finalAmount = parsedAmount / (10 ** decimals)
  return finalAmount.toLocaleString('en-us', {maximumFractionDigits: decimalPlaces})
}

export function convertToTokenAmountWithDecimals(amount, decimals, isBCH=false, isSLP=false) {
  // BCH amounts are already human-readable; token amounts (including SLP) are in base units
  // and should be scaled by `decimals`.
  if (isBCH) return amount
  if (amount === null || amount === undefined) return 0

  const amountStr = String(amount)
  if (!amountStr.trim()) return 0

  // If amount already includes a fractional part, treat it as human-readable value
  if (amountStr.includes('.') || amountStr.toLowerCase().includes('e')) {
    const numericAmount = Number(amountStr)
    return Number.isFinite(numericAmount) ? numericAmount : 0
  }

  const parsedDecimals = parseInt(decimals) || 0
  const multiplier = BigInt(10) ** BigInt(parsedDecimals)

  let parsedAmount
  try {
    parsedAmount = BigInt(amountStr)
  } catch {
    const fallback = Number(amountStr)
    return Number.isFinite(fallback) ? fallback : 0
  }

  const isNegative = parsedAmount < 0n
  const absAmount = isNegative ? parsedAmount * -1n : parsedAmount

  const remainder = absAmount % multiplier
  let converted = remainder === 0n
    ? Number(absAmount / multiplier)
    : Number(absAmount) / Number(multiplier)

  if (isNegative) converted *= -1
  return converted
}

import crypto from 'crypto'
import {
  ripemd160,
  binToHex,
  hexToBin,
  decodeCashAddress,
  encodeCashAddress,
  CashAddressNetworkPrefix,
  CashAddressType
} from "@bitauth/libauth"
import { BLOCK_TIME_SEC } from './constants.js'
import { ElectrumNetworkProvider } from 'cashscript'

export async function getBlockHeight() {
  const provider = new ElectrumNetworkProvider('mainnet')
  const blockHeight = await provider.getBlockHeight()
  console.log('blockHeight:', blockHeight)
  return blockHeight
}

export async function convertTimeToBlock(timestamp) {
  const currentTime = Math.floor(Date.now() / 1000)
  const blocksAhead = Math.floor((timestamp - currentTime) / BLOCK_TIME_SEC)
  const currentBlockHeight = await getBlockHeight()
  const estimatedBlockHeight = currentBlockHeight + blocksAhead
  console.log('estimatedBlockHeight:', estimatedBlockHeight)
  return estimatedBlockHeight
}

export function sha256(data='', encoding='utf8') {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, encoding))
  return _sha256.digest().toString('hex')
}

export function pubkeyToPkHash(pubkey='') {
  return binToHex(ripemd160.hash(hexToBin(sha256(pubkey, 'hex'))))
}

export function convertCashAddressToTokenAddress (address, isContract = true) {
  console.log('convertCashAddressToTokenAddress:', address)
  const decodedAddress = decodeCashAddress(address)
  console.log('decodedAddress:', decodedAddress)
  console.log('payload:', decodedAddress.payload)
  const prefix = CashAddressNetworkPrefix.mainnet
  const addressType = isContract ? CashAddressType.p2shWithTokens : CashAddressType.p2pkhWithTokens
  const { address: tokenAddress } = encodeCashAddress(prefix, addressType, decodedAddress.payload)
  return tokenAddress
}

import { decodeTransaction, hexToBin } from 'bitauth-libauth-v3'
import { extractContractBytecode, signBchTxError } from '../bch-sign'

export { parseExtendedJson, privateKeyToCashAddress, signBchTxError, extractContractBytecode } from '../bch-sign'

export function decodeWcTransaction(transaction) {
  if (typeof transaction !== 'string') return transaction
  const decoded = decodeTransaction(hexToBin(transaction))
  if (typeof decoded === 'string') {
    throw signBchTxError(`Failed to decode transaction: ${decoded}`)
  }
  return decoded
}

export function unpackSourceOutput(sourceOutput) {
  const contractName = sourceOutput?.contract?.artifact?.contractName
  if (!contractName) return
  const redeemScript = extractContractBytecode(sourceOutput?.unlockingBytecode)
  if (!redeemScript?.length) return
  sourceOutput.contract = {
    ...sourceOutput.contract,
    redeemScript
  }
}
export { parseExtendedJson, privateKeyToCashAddress, signBchTxError, extractContractBytecode } from '../bch-sign'

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
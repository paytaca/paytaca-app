import { binToHex } from 'bitauth-libauth-v3'

export { parseExtendedJson, privateKeyToCashAddress, signBchTxError, extractContractBytecode } from '../bch-sign'

export function unpackSourceOutput(sourceOutput) {
  const contractName = sourceOutput?.contract?.artifact?.contractName;
  if (!contractName) return
  const redeemScript = extractContractBytecode(sourceOutput?.unlockingBytecode)
  if (redeemScript?.length && binToHex(redeemScript) !== binToHex(sourceOutput?.contract?.redeemScript)) {
    sourceOutput.contract = {
      ...sourceOutput.contract,
      redeemScript
    }
  }
}
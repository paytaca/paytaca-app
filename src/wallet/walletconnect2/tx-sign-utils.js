import { binToHex, decodeAuthenticationInstructions, encodeAuthenticationInstructions } from 'bitauth-libauth-v3'

export { parseExtendedJson, privateKeyToCashAddress, signBchTxError } from '../bch-sign'

export function unpackSourceOutput(sourceOutput) {
  const contractName = sourceOutput?.contract?.artifact?.contractName;
  if (!contractName) return
  const decoded = decodeAuthenticationInstructions(sourceOutput?.unlockingBytecode)
  const redeemScript = (decoded.splice(-1)[0])?.data;
  if (redeemScript?.length) {
    let script = redeemScript.slice();
    let lastScriptHash;
    do {
      lastScriptHash = binToHex(script);
      const decodedScript = decodeAuthenticationInstructions(script);
      const first = decodedScript.splice(0, 1)[0];
      if (first && first.opcode <= 96) {
        script = encodeAuthenticationInstructions(decodedScript);
      } else {
        break;
      }
    } while (lastScriptHash !== binToHex(script) && script.length < redeemScript.length);

    sourceOutput.contract = {
      ...sourceOutput.contract,
      redeemScript: script
    }
  }
}
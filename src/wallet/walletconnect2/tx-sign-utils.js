import { binToHex, decodeAuthenticationInstructions, encodeAuthenticationInstructions } from 'bitauth-libauth-v3'

// Re-export shared utilities for backward compatibility
export { parseExtendedJson, privateKeyToCashAddress, signBchTxError } from '../bch-sign'

export function unpackSourceOutput(sourceOutput) {
  const contractName = sourceOutput?.contract?.artifact?.contractName;
  if (!contractName) return sourceOutput
  const decoded = decodeAuthenticationInstructions(sourceOutput?.unlockingBytecode)
  const redeemScript = (decoded.splice(-1)[0])?.data;
  if (redeemScript?.length) {
    let script = redeemScript.slice();
    let artifact = artifactMap[binToHex(script)]
    while (!artifact) {
      const decodedScript = decodeAuthenticationInstructions(script);
      const [{ opcode }] = decodedScript.splice(0,1);

      // if the opcode is a data push, we strip it and continue
      if (opcode <= 96 /* OP_16 */) {
        script = encodeAuthenticationInstructions(decodedScript);
        artifact = artifactMap[binToHex(script)];
      } else {
        return sourceOutput;
      }
    }

    let abiFunction
    if (artifact.abi.length > 1) {
      // expect to N abi parameters + 1 function index push
      const abiFunctionIndex = Number(BigInt((decoded.splice(-1)[0]).data));
      abiFunction = artifact.abi[abiFunctionIndex];
    } else {
      abiFunction = artifact.abi[0];
    }
    sourceOutput.contract = {
      ...sourceOutput.contract,
      artifact: {
        contractName: artifact.contractName
      },
      abiFunction: {
        name: abiFunction.name,
        inputs: undefined
      },
      redeemScript: undefined
    }
  }
}

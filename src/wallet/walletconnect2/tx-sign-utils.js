import { binToHex, decodeAuthenticationInstructions, encodeLockingBytecodeP2pkh, hash160, hexToBin, lockingBytecodeToCashAddress, secp256k1 } from "@bitauth/libauth";

export function parseExtendedJson(jsonString) {
  const uint8ArrayRegex = /^<Uint8Array: 0x(?<hex>[0-9a-f]*)>$/u;
  const bigIntRegex = /^<bigint: (?<bigint>[0-9]*)n>$/;

  return JSON.parse(jsonString, (_key, value) => {
    if (typeof value === "string") {
      const bigintMatch = value.match(bigIntRegex);
      if (bigintMatch) {
        return BigInt(bigintMatch[1]);
      }
      const uint8ArrayMatch = value.match(uint8ArrayRegex);
      if (uint8ArrayMatch) {
        return hexToBin(uint8ArrayMatch[1]);
      }
    }
    return value;
  });
}

/**
 * @param {Uint8Array} privateKey 
 */
export function privateKeyToCashAddress(privateKey) {
  const pubkeyCompressed = secp256k1.derivePublicKeyCompressed(privateKey)
  const pkhash = hash160(pubkeyCompressed)
  const lockingBytecode = encodeLockingBytecodeP2pkh(pkhash)
  const cashAddr = lockingBytecodeToCashAddress(lockingBytecode)
  return cashAddr
}


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

export function signBchTxError(...args) {
  const error = new Error(args)
  error.name = 'SignBCHTransactionError'
  return error
}

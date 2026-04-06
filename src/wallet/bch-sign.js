import {
  SigningSerializationFlag,
  walletTemplateP2pkhNonHd,
  walletTemplateToCompilerBCH,
  binToHex,
  encodeLockingBytecodeP2pkh,
  encodeTransaction,
  generateSigningSerializationBCH,
  generateTransaction,
  hash160,
  hash256,
  hexToBin,
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  secp256k1,
  sha256,
} from 'bitauth-libauth-v3'

export function parseExtendedJson(jsonString) {
  const uint8ArrayRegex = /^<Uint8Array: 0x(?<hex>[0-9a-f]*)>$/u;
  const bigIntRegex = /^<bigint: (?<bigint>[0-9]*)n>$/;

  return JSON.parse(jsonString, (_key, value) => {
    if (typeof value === "string") {
      const bigintMatch = value.match(bigIntRegex);
      if (bigintMatch) return BigInt(bigintMatch[1]);
      const uint8ArrayMatch = value.match(uint8ArrayRegex);
      if (uint8ArrayMatch) return hexToBin(uint8ArrayMatch[1]);
    }
    return value;
  });
}

/**
 * @param {Uint8Array} privateKey
 * @param {string} [prefix]
 */
export function privateKeyToCashAddress(privateKey, prefix) {
  const pubkeyCompressed = secp256k1.derivePublicKeyCompressed(privateKey)
  if (typeof pubkeyCompressed === 'string') throw new Error(pubkeyCompressed)
  const pkhash = hash160(pubkeyCompressed)
  const lockingBytecode = encodeLockingBytecodeP2pkh(pkhash)
  const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix })
  if (typeof result === 'string') throw new Error(result)
  return result.address
}

export function signBchTxError(...args) {
  const error = new Error(args)
  error.name = 'SignBCHTransactionError'
  return error
}

/**
 * Sign a BCH transaction, handling both P2PKH and CashScript contract inputs.
 *
 * @param {Object} params
 * @param {Object} params.transaction - The decoded transaction template
 * @param {Array} params.sourceOutputs - Source outputs indexed by input position
 * @param {Function} params.resolveKey - (lockingBytecode, inputIndex) => { privateKey, publicKey } | null
 * @param {string} [params.prefix] - Address prefix ('bitcoincash' or 'bchtest')
 * @returns {{ signedTransaction: string, signedTransactionHash: string }}
 */
export function signBchTransaction({ transaction, sourceOutputs, resolveKey, prefix }) {
  const walletTemplate = importWalletTemplate(walletTemplateP2pkhNonHd)
  if (typeof walletTemplate === 'string') throw new Error(walletTemplate)
  const compiler = walletTemplateToCompilerBCH(walletTemplate)

  const txTemplate = { ...transaction, inputs: transaction.inputs.map(i => ({ ...i })) }

  for (const [index, input] of txTemplate.inputs.entries()) {
    const sourceOutput = sourceOutputs[index]
    if (!sourceOutput) continue

    const resolved = resolveKey(sourceOutput.lockingBytecode, index)
    if (!resolved) continue

    const { privateKey, publicKey } = resolved

    if (sourceOutput?.contract?.artifact?.contractName) {
      // CashScript contract input — replace signature/pubkey placeholders
      let unlockingBytecodeHex = binToHex(sourceOutput.unlockingBytecode)
      const sigPlaceholder = "41" + binToHex(Uint8Array.from(Array(65)))
      const pubkeyPlaceholder = "21" + binToHex(Uint8Array.from(Array(33)))

      if (unlockingBytecodeHex.indexOf(sigPlaceholder) !== -1) {
        const hashType = SigningSerializationFlag.allOutputs | SigningSerializationFlag.utxos | SigningSerializationFlag.forkId
        const context = { inputIndex: index, sourceOutputs, transaction }
        const signingSerializationType = new Uint8Array([hashType])

        const coveredBytecode = sourceOutputs[index].contract?.redeemScript
        if (!coveredBytecode) {
          throw signBchTxError('Not enough information provided, please include contract redeemScript')
        }
        const sighashPreimage = generateSigningSerializationBCH(context, { coveredBytecode, signingSerializationType })
        const sighash = hash256(sighashPreimage)
        const signature = secp256k1.signMessageHashSchnorr(privateKey, sighash)
        if (typeof signature === 'string') throw signBchTxError(signature)
        const sig = Uint8Array.from([...signature, hashType])

        unlockingBytecodeHex = unlockingBytecodeHex.replace(sigPlaceholder, "41" + binToHex(sig))
      }

      if (unlockingBytecodeHex.indexOf(pubkeyPlaceholder) !== -1) {
        unlockingBytecodeHex = unlockingBytecodeHex.replace(pubkeyPlaceholder, "21" + binToHex(publicKey))
      }

      input.unlockingBytecode = hexToBin(unlockingBytecodeHex)
    } else if (!sourceOutput?.unlockingBytecode?.length) {
      // P2PKH input — use compiler
      input.unlockingBytecode = {
        compiler,
        data: {
          keys: { privateKeys: { key: privateKey } },
        },
        valueSatoshis: sourceOutput.valueSatoshis,
        script: 'unlock',
        token: sourceOutput.token,
      }
    }
  }

  const generated = generateTransaction(txTemplate)
  if (!generated.success) {
    throw signBchTxError(JSON.stringify(generated.errors, null, 2))
  }
  const encoded = encodeTransaction(generated.transaction)
  const hash = binToHex(sha256.hash(sha256.hash(encoded)).reverse())
  return { signedTransaction: binToHex(encoded), signedTransactionHash: hash }
}

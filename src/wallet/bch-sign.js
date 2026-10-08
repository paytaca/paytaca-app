import {
  SigningSerializationFlag,
  walletTemplateP2pkhNonHd,
  walletTemplateToCompilerBCH,
  binToHex,
  decodeAuthenticationInstructions,
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
 * Extract the contract (redeem) script from an unlocking bytecode by taking
 * the last authentication instruction, which is a push of the full redeem
 * script committed in the P2SH/P2SH32 locking bytecode.
 * @param {Uint8Array} unlockingBytecode
 * @returns {Uint8Array|undefined}
 */
export function extractContractBytecode(unlockingBytecode) {
  if (!unlockingBytecode) return undefined
  const decoded = decodeAuthenticationInstructions(unlockingBytecode)
  if (typeof decoded === 'string') return undefined
  let script = (decoded.splice(-1)[0])?.data
  if (typeof script === 'string') {
    try {
      script = hexToBin(script)
    } catch (error) {
      return undefined
    }
  }
  return script?.length ? script : undefined
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

      // Verify the redeem script matches the locking bytecode's script hash
      // This prevents malicious dApps from substituting a different contract's redeem script
      let coveredBytecode = extractContractBytecode(sourceOutput.unlockingBytecode)
      if (!coveredBytecode) {
        coveredBytecode = sourceOutputs[index].contract?.redeemScript
        if (typeof coveredBytecode === 'string') {
          try {
            coveredBytecode = hexToBin(coveredBytecode)
          } catch (error) {
            coveredBytecode = undefined
          }
        }
      }
      if (!coveredBytecode) {
        throw signBchTxError('Not enough information provided, please include contract redeemScript')
      }
      const lockBytecodeHex = binToHex(sourceOutput.lockingBytecode)
      const p2sh20Match = lockBytecodeHex.match(/^a914([0-9a-f]{40})87$/)
      const p2sh32Match = lockBytecodeHex.match(/^aa20([0-9a-f]{64})87$/)
      if (p2sh20Match) {
        const expectedHash = p2sh20Match[1]
        const actualHash = binToHex(hash160(coveredBytecode))
        if (actualHash !== expectedHash) {
          throw signBchTxError('Redeem script does not match P2SH locking bytecode')
        }
      } else if (p2sh32Match) {
        const expectedHash = p2sh32Match[1]
        const actualHash = binToHex(hash256(coveredBytecode))
        if (actualHash !== expectedHash) {
          console.error('P2SH32 locking bytecode mismatch', {
            lockingBytecode: lockBytecodeHex,
            expectedHash,
            actualHash,
            coveredBytecode: binToHex(coveredBytecode)
          })
          throw signBchTxError('Redeem script does not match P2SH32 locking bytecode')
        }
      } else {
        throw signBchTxError('Contract input locking bytecode is not valid P2SH/P2SH32')
      }

      if (unlockingBytecodeHex.indexOf(sigPlaceholder) !== -1) {
        const hashType = SigningSerializationFlag.allOutputs | SigningSerializationFlag.utxos | SigningSerializationFlag.forkId
        const context = { inputIndex: index, sourceOutputs, transaction }
        const signingSerializationType = new Uint8Array([hashType])

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

/// <reference path="./wallet.js" />
/// <reference path="./network.js" />
/// <reference path="./utxo.js" />

/**
   * @typedef {Object} PartialSignature
   * @property {Uint8Array} publicKey - The signer's public key (as bytecode).
   * @property {string} publicKeyBip32DerivationPath - BIP32 derivation path (e.g., "0/0").
   * @property {number} publicKeyRedeemScriptSlot - Index of redeem script slot.
   * @property {string} signer - Name or ID of the signer.
   * @property {string} sigHash - Sighash flag (usually one byte as hex).
   * @property {string} sigAlgo - Signature algorithm (e.g., "ecdsa").
   * @property {number} sigSlot - Index of the signature slot.
   * @property {string} sig - The signature itself (likely a hex string).
   */

  /**
   * @typedef {Object} TokenData
   * @property {string} category - Token ID.
   * @property {string} amount - Amount of fungible tokens.
   * @property {Object} [nft] - NFT metadata.
   * @property {string} [nft.capability] - Capability: "none", "mutable", or "minting".
   * @property {string|Uint8Array} [nft.commitment] - Commitment as hex or encoded string.
   */

  /**
   * @typedef {Object} SourceOutput
   * @property {string} outpointIndex - Transaction ID of the output.
   * @property {Uint8Array|string} outpointTransactionHash - Output index.
   * @property {number|bigint} satoshis - Amount in satoshis.
   * @property {Uint8Array|string} lockingBytecode - The scriptPubkey, if string it's the hex representation of Uint8Array
   * @property {Uint8Array|string} [unlockingBytecode] - The scriptSig, if string it's the hex representation of Uint8Array
   * @property {TokenData} [token] - Optional CashToken information.
   * @property {string} [addressPath] - Optional derivation path (e.g., "0/0").
   */

  /**
   * @typedef {Object} Input
   * @property {number} outpointIndex - Transaction ID of the input.
   * @property {Uint8Array|string} outpointTransactionHash - Output index.
   * @property {SourceOutput} sourceOutput - Details about the output being spent.
   * @property {PartialSignature[]} [partialSignatures] - Signatures (if partially signed).
   * @property {string} [scriptSig] - The final script
   */

  /**
   * @typedef {Object} Output
   * @property {string} to - Destination BCH address.
   * @property {number|string} satoshis - Amount in satoshis.
   * @property {TokenData} [token] - Optional token data.
   */

  /**
   * @typedef {Object} PartiallySignedTransaction
   * @property {string} creator - Identifier for the creator.
   * @property {string} origin - The origin of the proposal.
   * @property {string} purpose - Purpose or description of the proposal.
   * @property {string} unsignedTransactionHex - Unsigned raw transaction in hex.
   * @property {Input[]} [inputs] - Input map
   * @property {Output[]} [outputs] - Output map
   * @property {MultisigWallet} wallet - Associated wallet object.
   */

  /**
   * @typedef {Object} PartiallySignedTransactionOptions
   * @property {OnStateChangeCallback} onStateChange
   * @property {NetworkProvider} provider
   * @property {Network} [network='mainnet']
   * @property {Object} [store] - Optional Vuex-style store.
   * @property {(type: string, payload?: any) => Promise<any>} [store.dispatch]
   * @property {(type: string, payload?: any) => void} [store.commit]
   * @property {Object.<string, any>} [store.state]
   * @property {Object.<string, any>} [store.getters]
   */


import {
  encodeTransactionCommon,
  hashTransaction,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBch,
  CashAddressNetworkPrefix,
  generateTransaction,
  binToHex,
  extractResolvedVariables,
  utf8ToBin,
  binToBase64,
  base64ToBin,
  binToUtf8,
  hexToBin,
  stringify,
  decodeTransactionCommon,
  createVirtualMachineBch,
  deriveHdPublicKey,
  binsAreEqual,
  deriveHdPathRelative,
  decodeHdPrivateKey,
  compileScript,
  generateSigningSerializationComponentsBch,
  extractMissingVariables,
  extractResolvedVariableBytecodeMap,
  extractBytecodeResolutions,
  compilerOperationSigningSerializationFullBch,
  createIdentifierResolver,
  compileCashAssembly,
  decodeAuthenticationInstructions,
  compileScriptRaw,
  SigningSerializationAlgorithmIdentifier,
  SigningSerializationType,
  encodeTransactionInput,
  encodeTransactionOutput
} from 'bitauth-libauth-v3'

import { derivePublicKeys, getLockingBytecode, getCompiler, getLockingData, getWalletHash, MultisigWallet } from './wallet.js'
import { createTemplate } from './template.js'

export const SIGNING_PROGRESS = {
  UNSIGNED: 'unsigned',
  PARTIALLY_SIGNED: 'partially-signed',
  FULLY_SIGNED: 'fully-signed',
  TOO_MANY_SIGNATURES: 'too-many-signatures',
  INCONSISTENT: 'inconsistent'
}

export const transactionBinObjectsToUint8Array = (transactionObject) => {
  const transaction = structuredClone(transactionObject)
  transaction.inputs.forEach(input => {
    if (input.outpointTransactionHash && !(input?.outpointTransactionHash instanceof Uint8Array)) {
      input.outpointTransactionHash = Uint8Array.from(Object.values((input.outpointTransactionHash)))
    }
    if (input.unlockingBytecode && !(input?.unlockingBytecode instanceof Uint8Array)) {
      input.unlockingBytecode = Uint8Array.from(Object.values((input.unlockingBytecode)))
    }
    if (input.sourceOutput?.lockingBytecode && !(input.sourceOutput.lockingBytecode instanceof Uint8Array)) {
      input.sourceOutput.lockingBytecode = Uint8Array.from(Object.values((input.sourceOutput.lockingBytecode)))
    }
    if (input.sourceOutput?.outpointTransactionHash && !(input.sourceOutput.outpointTransactionHash instanceof Uint8Array)) {
      input.sourceOutput.outpointTransactionHash = Uint8Array.from(Object.values((input.sourceOutput.outpointTransactionHash)))
    }
  })

  transaction.outputs.forEach(output => {
    if (output.lockingBytecode && !(output?.lockingBytecode instanceof Uint8Array)) {
      output.lockingBytecode = Uint8Array.from(Object.values(output.lockingBytecode))
    }
    if (output.token?.category && !(output.token?.category instanceof Uint8Array)) {
      output.token.category = Uint8Array.from(Object.values(output.token.category))
    }

    if (output.token?.nft?.commitment && !(output.token.nft.commitment instanceof Uint8Array)) {
      output.token.nft.commitment = Uint8Array.from(Object.values(output.token.nft.commitment))
    }
  })

  return {
    version: transaction.version,
    locktime: transaction.locktime,
    inputs: transaction.inputs,
    outputs: transaction.outputs
  }
}

/**
 * Revives special types formatted by the stringify function:
 * - `<Uint8Array: 0x...>` → Uint8Array
 * - `<bigint: ...n>` → bigint
 * - `<function: ...>` → string representation (cannot fully reconstruct)
 * - `<symbol: ...>` → string representation (cannot fully reconstruct)
 *
 * @param { string } _ - Key
 * @param { any } value
 * @returns The reconstructed JavaScript value with proper types
 */
export const libauthStringifyReviver = (_, value) => {
  if (typeof value !== 'string') return value

  // Uint8Array pattern: "<Uint8Array: 0x...>"
  const uint8ArrayMatch = value.match(/^<Uint8Array: 0x([0-9a-f]+)>$/i)
  if (uint8ArrayMatch) {
    return hexToBin(uint8ArrayMatch[1])
  }

  // Uint8Array pattern: "<Uint8Array: 0x> (Empty Uint8Array)"
  const emptyUint8ArrayMatch = value.match(/^<Uint8Array: 0x>$/)
  if (emptyUint8ArrayMatch) {
    return new Uint8Array([])
  }

  // Bigint pattern: "<bigint: ...n>"
  const bigintMatch = value.match(/^<bigint: (-?\d+)n>$/)
  if (bigintMatch) {
    return BigInt(bigintMatch[1])
  }

  // Function pattern: "<function: ...>"
  const functionMatch = value.match(/^<function: (.+)>$/)
  if (functionMatch) {
    // Note: We can't reconstruct actual functions, just return the string representation
    return { type: 'function', value: functionMatch[1] }
  }

  // Symbol pattern: "<symbol: ...>"
  const symbolMatch = value.match(/^<symbol: (.+)>$/)
  if (symbolMatch) {
    // Note: We can't reconstruct actual symbols, just return the string representation
    return { type: 'symbol', value: symbolMatch[1] }
  }

  return value
}

export const libauthStringifyReviverExportable = (_, value) => {
  if (typeof value !== 'string') return value

  // Uint8Array pattern: "<Uint8Array: 0x...>"
  const uint8ArrayMatch = value.match(/^<Uint8Array: 0x([0-9a-f]+)>$/i)
  if (uint8ArrayMatch) {
    return uint8ArrayMatch[1]
  }

  // Uint8Array pattern: "<Uint8Array: 0x> (Empty Uint8Array)"
  const emptyUint8ArrayMatch = value.match(/^<Uint8Array: 0x>$/)
  if (emptyUint8ArrayMatch) {
    return new Uint8Array([])
  }

  // Bigint pattern: "<bigint: ...n>"
  const bigintMatch = value.match(/^<bigint: (-?\d+)n>$/)
  if (bigintMatch) {
    return `${bigintMatch[1]}`
  }

  // Function pattern: "<function: ...>"
  const functionMatch = value.match(/^<function: (.+)>$/)
  if (functionMatch) {
    // Note: We can't reconstruct actual functions, just return the string representation
    return { type: 'function', value: functionMatch[1] }
  }

  // Symbol pattern: "<symbol: ...>"
  const symbolMatch = value.match(/^<symbol: (.+)>$/)
  if (symbolMatch) {
    // Note: We can't reconstruct actual symbols, just return the string representation
    return { type: 'symbol', value: symbolMatch[1] }
  }

  return value
}

export const extractMValue = (redeemScript) => {
  let firstByte;

  if (typeof redeemScript === 'string') {
    // Hex string input - parse first byte (2 hex chars)
    if (redeemScript.length < 2) return null;
    firstByte = parseInt(redeemScript.slice(0, 2), 16);

  } else if (redeemScript instanceof Uint8Array) {
    // Uint8Array input - first byte directly
    if (redeemScript.length < 1) return null;
    firstByte = redeemScript[0];

  } else {
    // Unsupported type
    return null;
  }

  // OP_1 = 0x51 to OP_16 = 0x60
  if (firstByte >= 0x51 && firstByte <= 0x60) {
    return firstByte - 0x50;
  }

  return null; // Not a val
}

export const extractNValue = (redeemScript) => {
  if (redeemScript instanceof Uint8Array) {
    return parseInt(binToHex(redeemScript).slice(-4,-2, 16)) - 0x50
  }
  return parseInt(redeemScript.slice(-4,-2), 16) - 0x50
}

export const extractPublicKeys = (redeemScript) => {
  // Convert hex string to Uint8Array if needed
  const script = typeof redeemScript === 'string'
    ? Uint8Array.from(Buffer.from(redeemScript, 'hex'))
    : redeemScript;

  const publicKeys = [];
  let i = 0;

  // Skip OP_m (first byte)
  i++;

  while (i < script.length) {
    const opcode = script[i];

    // OP_n or OP_CHECKMULTISIG indicates end of pubkeys
    if (opcode >= 0x51 && opcode <= 0x60) break;
    if (opcode === 0xae) break; // OP_CHECKMULTISIG

    // PUSHDATA: next opcode is length of the pubkey
    const length = opcode;
    const pubkey = script.slice(i + 1, i + 1 + length);

    publicKeys.push(pubkey);
    i += 1 + length;
  }

  return publicKeys;
}

export const combine = (psts) => {
  const finalizedPst = psts.find(pst => pst.scriptSig)
  if (finalizedPst) return finalizedPst
  const sameUnsignedTransaction = psts.every(pst => pst.unsignedTransactionHex === psts[0].unsignedTransactionHex)
  if (!sameUnsignedTransaction) throw new Error('Combining different transactions')
  const sameMetadata = psts.every(pst => {
    return (
      psts[0].creator === pst.creator &&
      psts[0].origin === pst.origin && 
      psts[0].purpose === pst.purpose
    )
  })
  if (!sameMetadata) throw new Error('Conflicting metadata')

  let combinedInputs = psts.map(pst => pst.inputs).flat()
  const inputIndexAndTransactionHashSet = new Set()
  for (const input of combinedInputs) {

    if (inputIndexAndTransactionHashSet.has(`${input.outpointIndex}${binToHex(input.outpointTransactionHash)}`)) {
      continue
    }
    
    const encodedInput = encodeTransactionInput(input)
    const encodedSourceOutput = encodeTransactionOutput(input.sourceOutput)

    inputIndexAndTransactionHashSet.add(`${input.outpointIndex}${binToHex(input.outpointTransactionHash)}`)

    const combinedInputsMatchingCurrentInput = combinedInputs.filter(i => {
      return binsAreEqual(encodedInput, encodeTransactionInput(i))
    })

    if (combinedInputsMatchingCurrentInput.length > 1) {
      // make sure it's all the same
      const inputsMatched = combinedInputsMatchingCurrentInput.every(i => {
        return (
          binsAreEqual(encodedSourceOutput, encodeTransactionOutput(i.sourceOutput))
        )
      })
      if (!inputsMatched) {
        throw new Error('Conflicting inputs')
      }
    }
    
    const combinedPartialSignaturesOfCurrentInput = combinedInputsMatchingCurrentInput.map(i => i.partialSignatures).flat()

    const visitedPublicKeySet = new Set()

    for (const partialSignature of combinedPartialSignaturesOfCurrentInput) {
      if (visitedPublicKeySet.has(binToHex(partialSignature.publicKey))) continue
      // Make sure partial signature with matching public key has the same values
      const combinedPartialSignaturesOfCurrentInputWithPublicKey = combinedPartialSignaturesOfCurrentInput.filter(i => {
        return (binsAreEqual(i.publicKey, partialSignature.publicKey))
      })
      const partialSignaturesMatched = combinedPartialSignaturesOfCurrentInputWithPublicKey.every(ps => {
        return (
          binsAreEqual(partialSignature.sig, ps.sig) &&
          binsAreEqual(partialSignature.sigHash, ps.sigHash) &&
          partialSignature.publicKeyBip32DerivationPath === ps.publicKeyBip32DerivationPath &&
          partialSignature.sigAlgo === ps.sigAlgo 
        )
      })

      if (!partialSignaturesMatched) {
        throw new Error('Conflicting partial signatures')
      }

      const absorberPstInput = psts[0].inputs.find(i => {
        return binsAreEqual(encodedInput, encodeTransactionInput(i))
      })

      const partialSignatureToMergeExists = (absorberPstInput.partialSignatures || []).find((ps) => {
        return (
          binsAreEqual(ps.publicKey, partialSignature.publicKey)
        )
      })

      if(partialSignatureToMergeExists) continue
      absorberPstInput.partialSignatures.push(partialSignature)
    }
  }
  
  
  // combine
}

export const getSigningProgress = (pst) => {

  const transaction = decodeTransactionCommon(hexToBin(pst.unsignedTransactionHex))

  const inputSignatures = {} // [<index>]: <signature count>

  const inputCompilationContext = [] // { inputIndex, compiler, template, lockingData, unlockingData } 

  for (const inputIndex in transaction.inputs) {
    let correspondingInput = pst.inputs.find((i) => {
      // const parsed = JSON.parse(stringify(i), libauthStringifyReviver)
      return (
        Number(pst.inputs[inputIndex].outpointIndex) === Number(i.outpointIndex) &&
        binsAreEqual(pst.inputs[inputIndex].outpointTransactionHash, i.outpointTransactionHash) 
      )
    })

    const addressDerivationPath = correspondingInput.sourceOutput.addressPath || '0/0'
    const sortedSignersWithPublicKeys = derivePublicKeys({ signers: pst.wallet.signers, addressDerivationPath })
    const lockingData = getLockingData({ signers: pst.wallet.signers, addressDerivationPath })
    // const lockingData = {
    //   bytecode: {}
    // }
    
    // for (const index in sortedSignersWithPublicKeys) {
    //   let publicKey = sortedSignersWithPublicKeys[index].publicKey 
    //   if (typeof(publicKey) === 'string') {
    //     publicKey = hexToBin(publicKey)
    //   }
    //   lockingData.bytecode[`key${Number(index) + 1}.public_key`] = publicKey
    // }

    const template = createTemplate({ m: pst.wallet.m, signers: sortedSignersWithPublicKeys })
    const lockingBytecode = getLockingBytecode({ lockingData, template }) // lockingBytecode === lockingScript
    const compiler = getCompiler({ template })
    // Not our input continue
    if (!binsAreEqual(correspondingInput.sourceOutput.lockingBytecode, lockingBytecode.bytecode)) {
      continue
    }

    // const unlockingScriptIds = Object.keys(template.scripts).filter(scriptId => scriptId !== 'lock')

    // unlockingScriptIds.forEach((unlockingScriptId) => {
    //   const inputUnlockingData = {
    //     bytecode: {
    //       ...lockingData.bytecode
    //     }
    //   }
    const inputUnlockingData = {
      bytecode: {
        ...lockingData.bytecode
      }
    }
    for (const partialSignature of (pst.inputs[inputIndex].partialSignatures || [])) {
      const signingSerializationType = SigningSerializationType[parseInt(partialSignature.sigHash)]
      // const signingSerializationType = SigningSerializationType[(partialSignature.sigHash, 16)]
      const signingSerializationTypeAlgorithmIdentifier = SigningSerializationAlgorithmIdentifier[signingSerializationType]
      let sigVariable = 
        `key${partialSignature.publicKeyRedeemScriptSlot}.${partialSignature.sigAlgo}_signature.${signingSerializationTypeAlgorithmIdentifier}`
      inputUnlockingData.bytecode[sigVariable] = partialSignature.sig //hexToBin(partialSignature.sig)
    }

    //   console.log('UNLOCKING DATA', inputUnlockingData)
    //   transaction.inputs[inputIndex].unlockingBytecode = {
    //     compiler,
    //     data: inputUnlockingData,
    //     valueSatoshis: sourceOutput.valueSatoshis,
    //     script: unlockingScriptId,
    //     token: correspondingInput.sourceOutput.token
    //   }
    // })


    inputCompilationContext.push({
      inputIndex,
      compiler,
      inputUnlockingData
    })

    inputSignatures[inputIndex] = {
      signatureCount: (pst.inputs[inputIndex].partialSignatures || []).length,
      requiredSigs: pst.wallet.m
    }

    if (inputSignatures[inputIndex].signatureCount === 0) {
      inputSignatures[inputIndex].signingProgress = SIGNING_PROGRESS.UNSIGNED
    }
    
    if (inputSignatures[inputIndex].signatureCount < pst.wallet.m) {
      inputSignatures[inputIndex].signingProgress = SIGNING_PROGRESS.PARTIALLY_SIGNED
    }

    if (inputSignatures[inputIndex].signatureCount === pst.wallet.m) {
      inputSignatures[inputIndex].signingProgress = SIGNING_PROGRESS.FULLY_SIGNED
    }

    if (inputSignatures[inputIndex].signatureCount > pst.wallet.m) {
      inputSignatures[inputIndex].signingProgress = SIGNING_PROGRESS.TOO_MANY_SIGNATURES
    }
  } 

  if (Object.keys(inputSignatures).length === 0) {
    return {
      signingProgress: SIGNING_PROGRESS.UNSIGNED,
      signatureCount: 0,
      perInputSigningProgress: {}
    }
  }

  const [firstInputIndex, firstInputProgress] = Object.entries(inputSignatures)[0]

  const everyInputHasSameSignatureCount = Object.entries(inputSignatures).every(entry => {
    const [inputIndex, progress] = entry
    console.log('INPUT', inputIndex, progress)
    return firstInputProgress.signatureCount === progress.signatureCount
  })

  const signingProgress = {
    perInputSigningProgress: inputSignatures
  }

  if (everyInputHasSameSignatureCount) {
    signingProgress.signingProgress = firstInputProgress.signingProgress
    signingProgress.signatureCount = firstInputProgress.signatureCount
  } else {
    signingProgress.signingProgress = SIGNING_PROGRESS.INCONSISTENT
    signingProgress.signatureCount = Object.entries(inputSignatures).reduce((max, item) => {
      return item.signatureCount > max? item.signatureCount: max
    }, 0)

  }

  return signingProgress
}

export class Pst {

  /**
   * @param {PartiallySignedTransaction} instance
   */
  constructor(instance, options) {
    this.creator = instance.creator
    this.origin = instance.origin
    this.purpose = instance.purpose
    this.unsignedTransactionHex = instance.unsignedTransactionHex
    this.inputs = instance.inputs || []
    this.outputs = instance.outputs || []
    this.wallet = instance.wallet
    this.options = options
  }

  get unsignedTransactionHash () {
    if (!this.unsignedTransactionHex) {
      throw new Error('No unsigned transaction hex available')
    }
    return hashTransaction(hexToBin(this.unsignedTransactionHex))
  }

  _creatorIsCosigner(creator) {
    return // TODO VALIDATE THAT THE CREATOR IS ONE OF THE SIGNERS OF THE WALLET å
  }

  addInput(input) {
    this.inputs.push(input)
  }

  addOutput(output) {
    this.outputs.push(output)
  }

  sign(xprv) {
    const { hdPublicKey: xpub } = deriveHdPublicKey(xprv)
    let signer = this.wallet.signers.find(signer => signer.xpub === xpub)
  
    if (!signer) {
      throw new Error('Private key provided does not match any signer')
    }

    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))

    for (const input of transaction.inputs) {
      let correspondingInput = this.inputs.find((i) => {
        return (
          Number(input.outpointIndex) === Number(i.outpointIndex) &&
          binsAreEqual(input.outpointTransactionHash, i.outpointTransactionHash) 
        )
      })

      const addressDerivationPath = correspondingInput.sourceOutput?.addressPath || '0/0'
      const sortedSignersWithPublicKeys = derivePublicKeys({ signers: this.wallet.signers, addressDerivationPath })
      const lockingData = {
        bytecode: {}
      }
      for (const index in sortedSignersWithPublicKeys) {
        let publicKey = sortedSignersWithPublicKeys[index].publicKey 
        if (typeof(publicKey) === 'string') {
          publicKey = hexToBin(publicKey)
        }
        lockingData.bytecode[`key${Number(index) + 1}.public_key`] = publicKey
      }

      const template = createTemplate({ m: this.wallet.m, signers: sortedSignersWithPublicKeys })
      const lockingBytecode = getLockingBytecode({ lockingData, template }) // lockingBytecode === lockingScript

      // Not our input continue
      if (!binsAreEqual(correspondingInput.sourceOutput.lockingBytecode, lockingBytecode.bytecode)) {
        continue
      }

      const compiler = getCompiler({ template })
      const decodedHdPrivateKey = decodeHdPrivateKey(xprv)
      const { privateKey } = deriveHdPathRelative(decodedHdPrivateKey.node, addressDerivationPath)
        // Determine the position of the signer on the locking script, sortedSignersWit... is already sorted
        // so signer position is implicit using this method
      const signerIndex = sortedSignersWithPublicKeys.findIndex(s => s.xpub === signer.xpub)
      // Remember signer so we can include it on the signature output
      signer = sortedSignersWithPublicKeys[signerIndex]

      const sourceOutputUnlockingData = {
        ...lockingData,
        keys: {
          privateKeys: {
            [`key${signerIndex + 1}`]: privateKey
          }
        }
      }
      // Select the unlocking script based on this output specific wallet template
      const unlockingScriptId = template.entities[`signer_${signerIndex + 1}`].scripts.filter((scriptId) => scriptId !== 'lock')[0]
      input.unlockingBytecode = {
        compiler,
        data: sourceOutputUnlockingData,
        valueSatoshis: BigInt(correspondingInput.sourceOutput.valueSatoshis),
        script: unlockingScriptId,
        token: correspondingInput.sourceOutput.token,
      }

      if (!correspondingInput.partialSignatures) {
        correspondingInput.partialSignatures = []
      }
    } // end for

    
    const signAttempt = generateTransaction({ ...transaction })
    if (signAttempt.success) return
    for (const [inputIndex, error] of Object.entries(signAttempt?.errors || {})) {
      const signerResolvedVariables = extractResolvedVariables({ ...signAttempt, errors: [error] })
      const value = Object.values(signerResolvedVariables)[0]
      const sigVariable = Object.keys(signerResolvedVariables)[0] 
      const inputUnlockingBytecode = transaction.inputs[inputIndex].unlockingBytecode

      const script = compileScript('lock', inputUnlockingBytecode.data, inputUnlockingBytecode.compiler.configuration)
      const lockingScript = script.bytecode
      const redeemScript = script.reduce.bytecode
      const keyVariable = `${Object.keys(inputUnlockingBytecode.data.keys.privateKeys)[0]}.public_key`
      const signatureExists = this.inputs[inputIndex]?.partialSignatures.find((partialSignature) => {
        return Boolean(partialSignature[sigVariable])
      })

      if (signatureExists) continue
      const sigVariableRedeemScriptSlot = sigVariable.split('.')[0].replace('key', '')
      let sigSlot = 
        transaction.inputs[inputIndex].unlockingBytecode.script
          .split('_and_')
          .findIndex(slot => slot === sigVariableRedeemScriptSlot) + 1
      
      this.inputs[inputIndex].redeemScript = redeemScript
      this.inputs[inputIndex].scriptPubKey = lockingScript
      this.inputs[inputIndex].partialSignatures.push({
        // publicKeyVariable: keyVariable,
        publicKey: inputUnlockingBytecode.data.bytecode[keyVariable],
        publicKeyBip32DerivationPath: this.inputs[inputIndex].sourceOutput.addressPath || '0/0',
        publicKeyRedeemScriptSlot: Number(keyVariable.split('.')[0].replace('key','')),
        signer: signer.name,
        sigHash: value.slice(-1),
        sigAlgo: sigVariable.split('.')[1].split('_')[0],
        sigSlot: Number(sigSlot),
        sig: value
      })
    }
    return 
  }

  signerSigned(xpub) {
    
    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))

    const allInputsAreSigned = []

    for (const input of transaction.inputs) {
      let correspondingInput = this.inputs.find((i) => {
        // const parsed = JSON.parse(stringify(i), libauthStringifyReviver)
        return (
          Number(input.outpointIndex) === Number(i.outpointIndex) &&
          binsAreEqual(input.outpointTransactionHash, i.outpointTransactionHash) 
        )
      })

      correspondingInput.sourceOutput = JSON.parse(stringify(correspondingInput.sourceOutput), libauthStringifyReviver)
      const addressDerivationPath = correspondingInput.sourceOutput.addressPath || '0/0'
      const sortedSignersWithPublicKeys = derivePublicKeys({ signers: this.wallet.signers, addressDerivationPath })
      const lockingData = {
        bytecode: {}
      }
      for (const index in sortedSignersWithPublicKeys) {
        let publicKey = sortedSignersWithPublicKeys[index].publicKey 
        if (typeof(publicKey) === 'string') {
          publicKey = hexToBin(publicKey)
        }
        lockingData.bytecode[`key${Number(index) + 1}.public_key`] = publicKey
      }

      const template = createTemplate({ m: this.wallet.m, signers: sortedSignersWithPublicKeys })
      const lockingBytecode = getLockingBytecode({ lockingData, template }) // lockingBytecode === lockingScript

      // Not our input continue
      if (!binsAreEqual(correspondingInput.sourceOutput.lockingBytecode, lockingBytecode.bytecode)) {
        continue
      }

      const targetSigner = sortedSignersWithPublicKeys.find(s => s.xpub === xpub)
      const partialSigOfTargetSignerFound = correspondingInput.partialSignatures.find(p => {
        let targetSignerPublicKey = targetSigner.publicKey
        if (typeof (targetSignerPublicKey === 'string')) {
          targetSignerPublicKey = hexToBin(targetSignerPublicKey)
        }
        return binsAreEqual(p.publicKey, targetSignerPublicKey) && p.sig
      })

      allInputsAreSigned.push(
        Boolean(partialSigOfTargetSignerFound)
      )

    }

    return allInputsAreSigned.every(isSigned => isSigned)
  }

  finalize () {
    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))
    for (const inputIndex in transaction.inputs) {
        let correspondingInput = this.inputs.find((i) => {
          // const parsed = JSON.parse(stringify(i), libauthStringifyReviver)
          return (
            Number(transaction.inputs[inputIndex].outpointIndex) === Number(i.outpointIndex) &&
            binsAreEqual(transaction.inputs[inputIndex].outpointTransactionHash, i.outpointTransactionHash) 
          )
        })
        // correspondingInput.sourceOutput = JSON.parse(stringify(correspondingInput.sourceOutput), libauthStringifyReviver)
        const inputUnlockingData = {
          bytecode: {}
        }
        const publicKeys = extractPublicKeys(this.inputs[inputIndex].redeemScript)
        for (const publicKeyIndex in publicKeys ) {
          inputUnlockingData.bytecode[`key${Number(publicKeyIndex) + 1}.public_key`] = publicKeys[publicKeyIndex]
        }
        let publicKeyRedeemScriptSlots = []
        for (const partialSignature of this.inputs[inputIndex].partialSignatures) {
          const signingSerializationType = SigningSerializationType[parseInt(partialSignature.sigHash)]
          // const signingSerializationType = SigningSerializationType[(partialSignature.sigHash, 16)]
          const signingSerializationTypeAlgorithmIdentifier = SigningSerializationAlgorithmIdentifier[signingSerializationType]
          let sigVariable = 
            `key${partialSignature.publicKeyRedeemScriptSlot}.${partialSignature.sigAlgo}_signature.${signingSerializationTypeAlgorithmIdentifier}`
          inputUnlockingData.bytecode[sigVariable] = partialSignature.sig //hexToBin(partialSignature.sig)
          // let publicKeyRedeemScriptSlot = publicKeys.findIndex(p => binToHex(p) === partialSignature.publicKey) + 1
          let publicKeyRedeemScriptSlot = publicKeys.findIndex(p =>binsAreEqual(p, partialSignature.publicKey)) + 1
          publicKeyRedeemScriptSlots.push(publicKeyRedeemScriptSlot)
        }
        
        const unlockingScriptId = publicKeyRedeemScriptSlots.join('_and_')
        const m = extractMValue(this.inputs[inputIndex].redeemScript)
        const template = createTemplate({ m, signers: publicKeys.map(p => ({ publicKey: p })) })
        const compiler = getCompiler({ template })

        transaction.inputs[inputIndex].unlockingBytecode = {
          compiler,
          data: inputUnlockingData,
          valueSatoshis: BigInt(correspondingInput.sourceOutput.valueSatoshis),
          script: unlockingScriptId,
          token: correspondingInput.sourceOutput.token
        }
        const script = compileScript(unlockingScriptId, inputUnlockingData, compiler.configuration)
        this.inputs[inputIndex].scriptSig = script.bytecode //binToHex(script.bytecode)
    } 

    const finalCompilation = generateTransaction({ ...transaction })
    this.finalCompilation = finalCompilation
    if (finalCompilation.success) {
      const encodedTransaction = encodeTransactionCommon(finalCompilation.transaction)
      this.signedTransactionHex = binToHex(encodedTransaction)
      this.signedTransactionHash = hashTransaction(encodedTransaction)
      const vm = createVirtualMachineBch()
      const verificationResult = vm.verify({
        sourceOutputs: this.inputs.map(i => i.sourceOutput), transaction: finalCompilation.transaction
      })
      this.vmVerificationSuccess = verificationResult
    }
  }

  combine(psts) {
    return combine([this, ...psts])
  }

  getSignatureCount() {
    return getSignatureCount(this)
  }

  getSigningProgress() {
    return getSigningProgress(this)
  }

  toJSON() {
   
    const data = {
      creator: this.creator,
      origin: this.origin,
      purpose: this.purpose,
      unsignedTransactionHex: this.unsignedTransactionHex,
      inputs: this.inputs,
      wallet: this.wallet,
      walletHash: getWalletHash(this.wallet)
    }

    if (this.signedTransactionHash) {
      data.signedTransactionHash = this.signedTransactionHash
    }

    if (this.signedTransactionHex) {
      data.signedTransactionHex = this.signedTransactionHex
    }

    if (this.outputs?.length > 0) {
      data.outputs = this.outputs
    }

    return JSON.parse(stringify(data))
  }

  async delete() {
    if (!this.options?.store) return
    return await this.options.store.dispatch('multisig/deletePst', { pst: this, sync: false })
  }

  /**
   * @param {boolean} [sync=false] - If true, syncs the pst to the relay server.
   */
  async save(sync) {
    if (!this.options?.store) return
    return await this.options.store.dispatch('multisig/savePst', { pst: this, sync })
  }

  static fromObject(pst, options) {
    if (pst instanceof Pst) return pst
    const p = new Pst(JSON.parse(stringify(pst), libauthStringifyReviver), options)
    if (p.wallet) {
      p.wallet = MultisigWallet.fromObject(p.wallet)
    }
    return p
  }

  /**
   * @param {object} data
   * @param {object} data.sessionRequest - The wallet connect session request (Example: bch_signTransaction) object.
   * @param {number} data.addressIndex - The bip32 relative path index of the external address used on the wallet connect session.
   * @param {string} [data.creatorXpub] - The xpub of the creator
   * @param {string} data.wallet - The multisig wallet
   */
  static fromWcSessionRequest({ sessionRequest, wallet }) {
    // const address =
    //     sessionRequest.session.namespaces.bch.accounts[0].replace('bch:', '')
    const inputMap = sessionRequest.params?.request?.params?.transaction?.inputs?.map((input) => {
      const preparedInput = {
        ...input,
        outpointTransactionHash: Uint8Array.from(Object.values(input.outpointTransactionHash))
      }
      if (input.sourceOutput) {
        preparedInput.sourceOutput = {
          ...input.sourceOutput,
          outpointTransactionHash: Uint8Array.from(Object.values(input.sourceOutput.outpointTransactionHash)),
          lockingBytecode: input.sourceOutput.lockingBytecode? Uint8Array.from(Object.values(input.sourceOutput.outpointTransactionHash)): Uint8Array.from([])
        }
      }
    })

    const pst = new Pst({
      origin: sessionRequest.verifyContext?.verified?.origin,
      purpose: sessionRequest.params?.request?.params?.userPrompt,
      inputs: inputMap,
      wallet
    })
      
    return pst
  }

}

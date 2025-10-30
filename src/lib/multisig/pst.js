/// <reference path="./wallet.js" />
/// <reference path="./network.js" />
/// <reference path="./utxo.js" />

/**
   * @typedef {Object} PartialSignature
   * @property {Uint8Array} publicKey - The signer's public key (as bytecode).
   * @property {string} publicKeyRelativePath - BIP32 derivation path (e.g., "0/0").
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
   * @property {string} [lockingBytecodeRelativePath] - Optional derivation path (e.g., "0/0").
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
   * @property {string} origin - The origin of the proposal.
   * @property {string} purpose - Purpose or description of the proposal.
   * @property {Network} [network='mainnet']
   * @property {string} unsignedTransactionHex - Unsigned raw transaction in hex.
   * @property {Input[]} [inputs] - Input map
   * @property {Output[]} [outputs] - Output map
   * @property {MultisigWallet} wallet - Associated wallet object.
   */

  /**
   * @typedef {Object} PartiallySignedTransactionOptions
   * @property {OnStateChangeCallback} onStateChange
   * @property {NetworkProvider} provider
   * @property {CoordinationServer} coordinationServer
   * @property {Network} [network='mainnet']
   * @property {Object} [store] - Optional Vuex-style store.
   * @property {(type: string, payload?: any) => Promise<any>} [store.dispatch]
   * @property {(type: string, payload?: any) => void} [store.commit]
   * @property {Object.<string, any>} [store.state]
   * @property {Object.<string, any>} [store.getters]
   * 
   */


import {
  encodeTransactionCommon,
  hashTransaction,
  generateTransaction,
  binToHex,
  extractResolvedVariables,
  hexToBin,
  stringify,
  decodeTransactionCommon,
  createVirtualMachineBch,
  deriveHdPublicKey,
  binsAreEqual,
  deriveHdPathRelative,
  decodeHdPrivateKey,
  compileScript,
  SigningSerializationAlgorithmIdentifier,
  SigningSerializationType,
  encodeTransactionInput,
  encodeTransactionOutput,
  stringifyTestVector,
  utf8ToBin,
  binToBase64,
  base64ToBin,
  binToUtf8,
  readTransactionOutput,
  isHex,
  hash256,
  hash160,
  encodeLockingBytecodeP2sh20,
  decodeHdPublicKey
} from 'bitauth-libauth-v3'

import { derivePublicKeys, getLockingBytecode, getCompiler, getLockingData, getWalletHash, MultisigWallet, sortPublicKeysBip67 } from './wallet.js'
import { createTemplate } from './template.js'
import { extractBip32RelativePath } from './utils.js'

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
    
    const combinedPartialSignaturesOfCurrentInput = combinedInputsMatchingCurrentInput.map(i => i.signatures)

    for (const partialSignaturesOfInput of combinedPartialSignaturesOfCurrentInput) {
      for (const publicKeyOfPartialSignature of Object.keys(partialSignaturesOfInput)) {
        const absorberPstInput = psts[0].inputs.find(i => {
          return binsAreEqual(encodedInput, encodeTransactionInput(i))
        })
        if (Object.keys(absorberPstInput.signatures || {}).length === 0) {
          absorberPstInput.signatures = {
            [publicKeyOfPartialSignature]: partialSignaturesOfInput[publicKeyOfPartialSignature]
          }
          continue
        }
        // If signature is already present for a public key, make sure all signatures are the same
        if (absorberPstInput.signatures[publicKeyOfPartialSignature] && 
          !binsAreEqual(absorberPstInput.signatures[publicKeyOfPartialSignature], partialSignaturesOfInput[publicKeyOfPartialSignature])) {
          throw new Error(`Conflicting signature for ${publicKeyOfPartialSignature}`)
        }
        absorberPstInput.signatures[publicKeyOfPartialSignature] = partialSignaturesOfInput[publicKeyOfPartialSignature]
      }

    }
  }
  
  return psts[0]
}

export const getSigningProgress = (pst) => {

  const transaction = decodeTransactionCommon(hexToBin(pst.unsignedTransactionHex))

  const inputSignatures = {} 

  for (const inputIndex in transaction.inputs) {
    let correspondingInput = pst.inputs.find((i) => {
      return (
        Number(pst.inputs[inputIndex].outpointIndex) === Number(i.outpointIndex) &&
        binsAreEqual(pst.inputs[inputIndex].outpointTransactionHash, i.outpointTransactionHash) 
      )
    })

    if (!correspondingInput) continue
    const lockingBytecode = encodeLockingBytecodeP2sh20(hash160(correspondingInput.redeemScript))

    // Not our input continue
    if (!binsAreEqual(correspondingInput.sourceOutput.lockingBytecode, lockingBytecode)) {
      continue
    }

    const redeemScriptPublicKeys = extractPublicKeys(pst.inputs[inputIndex].redeemScript)

    const m = extractMValue(correspondingInput.redeemScript)

    for (const redeemScriptPublicKey of redeemScriptPublicKeys) {
      if (!inputSignatures[inputIndex]) {
        inputSignatures[inputIndex] = {
          signatureCount: 0,
          requiredSigs: m
        }
      }

      if (correspondingInput.signatures?.[binToHex(redeemScriptPublicKey)]) {
        inputSignatures[inputIndex].signatureCount++
      }
    }

    if (inputSignatures[inputIndex].signatureCount === 0) {
      inputSignatures[inputIndex].signingProgress = SIGNING_PROGRESS.UNSIGNED
    }
    
    if (inputSignatures[inputIndex].signatureCount > 0 && inputSignatures[inputIndex].signatureCount < m) {
      inputSignatures[inputIndex].signingProgress = SIGNING_PROGRESS.PARTIALLY_SIGNED
    }

    if (inputSignatures[inputIndex].signatureCount === m) {
      inputSignatures[inputIndex].signingProgress = SIGNING_PROGRESS.FULLY_SIGNED
    }

    if (inputSignatures[inputIndex].signatureCount > m) {
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

/**
 * Check's if public key has signature
 * @param {Object} param
 * @param {Uint8Array} param.publicKey
 * @param {Pst} param.pst 
 */
export const publicKeySigned = ({ publicKey, pst }) => {

    const transaction = decodeTransactionCommon(hexToBin(pst.unsignedTransactionHex))

    const allInputsAreSigned = []

    const inputList = structuredClone(pst.inputs)
    for (const input of transaction.inputs) {
      let correspondingInput = inputList.find((i) => {
        return (
          Number(input.outpointIndex) === Number(i.outpointIndex) &&
          binsAreEqual(input.outpointTransactionHash, i.outpointTransactionHash) 
        )
      })

      if (!correspondingInput) {
        continue
      }

      const lockingBytecode = encodeLockingBytecodeP2sh20(hash160(correspondingInput.redeemScript))

      // Not our input continue
      if (!binsAreEqual(correspondingInput.sourceOutput.lockingBytecode, lockingBytecode)) {
        continue
      }

      correspondingInput.sourceOutput = JSON.parse(stringify(correspondingInput.sourceOutput), libauthStringifyReviver)
      
      const publicKeysFromRedeemScript = extractPublicKeys(correspondingInput.redeemScript)
      
      const publicKeyIsOnRedeemScript = publicKeysFromRedeemScript.some((p) => {
        return binsAreEqual(publicKey, p) 
      })

      if (!publicKeyIsOnRedeemScript) continue

      allInputsAreSigned.push(Boolean(correspondingInput.signatures?.[binToHex(publicKey)]))

    }

    if (!allInputsAreSigned.length) return false

    return allInputsAreSigned.every(isSigned => isSigned)
}

/**
 * Encode a BIP32 derivation path string (e.g. "m/44'/145'/0'/0/5")
 * into a Uint8Array of 32-bit little-endian integers. The derivation 
 * path is represented as 32 bit unsigned integer indexes concatenated 
 * with each other.
 */
export function encodeDerivationPath(path) {
  if (!path.startsWith("m/")) {
    throw new Error("Path must start with 'm/'");
  }

  const elements = path
    .slice(2)
    .split("/")
    .filter(Boolean);

  const bytes = new Uint8Array(elements.length * 4);
  const view = new DataView(bytes.buffer);

  elements.forEach((el, i) => {
    const hardened = el.endsWith("'");
    const index = parseInt(el.replace("'", ""), 10);
    const value = hardened ? index + 0x80000000 : index;
    view.setUint32(i * 4, value, true); // little-endian
  });

  return bytes;
}

/**
 * Decode a Uint8Array of 32-bit little-endian integers
 * back into a BIP32 path string (e.g. "m/44'/145'/0'/0/5").
 */
export function decodeDerivationPath(bytes) {
  if (bytes.length % 4 !== 0) {
    throw new Error("Invalid derivation path bytes");
  }

  const view = new DataView(bytes.buffer);
  const elements = [];

  for (let i = 0; i < bytes.length; i += 4) {
    const value = view.getUint32(i, true); // little-endian
    const hardened = value >= 0x80000000;
    const index = hardened ? value - 0x80000000 : value;
    elements.push(hardened ? `${index}'` : `${index}`);
  }

  return "m/" + elements.join("/");
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
    this.walletHash = instance.walletHash
    if (instance.wallet) {
      this.wallet = instance.wallet
    }
    if (instance.isSynced) {
      this.isSynced = instance.isSynced
    }
    if (options) {
      this.options = options
    }
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

      const addressDerivationPath = correspondingInput.lockingBytecodeRelativePath
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

    } // end for

    
    const signAttempt = generateTransaction({ ...transaction })
    
    if (signAttempt.success) return

    for (const [inputIndex, error] of Object.entries(signAttempt?.errors || {})) {
      const signerResolvedVariables = extractResolvedVariables({ ...signAttempt, errors: [error] })
      const sigValue = Object.values(signerResolvedVariables)[0]
      const inputUnlockingBytecode = transaction.inputs[inputIndex].unlockingBytecode

      const script = compileScript('lock', inputUnlockingBytecode.data, inputUnlockingBytecode.compiler.configuration)
      // const lockingScript = script.bytecode
      const redeemScript = script.reduce.bytecode
      const keyVariable = `${Object.keys(inputUnlockingBytecode.data.keys.privateKeys)[0]}.public_key`
      this.inputs[inputIndex].redeemScript = redeemScript

      if (!this.inputs[inputIndex].signatures) {
        this.inputs[inputIndex].signatures = {}
      }

      const signerPublicKeyForThisInput = binToHex(inputUnlockingBytecode.data.bytecode[keyVariable])
      this.inputs[inputIndex].signatures[signerPublicKeyForThisInput] = sigValue

      if (this.options?.store) {
        // TODO: upload
        this.options.store.commit('multisig/addPstSignature', { pst: this, inputIndex, publicKey: signerPublicKeyForThisInput, sigValue: binToHex(sigValue) })
      }
    }
    return 
  }

  signerSigned(xpub) {
    
    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))

    const allInputsAreSigned = []
    const inputList = structuredClone(this.inputs)
    for (const input of transaction.inputs) {
      let correspondingInput = inputList.find((i) => {
        return (
          Number(input.outpointIndex) === Number(i.outpointIndex) &&
          binsAreEqual(input.outpointTransactionHash, i.outpointTransactionHash) 
        )
      })

      if (!correspondingInput?.redeemScript) {
        continue
      }
      
      const publicKeysFromRedeemScript = extractPublicKeys(correspondingInput.redeemScript)
      
      const publicKeyDerivedFromXpubForThisInput = publicKeysFromRedeemScript.find((p) => {
        const decodedHdPublicKey = decodeHdPublicKey(xpub)
        const { publicKey } = deriveHdPathRelative(
          decodedHdPublicKey.node, 
          extractBip32RelativePath(correspondingInput.bip32Derivation[binToHex(p)].path)
        )
        return binsAreEqual(publicKey, p) 
      })

      allInputsAreSigned.push(
        publicKeySigned({ publicKey: publicKeyDerivedFromXpubForThisInput, pst: this })
      )

    }

    if (!allInputsAreSigned.length) return false

    return allInputsAreSigned.every(isSigned => isSigned)
  }
  
  signerMasterFingerprintSigned(masterFingerprint) {
    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))
    const allInputsAreSigned = []
    const inputList = structuredClone(this.inputs)
    for (const input of transaction.inputs) {
  
      let correspondingInput = inputList.find((i) => {
        return (
          Number(input.outpointIndex) === Number(i.outpointIndex) &&
          binsAreEqual(input.outpointTransactionHash, i.outpointTransactionHash) 
        )
      })

      if (!correspondingInput) {
        continue
      }

      if (!correspondingInput.redeemScript) continue 
      if (!correspondingInput.signatures) continue
      const lockingBytecode = encodeLockingBytecodeP2sh20(hash160(correspondingInput.redeemScript))
      correspondingInput.sourceOutput = JSON.parse(stringify(correspondingInput.sourceOutput), libauthStringifyReviver)

      // Not our input continue
      if (!binsAreEqual(correspondingInput.sourceOutput.lockingBytecode, lockingBytecode)) {
        continue
      }
      let targetSignerPublicKeyForThisInput = Object.entries(correspondingInput.bip32Derivation).find(entry => {
        const value = entry[1]
        return value.masterFingerprint === masterFingerprint
      })?.[0] 

      if (!targetSignerPublicKeyForThisInput) continue 
      allInputsAreSigned.push(Boolean(correspondingInput.signatures[targetSignerPublicKeyForThisInput]))
    }

    if (!allInputsAreSigned.length) return false
    
    return allInputsAreSigned.every(isSigned => isSigned)
  }

  finalize () {
    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))
    for (const inputIndex in transaction.inputs) {
        let correspondingInput = this.inputs.find((i) => {
          return (
            Number(transaction.inputs[inputIndex].outpointIndex) === Number(i.outpointIndex) &&
            binsAreEqual(transaction.inputs[inputIndex].outpointTransactionHash, i.outpointTransactionHash) 
          )
        })
        const inputUnlockingData = {
          bytecode: {}
        }
        const publicKeys = extractPublicKeys(this.inputs[inputIndex].redeemScript)
        for (const publicKeyIndex in publicKeys ) {
          inputUnlockingData.bytecode[`key${Number(publicKeyIndex) + 1}.public_key`] = publicKeys[publicKeyIndex]
        }

        let publicKeyRedeemScriptSlots = []

        for (const partialSignature of Object.entries(this.inputs[inputIndex].signatures || {})) {
          const publicKeyOfSigner = partialSignature[0]
          const signatureValue = partialSignature[1]
          const sigHash = signatureValue.slice(-1)[0]
          const signingSerializationType = SigningSerializationType[sigHash]
          const signingSerializationTypeAlgorithmIdentifier = SigningSerializationAlgorithmIdentifier[signingSerializationType]

          let publicKeyRedeemScriptSlot = publicKeys.findIndex(p =>binsAreEqual(p, hexToBin(publicKeyOfSigner)))
          if (publicKeyRedeemScriptSlot === -1) throw new Error('Signature key not found on redeem script')

          let sigVariable = 
            `key${publicKeyRedeemScriptSlot + 1}.schnorr_signature.${signingSerializationTypeAlgorithmIdentifier}`
          inputUnlockingData.bytecode[sigVariable] = signatureValue //hexToBin(partialSignature.sig)
          publicKeyRedeemScriptSlots.push(publicKeyRedeemScriptSlot + 1)
        }
        
        const unlockingScriptId = publicKeyRedeemScriptSlots.sort().join('_and_')
        const m = extractMValue(this.inputs[inputIndex].redeemScript)
        const template = createTemplate({ m, signers: publicKeys.map(p => ({ publicKey: p })) })
        const compiler = getCompiler({ template })

        transaction.inputs[inputIndex].unlockingBytecode = {
          compiler,
          data: inputUnlockingData,
          valueSatoshis: BigInt(correspondingInput.sourceOutput.valueSatoshis),
          script: unlockingScriptId,
          token: correspondingInput.sourceOutput?.token
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
    console.log('FINAL COMPLIATON', { finalCompilationResult: finalCompilation, vmVerificationSuccess: this.vmVerificationSuccess })
    return { finalCompilationResult: finalCompilation, vmVerificationSuccess: this.vmVerificationSuccess }
  }

  async broadcast() {

    if (!this.signedTransactionHex) {
      this.finalize()
    }

    if (!this.signedTransactionHex) {
      throw new Error('No signed transaction hex available')  
    }

    const result = await this.options?.provider?.broadcastTransaction(this.signedTransactionHex)

    this.broadcastResult = result?.data

    await this.options?.store?.dispatch('multisig/updateBroadcastResult', { pst: this, broadcastResult: this.broadcastResult })

    return result
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

  getTotalInputSatoshis() {
    return this.inputs.reduce((total, input) => {
      return total + Number(input.sourceOutput.valueSatoshis)
    }, 0)
  }

  getTotalOutputSatoshis() {
    let total = 0
    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))
    for (const output of transaction.outputs) {
      total += Number(output.valueSatoshis)
    }
    return total        
  }

  getFeeSatoshis() {
    return this.getTotalInputSatoshis() - this.getTotalOutputSatoshis()
  }

  getTotalDebitSatoshis() {
    return this.getTotalInputSatoshis() - this.getTotalChangeSatoshis() - this.getFeeSatoshis()
  }

  getTotalChangeSatoshis() {
    let total = 0
    const transaction = decodeTransactionCommon(hexToBin(this.unsignedTransactionHex))
    for (const index in this.outputs) {
      if (this.outputs[index].lockingBytecodeRelativePath) {
        total += Number(transaction.outputs[index].valueSatoshis)
      }
    }
    return total
  }

  toJSON() {
    const data = {
      origin: this.origin,
      purpose: this.purpose,
      unsignedTransactionHex: this.unsignedTransactionHex,
      inputs: this.inputs,
      outputs: this.outputs,
      walletHash: getWalletHash(this.wallet),
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

    return JSON.parse(JSON.stringify(data, Pst.exportSafeJSONReplacer))
  }

  export (format = 'base64') {
    if (format !== 'base64') {
      throw new Error(`${format} not yet supported`)
    }

    return binToBase64(utf8ToBin(JSON.stringify(this.toJSON())))
  }

  static import (pstExportFormat, options, format = 'base64') {
    if (format !== 'base64') {
      throw new Error(`${format} not yet supported`)
    }

    const pstImportData = JSON.parse(binToUtf8(base64ToBin(pstExportFormat)), Pst.importSafeJSONReviver)
    return new Pst(pstImportData, options)
    
  }

  async delete({ sync = false } = {}) {
    if (!this.options?.store) return
    return await this.options.store.dispatch('multisig/deletePst', { pst: this, sync })
  }

  /**
   * @param {boolean} [sync=false] - If true, syncs the pst to the relay server.
   */
  async save(sync) {
    if (!this.options?.store) return
    return await this.options.store.commit('multisig/savePst', this.toJSON())
  }

  async upload() {
    
    if (!this.options?.coordinationServer) return
    
    const remotePst = await this.options?.coordinationServer?.uploadPst(this)
    
    
    if (!remotePst?.id || !(/^[0-9]+$/.test(remotePst.id))) {
      this.isSynced = false
      return
    }

    this.isSynced = true
    
    if (!this.updatedAt) {
      Object.assign(this, remotePst)
      this.save()
      return this
    }

    if (new Date(remotePst.updatedAt) > new Date(this.updatedAt)) {
      Object.assign(this, remotePst)
      this.save()
    }
    
    return this
    
  }

  static fromObject(pst, options) {
    if (pst instanceof Pst) return pst
    const p = new Pst(JSON.parse(JSON.stringify(pst, Pst.exportSafeJSONReplacer), Pst.importSafeJSONReviver), options)
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

  /**
   * Converts some pst values to exportable json safe format.
   * Binary -> hex, bigint -> string
   * 
   * @return {Object} pst
   */
  static exportSafeJSONReplacer(k, v) {
    const binaryKeys = new Set([
      'outpointTransactionHash',
      'publicKey',
      'sig',
      'sigHash',
      'redeemScript',
      'lockingBytecode',
      'unlockingBytecode',
      'commitment',
      'capability',
      'category',
    ]);
    
    const bigintKeys = new Set([
      'valueSatoshis',
      'amount'
    ]);

    if (k === 'sourceOutput' || k === 'utxo') {
      if (v && isHex(v)) return v
      // encode
      return binToHex(
        encodeTransactionOutput(
          JSON.parse(JSON.stringify(v, Pst.exportSafeJSONReplacer), Pst.importSafeJSONReviver)
        )
      )
    }

    if (k === 'signatures') {
      const publicKeys = Object.keys(v || {})
      // Convert signatures to hex
      for (const p of publicKeys) {
        if (v[p] && v[p] instanceof Uint8Array) {
          v[p] = binToHex(v[p])
        }
      }
    }

    if (binaryKeys.has(k) && typeof v !== 'string') {
      return binToHex(Uint8Array.from(Object.values(v)))
    }
    
    if (bigintKeys.has(k) && typeof v !== 'string') {
      return value.toString();
    }    
    
    return v
  }

  /**
   * A JSON reviver that converts
   * hex -> binary , string -> bigint (for keys that's expected to be bigint)
   * 
   * @return {Object} pst
   */
  static importSafeJSONReviver(k, v) {
    const binaryKeys = new Set([
      'outpointTransactionHash',
      'publicKey',
      'sig',
      'sigHash',
      'redeemScript',
      'lockingBytecode',
      'unlockingBytecode',
      'commitment',
      'capability',
      'category',
    ]);
    
    const bigintKeys = new Set([
      'valueSatoshis',
      'amount'
    ]);

    
    if (binaryKeys.has(k) && !(v instanceof Uint8Array)) {
      return hexToBin(v)
    }

    if (k === 'signatures') {
      const publicKeys = Object.keys(v || {})
      // Convert signatures to hex
      for (const p of publicKeys) {
        if (v[p] && isHex(v[p])) {
          v[p] = hexToBin(v[p])
        }
      }
    }
    
    if (bigintKeys.has(k)) {
      return BigInt(v ?? 0)
    }

    if (k === 'sourceOutput' || k === 'utxo') {
      if (isHex(v)) {
        const { result } = readTransactionOutput({ bin: hexToBin(v), index: 0 })
        return result
      }
    }

    
    return v
  }

}



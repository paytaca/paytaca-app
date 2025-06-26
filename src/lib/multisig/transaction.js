import {
  encodeTransactionCommon,
  hashTransaction,
  lockingBytecodeToCashAddress,
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
  extractMissingVariables
} from 'bitauth-libauth-v3'

import { getLockingBytecode, getCompiler, getMultisigCashAddress, getRequiredSignatures } from './wallet.js'

export const MultisigTransactionStatus = Object.freeze({
  PENDING_UNSIGNED: 0,
  PENDING_PARTIALLY_SIGNED: 1,
  PENDING_FULLY_SIGNED: 2,
  BROADCASTED: 3,
  CONFIRMED: 4
})

export const MultisigTransactionStatusText = Object.freeze({
  [MultisigTransactionStatus.PENDING_UNSIGNED]: 'Pending, unsigned',
  [MultisigTransactionStatus.PENDING_PARTIALLY_SIGNED]: 'Pending, partially signed',
  [MultisigTransactionStatus.PENDING_FULLY_SIGNED]: 'Pending, fully signed',
  [MultisigTransactionStatus.BROADCASTED]: 'Broadcasted',
  [MultisigTransactionStatus.CONFIRMED]: 'Confirmed'
})

export const UNSIGNED = 'unsigned'
export const PARTIALLY_SIGNED = 'partially-signed'
export const FULLY_SIGNED = 'fully-signed'

export const getUnsignedTransactionHash = ({ multisigTransaction, hex = true }) => {
  const transaction = encodeTransactionCommon(multisigTransaction.transaction)
  if (hex) {
    return binToHex(transaction)
  }
  return transaction
}

export const getStatusUrl = ({ unsignedTransactionHash, chipnet = false }) => {
  return `https://${chipnet ? 'chipnet.' : ''}watchtower.cash/api/multisig/transaction-proposals?unsignedHash=${unsignedTransactionHash}`
}

export const getUnlockingScriptId = ({ signatures, template, inputIndex }) => {
  const scriptIdentifierTemplateScriptMap = Object.keys(template.scripts).map((scriptId) => {
    return { [scriptId]: template.scripts[scriptId].script }
  })
  const foundscriptIdentifierTemplateScriptMapping =
    scriptIdentifierTemplateScriptMap.find((scriptIdentifierAndScript) => {
      return signatures
        .filter((signature) => Number(signature.inputIndex) === Number(inputIndex))
        .every((signature) => {
          const scriptId = Object.keys(scriptIdentifierAndScript)[0]
          return scriptIdentifierAndScript[scriptId].includes(signature.sigKey)
        })
    })
  return Object.keys(foundscriptIdentifierTemplateScriptMapping)[0]
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
      input.lockingBytecode = Uint8Array.from(Object.values((input.sourceOutput.lockingBytecode)))
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

export const generateTempProposalId = multisigTransaction => {
  let transaction = structuredClone(multisigTransaction.transaction)
  transaction = transactionBinObjectsToUint8Array(transaction)
  return hashTransaction(encodeTransactionCommon(transaction))
}

export const generateTransactionHash = multisigTransaction => {
  let transaction = structuredClone(multisigTransaction.transaction)
  transaction = transactionBinObjectsToUint8Array(transaction)
  const encoded = encodeTransactionCommon(transaction)
  return hashTransaction(encoded)
}

export const createMultisigTransactionFromWCSessionRequest = ({ sessionRequest, addressIndex }) => {
  const address =
    sessionRequest.session.namespaces.bch.accounts[0].replace('bch:', '')

  const metadata = {
    origin: sessionRequest.verifyContext?.verified?.origin,
    prompt: sessionRequest.params?.request?.params?.userPrompt,
    status: MultisigTransactionStatus.PENDING_UNSIGNED,
    wcSessionRequest: sessionRequest,
    address,
    addressIndex
  }

  const multisigTransaction = {
    origin: sessionRequest.verifyContext?.verified?.origin + '|paytaca',
    purpose: sessionRequest.params?.request?.params?.userPrompt,
    transaction: sessionRequest.params.request.params.transaction,
    sourceOutputs: sessionRequest.params.request.params.sourceOutputs,
    signatures: [],
    address,
    addressIndex,
    metadata
  }
  multisigTransaction.id = generateTempProposalId(multisigTransaction)
  return multisigTransaction
}

export const initEmptyMultisigTransaction = ({
  userPrompt, origin = 'paytaca-wallet', walletId, addressIndex = 0
}) => {
  const metadata = { origin, userPrompt, addressIndex }
  return {
    signatures: [],
    transaction: { inputs: [], outputs: [], version: 2, locktime: 0 },
    metadata,
    walletId
  }
}

export const identifySignersWithoutSignatures = ({
  multisigWallet,
  multisigTransaction
}) => {
  const { template, lockingData } = multisigWallet
  const signatures = structuredClone(multisigTransaction.signatures)
  signatures.forEach((signature) => {
    if (typeof signature.sigValue === 'string') {
      signature.sigValue = hexToBin(signature.sigValue)
    } else {
      signature.sigValue = Uint8Array.from(Object.values(signature.sigValue))
    }
  })

  const transaction = transactionBinObjectsToUint8Array(
    structuredClone(multisigTransaction.transaction)
  )
  const compiler = getCompiler({ template })
  const unlockingScriptIds = Object.keys(template.scripts).filter(scriptId => scriptId !== 'lock')
  const sourceOutputs = [] // will be used for verification
  const missingSigners = {}
  const missingSignersEntityIdSet = new Set()
  const multisigWalletLockingBytecode = getLockingBytecode({ lockingData, template })
  unlockingScriptIds.forEach((unlockingScriptId) => {
    for (const [inputIndex, input] of transaction.inputs.entries()) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = multisigTransaction.sourceOutputs.find((utxo) => {
          return (
            utxo.outpointIndex === input.outpointIndex &&
            binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
            binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
          )
        })
      }
      sourceOutput.lockingBytecode = Uint8Array.from(Object.values(sourceOutput.lockingBytecode))
      const inputSignatures = {}

      signatures.forEach((sig) => {
        // eslint-disable-next-line eqeqeq
        if (sig.inputIndex == inputIndex) {
          inputSignatures[sig.sigKey] = sig.sigValue
        }
      })
      if (binToHex(sourceOutput.lockingBytecode) === binToHex(multisigWalletLockingBytecode.bytecode)) {
        const inputUnlockingData = {
          ...lockingData,
          bytecode: {
            ...inputSignatures
          }
        }
        input.unlockingBytecode = {
          compiler,
          data: inputUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
      sourceOutputs.push(sourceOutput)
    }

    const finalCompilation = generateTransaction({
      ...transaction
    })
    if (!finalCompilation.success) {
      const missingSignerVariables = extractMissingVariables({ ...finalCompilation })
      missingSigners[unlockingScriptId] = missingSignerVariables
      if (missingSignerVariables) {
        for (const signerEntityId of Object.values(missingSignerVariables)) {
          missingSignersEntityIdSet.add(signerEntityId)
        }
      }
    }
  })
  return {
    missingSigners,
    missingSignersEntityIdSet
  }
}

export const getSignatureCount = ({ multisigWallet, multisigTransaction } = {}) => {
  const signersWithoutSignatures = identifySignersWithoutSignatures({
    multisigWallet,
    multisigTransaction
  })
  const missingSignatures = Array.from(signersWithoutSignatures.missingSignersEntityIdSet || [])
  const signatureCount = Object.keys(multisigWallet.template.entities).length - missingSignatures.length
  if (signatureCount < 0) return 0
  return signatureCount
}

export const signerHasSignature = ({ signerEntityKey, multisigWallet, multisigTransaction }) => {
  const signersWithoutSignatures = identifySignersWithoutSignatures({
    multisigWallet,
    multisigTransaction
  })
  const hasSig = !Array.from(signersWithoutSignatures.missingSignersEntityIdSet)?.includes(signerEntityKey)
  return hasSig
}

export const finalizeTransaction = ({
  multisigWallet,
  multisigTransaction
}) => {
  const { template, lockingData } = multisigWallet

  const signatures = structuredClone(multisigTransaction.signatures)
  signatures.forEach((signature) => {
    if (typeof signature.sigValue === 'string') {
      signature.sigValue = hexToBin(signature.sigValue)
    } else {
      signature.sigValue = Uint8Array.from(Object.values(signature.sigValue))
    }
  })
  const compiler = getCompiler({ template })
  const multisigWalletLockingBytecode = getLockingBytecode({ lockingData, template })
  const transaction = transactionBinObjectsToUint8Array(multisigTransaction.transaction)
  const sourceOutputs = [] // will be used for verification
  for (const [inputIndex, input] of transaction.inputs.entries()) {
    let sourceOutput = input.sourceOutput
    if (!sourceOutput) {
      sourceOutput = multisigTransaction.sourceOutputs.find((utxo) => {
        return utxo.outpointIndex === input.outpointIndex &&
              binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
              binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
      })
    }

    sourceOutput.lockingBytecode = Uint8Array.from(Object.values(sourceOutput.lockingBytecode))
    const inputSignatures = {}
    signatures.forEach((sig) => {
      // eslint-disable-next-line eqeqeq
      if (sig.inputIndex == inputIndex) {
        inputSignatures[sig.sigKey] = sig.sigValue
      }
    })
    if (binToHex(sourceOutput.lockingBytecode) === binToHex(multisigWalletLockingBytecode.bytecode)) {
      const inputUnlockingData = {
        ...lockingData,
        bytecode: {
          ...inputSignatures
        }
      }
      const unlockingScriptId = getUnlockingScriptId({
        signatures: multisigTransaction.signatures, template, inputIndex
      })
      if (sourceOutput.token?.amount) {
        sourceOutput.token.amount = BigInt(sourceOutput.token.amount)
      }
      input.unlockingBytecode = {
        compiler,
        data: inputUnlockingData,
        valueSatoshis: BigInt(sourceOutput.valueSatoshis),
        script: unlockingScriptId,
        token: sourceOutput.token
      }
    }
    sourceOutputs.push(sourceOutput)
  }

  // Type checks before tx generation
  sourceOutputs.forEach((output) => {
    output.valueSatoshis = BigInt(output.valueSatoshis)
    if(output.valueSatoshis) {
      output.valueSatoshis = BigInt(output.valueSatoshis)
    }
    if (output.token?.amount) {
      output.token.amount = BigInt(output.token.amount)
    }
  })

  transaction.outputs.forEach((output) => {
    if (output.valueSatoshis) {
      output.valueSatoshis = BigInt(output.valueSatoshis)
    }
    if (output.token?.amount) {
      output.token.amount = BigInt(output.token.amount)
    }
  })

  const finalCompilation = generateTransaction({
    ...transaction
  })
  if (!finalCompilation.success) {
    //const signersWithoutSignatures =
      //identifySignersWithoutSignatures({
        //multisigWallet,
       // multisigTransaction
     // })
    //multisigTransaction.metadata.signersWithoutSignatures = signersWithoutSignatures
    return finalCompilation
  }

  multisigTransaction.finalized = finalCompilation.success
  const vm = createVirtualMachineBch()
    const verificationResult = vm.verify({
    sourceOutputs: sourceOutputs, transaction: finalCompilation.transaction
  })
  if (verificationResult !== true) {
    finalCompilation.vmVerificationError = verificationResult
    return finalCompilation 
  }
  const encodedTransaction = encodeTransactionCommon(finalCompilation.transaction)
  finalCompilation.vmVerificationSuccess = verificationResult
  finalCompilation.unsignedTransactionHash = hashTransaction(encodeTransactionCommon(transaction))
  finalCompilation.signedTransaction = binToHex(encodedTransaction)
  finalCompilation.signedTransactionHash = hashTransaction(encodedTransaction)
  
  return finalCompilation
}

export const signTransaction = ({
  multisigWallet,
  multisigTransaction,
  signerEntityKey,
  hdPrivateKey
}) => {
  const { lockingData, template } = multisigWallet
  if (!hdPrivateKey) {
    throw new Error(`Missing private key of ${signerEntityKey}`)
  }
  const signatures = multisigTransaction.signatures
  signatures.forEach((s) => {
    s.sigValue = Uint8Array.from(Object.values(s.sigValue))
  })
  const sourceOutputs = multisigTransaction.sourceOutputs
  const transaction = transactionBinObjectsToUint8Array(multisigTransaction.transaction)
  const entityUnlockingData = {
    hdKeys: {
      addressIndex: lockingData.hdKeys.addressIndex,
      hdPublicKeys: lockingData.hdKeys.hdPublicKeys,
      hdPrivateKeys: {
        [signerEntityKey]: hdPrivateKey
      }
    }
  }
  const unlockingScriptId = template.entities[signerEntityKey].scripts.filter((scriptId) => scriptId !== 'lock')[0]
  const multisigWalletLockingBytecode = getLockingBytecode({ lockingData, template })
  for (const input of transaction.inputs) {
    let sourceOutput = input.sourceOutput

    if (!sourceOutput) {
      sourceOutput = sourceOutputs.find((utxo) => {
        return (
          utxo.outpointIndex ===
          input.outpointIndex && binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
          binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
        )
      })
    }

    const sourceOutputLockingBytecodeHex =
      binToHex(Uint8Array.from(Object.values(sourceOutput.lockingBytecode)))

    if (sourceOutputLockingBytecodeHex === binToHex(multisigWalletLockingBytecode.bytecode)) {
      const compiler = getCompiler({ template })
      input.unlockingBytecode = {
        compiler,
        data: entityUnlockingData,
        valueSatoshis: BigInt(sourceOutput.valueSatoshis),
        script: unlockingScriptId,
        token: sourceOutput.token
      }
    }
  }

  const signAttempt = generateTransaction({ ...transaction })
  const signerSignatures = []
  for (const [inputIndex, error] of Object.entries(signAttempt.errors)) {
    const signerResolvedVariables = extractResolvedVariables({ ...signAttempt, errors: [error] })
    const sigKey = Object.keys(signerResolvedVariables)[0]
    const sigValue = Object.values(signerResolvedVariables)[0]
    const sigDoesNotYetExist = signatures.findIndex((sig) => {
      // eslint-disable-next-line eqeqeq
      return sig.inputIndex == inputIndex && sig.sigKey === sigKey
    }) === -1

    const signerSignatureForInput = {
      inputIndex,
      sigKey,
      sigValue: Uint8Array.from(Object.values(sigValue))
    }

    if (sigDoesNotYetExist) {
      signatures.push(signerSignatureForInput)
    }
    signerSignatures.push(signerSignatureForInput)
  }
  const finalizationResult = finalizeTransaction({
    multisigWallet,
    multisigTransaction
  })
  return { signer: signerEntityKey, signatures: signerSignatures }
}

export const refreshTransactionStatus = async ({ multisigWallet, multisigTransaction } = {}) => {
  try {
    if (!multisigTransaction.metadata) {
      multisigTransaction.metadata = {}
    }
    multisigTransaction.metadata.isRefreshingStatus = true
    await new Promise((resolve) => {
      setTimeout(() => { resolve() }, 3000)
    })
    if (multisigTransaction.metadata.status === MultisigTransactionStatus.CONFIRMED) return
    if (!multisigTransaction.metadata.status || multisigTransaction.metadata.status < MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
      const signatureCount = getSignatureCount({ multisigWallet, multisigTransaction })
      if (signatureCount === 0) {
        multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_UNSIGNED
      }
      const requiredSignatures = getRequiredSignatures(multisigWallet.template)
      if (signatureCount > 0 && signatureCount < requiredSignatures) {
        multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_PARTIALLY_SIGNED
      }
      if (signatureCount >= requiredSignatures) {
        multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_FULLY_SIGNED
      }
    }
    if (multisigTransaction.metadata.status === MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
      // TODO: check if submitted or confirmed then update
    }
    if (multisigTransaction.metadata.status === MultisigTransactionStatus.BROADCASTED) {
      // TODO: check if confirmed, then update
    }
  } catch (error) {} finally {
    delete multisigTransaction.metadata?.isRefreshingStatus
  }
}

export const signatureValuesToUint8Array = ({ signatures }) => {
  const s = structuredClone(signatures)
  s.forEach((signature) => {
    if (typeof (signature.sigValue) === 'string') {
      signature.sigValue = hexToBin(signature.sigValue)
    }
    signature.sigValue = Uint8Array.from(Object.values(signature.sigValue))
  })
  return s
}

export const signatureValuesToHex = ({ signatures }) => {
  const s = structuredClone(signatures)
  s.forEach((signature) => {
    if (typeof (signature.sig) === 'string') return
    signature.sigValue = binToHex(Uint8Array.from(Object.values(signature.sigValue)))
  })
  return s
}

export const getSigningProgress = ({ multisigWallet, multisigTransaction }) => {
  const signatureCount = getSignatureCount({ multisigWallet, multisigTransaction })
  if (signatureCount === 0) return UNSIGNED
  const requiredSignatures = getRequiredSignatures(multisigWallet.template)
  if (signatureCount < requiredSignatures) return PARTIALLY_SIGNED
  if (signatureCount === requiredSignatures) return FULLY_SIGNED
}

export const sourceOutputsValuesToUint8Array = ({ sourceOutputs }) => {
  sourceOutputs.forEach((sourceOutput) => {
    if (typeof (sourceOutput.lockingBytecode) === 'string') {
      sourceOutput.lockingBytecode = hexToBin(sourceOutput.lockingBytecode)
    }
    if (typeof (sourceOutput.outpointTransactionHash) === 'string') {
      sourceOutput.outpointTransactionHash = hexToBin(sourceOutput.outpointTransactionHash)
    }
    sourceOutput.lockingBytecode = Uint8Array.from(Object.values(sourceOutput.lockingBytecode))
    sourceOutput.outpointTransactionHash =
      Uint8Array.from(Object.values(sourceOutput.outpointTransactionHash))
  })
  return sourceOutputs
}

export const combinePsts = ({ psts }) => {
  const sameTransactions = psts.every((pst) => {
    return hashTransaction(encodeTransactionCommon(pst.transaction)) === hashTransaction(encodeTransactionCommon(psts[0].transaction))
  })
  if (!sameTransactions) return
  const combinedPst = psts[0]
  const otherPsts = psts.slice(1)
  for (let i = 0; i < otherPsts.length; i++) {
    const signatures = otherPsts[i].signatures
    signatures.forEach((signature) => {
      const foundSignature = combinedPst.signatures.find((existingSignature) => {
        return (
          Number(existingSignature.inputIndex) === Number(signature.inputIndex) &&
          existingSignature.sigKey === signature.sigKey &&
          (
            binToHex(Uint8Array.from(Object.values(existingSignature.sigValue))) ===
            binToHex(Uint8Array.from(Object.values(signature.sigValue)))
          )
        )
      })
      if (!foundSignature) {
        combinedPst.signatures.push(signature)
      }
    })
  }
  return combinedPst
}

export const attachSourceOutputsToInputs = multisigTransaction => {
 if (multisigTransaction.sourceOutputs) {
    multisigTransaction.transaction.inputs.forEach((input) => {
      // embedding sourceOutput to input
      input.sourceOutput = multisigTransaction.sourceOutputs.find((sourceOutput) => {
        return Number(sourceOutput.outpointIndex) === Number(input.outpointIndex) &&
          binToHex(Uint8Array.from(Object.values((sourceOutput.outpointTransactionHash)))) ===
            binToHex(Uint8Array.from(Object.values((input.outpointTransactionHash))))
      })
    })
  }
}

export const importPst = ({ pst }) => {
  let parsed = pst
  if (typeof pst === 'string') {
    const bin = base64ToBin(pst)
    parsed = JSON.parse(binToUtf8(bin))
  }

  const decoded = decodeTransactionCommon(hexToBin(parsed.transaction))
  parsed.transaction = transactionBinObjectsToUint8Array(
    decoded
  )
  parsed.signatures = signatureValuesToUint8Array({ signatures: parsed.signatures })
  parsed.sourceOutputs = sourceOutputsValuesToUint8Array({ sourceOutputs: parsed.sourceOutputs })
  if (parsed.sourceOutputs) {
    parsed.transaction.inputs.forEach((input) => {
      // embedding sourceOutput to input
      input.sourceOutput = parsed.sourceOutputs.find((sourceOutput) => {
        return Number(sourceOutput.outpointIndex) === Number(input.outpointIndex) &&
          binToHex(Uint8Array.from(Object.values((sourceOutput.outpointTransactionHash)))) ===
            binToHex(Uint8Array.from(Object.values((input.outpointTransactionHash))))
      })
    })
  }
  parsed.transaction.outputs.forEach((output) => {
    // inserting address to output
    output.address = lockingBytecodeToCashAddress({ bytecode: output.lockingBytecode }).address
  })
  parsed.transactionHash = hashTransaction(encodeTransactionCommon(parsed.transaction))
  if (!parsed.id) {
    parsed.id = generateTempProposalId(parsed)
  }
  return parsed
}

export const exportPstRaw = ({
  multisigTransaction, address, addressIndex = 0, format = 'base64'
}) => {
  const { origin, prompt, status } = multisigTransaction.metadata
  const pst = {
    transaction: binToHex(
      encodeTransactionCommon(
        transactionBinObjectsToUint8Array(multisigTransaction.transaction)
      )
    ),
    sourceOutputs: multisigTransaction.sourceOutputs,
    signatures: multisigTransaction.signatures,
    metadata: {
      v: 1,
      address,
      addressIndex,
      origin,
      prompt,
      status
    }
  }
  // if (includeSourceOutputs) {
  //   // EMBED
  //   pst.sourceOutputs = this.sourceOutputs
  // }
  if (format === 'json') return JSON.stringify(pst)
  if (format === 'electron-cash') throw new Error('Not yet implemented')
  const bin = utf8ToBin(JSON.stringify(pst))
  return binToBase64(bin)
}

export const exportPst = ({ multisigTransaction, address, addressIndex = 0, format = 'base64' }) => {
  const sourceOutputs = structuredClone(multisigTransaction.sourceOutputs)
  sourceOutputs.forEach((utxo) => {
    if (typeof (utxo.outpointTransactionHash) !== 'string') {
      utxo.outpointTransactionHash = binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash)))
    }
    if (typeof (utxo.lockingBytecode) !== 'string') {
      utxo.lockingBytecode = binToHex(Uint8Array.from(Object.values(utxo.lockingBytecode)))
    }
  })
  const signatures = structuredClone(multisigTransaction.signatures)
  signatures.forEach((signature) => {
    if (typeof (signature.sigValue) !== 'string') {
      signature.sigValue = binToHex(Uint8Array.from(Object.values(signature.sigValue)))
    }
  })
  const transaction = transactionBinObjectsToUint8Array(multisigTransaction.transaction)
  const pst = {
    id: multisigTransaction.id,
    transaction: binToHex(encodeTransactionCommon(transaction)),
    sourceOutputs,
    signatures,
    origin: multisigTransaction.origin,
    purpose: multisigTransaction.purpose || '',
    address,
    addressIndex,
    metadata: {
      v: 1,
      address,
      addressIndex,
      origin: multisigTransaction.origin,
      prompt: multisigTransaction.purpose
    }
  }
  if (!pst.id) {
    pst.id = generateTempProposalId(pst)
  }
  // if (includeSourceOutputs) {
  //   // EMBED
  //   pst.sourceOutputs = this.sourceOutputs
  // }
  if (format === 'json') return stringify(pst)
  if (format === 'electron-cash') throw new Error('Not yet implemented')
  const bin = utf8ToBin(JSON.stringify(pst))
  return binToBase64(bin)
}

export const isMultisigTransactionSynced = multisigTransaction => {
  if (!multisigTransaction.id) return false
  if (!/^[0-9]+$/.test(multisigTransaction.id)) return false
  return true
}

// {
//   "topic": "...",
//   "response": {
//     "id": "...",
//     "jsonrpc": "2.0",
//     "result": {
//       "status": "accepted",
//       "message": "Transaction approved. Awaiting other signatures.",
//       "statusUrl": "https://watchtower.cash/multisig/tx/<txid>"
//     }
//   }
// }

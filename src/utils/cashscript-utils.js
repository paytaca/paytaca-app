import { hexToBin } from "@bitauth/libauth";
import { SignatureAlgorithm, SignatureTemplate, TransactionBuilder, encodeFunctionArgument, utils } from "cashscript";
import { calculateDust, createUnlockingBytecode, getInputSize, getOutputSize, getTxSizeWithoutInputs } from "cashscript/dist/utils.js";

export const P2PKH_INPUT_SIZE = 32 + 4 + 1 + 1 + 65 + 1 + 33 + 4;

/**
 * Taken directly from CashScript 0.11 Transaction class' fee calculation
 * Returns the bytesize of contract's transaction input
 * @param {import("cashscript").ContractUnlocker} unlocker
 */
export function calculateInputSize(unlocker) {
  return placeholderInputSize(unlocker, () => signaturePlaceholder(65))
}

/**
 * @param {import("cashscript").ContractUnlocker} unlocker
 * @param {(sigTemplate: SignatureTemplate) => Uint8Array} toPlaceholder
 */
function placeholderInputSize(unlocker, toPlaceholder) {
  const { contract, abiFunction, params } = unlocker
  const args = params.map((arg, index) => encodeFunctionArgument(arg, abiFunction.inputs[index].type))
  const placeholderArgs = args.map((arg) => (isSignatureTemplate(arg) ? toPlaceholder(arg) : arg));
  const selector = contract.artifact.abi.length > 1 ? contract.artifact.abi.indexOf(abiFunction) : undefined
  // Create a placeholder input script for size calculation using the placeholder
  // arguments and correctly sized placeholder preimage
  const placeholderScript = createUnlockingBytecode(contract.contractType, hexToBin(contract.bytecode), placeholderArgs, selector);

  // Add one extra byte per input to over-estimate tx-in count
  const contractInputSize = getInputSize(placeholderScript) + 1;
  return contractInputSize
}

/**
 * 
 * @param {SignatureTemplate} sigTemplate 
 */
function signaturePlaceholder(sigTemplate) {
  const size = sigTemplate?.getSignatureAlgorithm?.() === SignatureAlgorithm.SCHNORR ? 65 : 73;
  return utils.placeholder(size);
}

function isSignatureTemplate(obj) {
  return obj instanceof SignatureTemplate
}

/**
 * Compute the network fee of a contract transaction.
 * @param {import("cashscript").ContractUnlocker} unlocker the unlocker used to compute the input size
 * @param {Output[]} outputs the outputs of the transaction
 * @param {number} inputLen the length of the input
 * @param {number} outputLen the length of the output
 * @param {number} feeRate the fee rate to be used for the computation (default 1 sats/byte)
 * @returns the computed contract network fee
 */
export function computeContractFee(unlocker, outputs, inputLen, outputLen, feeRate=1) {
  const inputSize = calculateInputSize(unlocker)

  let outputSize = 0
  for (const output of outputs) {
    outputSize += getOutputSize(output)
  }

  return BigInt(Math.floor(((inputSize * inputLen) + (outputSize * outputLen) + 10) * feeRate))
}

/**
 * Builds a contract transaction from the given inputs and outputs the way
 * CashScript 0.11's contract.functions did: tokens and NFTs the outputs leave
 * unspent go back to the contract, and so does BCH change above dust after
 * a 1 sat/byte fee estimate (or the hardcoded fee)
 * @param {Object} opts
 * @param {import("cashscript").Contract} opts.contract
 * @param {import("cashscript").ContractUnlocker} opts.unlocker unlocks the inputs without a template
 * @param {(import("cashscript").Utxo & { template?: SignatureTemplate })[]} opts.inputs inputs with a template are P2PKH
 * @param {import("cashscript").Output[]} opts.outputs
 * @param {Number} [opts.locktime]
 * @param {BigInt} [opts.hardcodedFee]
 */
export function createContractTransaction(opts) {
  const { contract, unlocker, inputs, hardcodedFee } = opts
  const outputs = [...opts.outputs]
  if (!outputs.length) throw new Error('Attempted to build a transaction without outputs')

  const isGenesisInput = (category) => inputs.some(input => input.vout === 0 && input.txid === category)
  const tokenCategories = (list) => list.filter(item => item.token).map(item => item.token.category)
  const tokenAmount = (list, category) => list
    .filter(item => item.token?.category === category)
    .reduce((total, item) => total + item.token.amount, 0n)

  for (const category of tokenCategories(outputs)) {
    if (isGenesisInput(category)) continue
    const available = tokenAmount(inputs, category)
    const needed = tokenAmount(outputs, category)
    if (available < needed) {
      throw new Error(`Insufficient funds for token ${category}: available (${available}) < needed (${needed}).`)
    }
  }

  const tokenChangeOutputs = tokenCategories(inputs)
    .map(category => ({ category, amount: tokenAmount(inputs, category) - tokenAmount(outputs, category) }))
    .filter(token => token.amount !== 0n)
    .map(token => ({ to: contract.tokenAddress, amount: 1000n, token }))
  outputs.push(...tokenChangeOutputs)

  const nfts = (list) => list.filter(item => item.token?.nft).map(item => ({ ...item.token.nft, category: item.token.category }))
  const nftInputs = nfts(inputs)
  let nftOutputs = nfts(outputs)
  let unusedNfts = nftInputs
  const markUsed = (nftInput) => {
    unusedNfts = unusedNfts.filter(nft => !isSameNft(nft, nftInput))
  }
  for (const nftInput of nftInputs) {
    if (nftInput.capability !== 'none') continue
    const index = nftOutputs.findIndex(nft => isSameNft(nft, nftInput))
    if (index < 0) continue
    nftOutputs.splice(index, 1)
    markUsed(nftInput)
  }
  for (const nftInput of nftInputs) {
    if (nftInput.capability === 'minting') {
      nftOutputs = nftOutputs.filter(nft => nft.category !== nftInput.category)
      markUsed(nftInput)
    }
    if (nftInput.capability === 'mutable') {
      const index = nftOutputs.findIndex(nft => nft.category === nftInput.category)
      if (index < 0) continue
      nftOutputs.splice(index, 1)
      markUsed(nftInput)
    }
  }
  nftOutputs = nftOutputs.filter(nft => !isGenesisInput(nft.category))
  if (nftOutputs.length) {
    throw new Error(`NFT output with token category ${nftOutputs[0].category} does not have corresponding input`)
  }
  outputs.push(...unusedNfts.map(nft => ({
    to: contract.tokenAddress,
    amount: 1000n,
    token: { category: nft.category, amount: 0n, nft: { capability: nft.capability, commitment: nft.commitment } },
  })))

  let fee = hardcodedFee ?? BigInt(getTxSizeWithoutInputs(outputs))
  if (!hardcodedFee) {
    const contractInputSize = placeholderInputSize(unlocker, signaturePlaceholder)
    fee += BigInt(inputs.reduce((size, input) => size + ('template' in input ? P2PKH_INPUT_SIZE : contractInputSize), 0))
  }
  const inputSats = inputs.reduce((total, input) => total + input.satoshis, 0n)
  const outputSats = outputs.reduce((total, output) => total + output.amount, 0n)
  let change = inputSats - outputSats - fee
  if (change < 0n) {
    throw new Error(`Insufficient funds: available (${inputSats}) < needed (${outputSats + fee}).`)
  }
  if (!hardcodedFee) change -= BigInt(getOutputSize({ to: contract.address, amount: 0n }))
  const changeOutput = { to: contract.address, amount: change }
  if (change >= 0n && change >= calculateDust(changeOutput)) outputs.push(changeOutput)

  const transaction = new TransactionBuilder({ provider: contract.provider })
  for (const input of inputs) {
    transaction.addInput(input, 'template' in input ? input.template.unlockP2PKH() : unlocker)
  }
  transaction.addOutputs(outputs)
  if (opts.locktime !== undefined) transaction.setLocktime(opts.locktime)
  return transaction
}

function isSameNft(nft1, nft2) {
  const keys = Object.keys(nft1)
  return keys.length === Object.keys(nft2).length &&
    keys.every(key => Object.prototype.hasOwnProperty.call(nft2, key) && nft1[key] === nft2[key])
}
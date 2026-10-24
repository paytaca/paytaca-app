import { hexToBin } from "@bitauth/libauth";
import { SignatureAlgorithm, SignatureTemplate, encodeFunctionArgument, utils } from "cashscript";
import { createUnlockingBytecode, getInputSize, getOutputSize } from "cashscript/dist/utils";

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
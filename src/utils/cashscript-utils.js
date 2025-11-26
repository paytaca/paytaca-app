import { placeholder } from "@cashscript/utils";
import { SignatureAlgorithm, SignatureTemplate } from "cashscript";
import { createInputScript, getInputSize } from "cashscript/dist/utils";

/**
 * Taken directly from Transaction class' fee calculation
 * Returns the bytesize of contract's transaction input
 * @param {import("cashscript").Transaction} transaction
 */
export function calculateInputSize(transaction) {
  const redeemScript = transaction.redeemScript || transaction.contract?.redeemScript

  const args = transaction.args || transaction.encodedFunctionArgs;
  const placeholderArgs = args.map((arg) => (isSignatureTemplate(arg) ? signaturePlaceholder(65) : arg));
  // Create a placeholder input script for size calculation using the placeholder
  // arguments and correctly sized placeholder preimage
  const placeholderScript = createInputScript(redeemScript, placeholderArgs, transaction.selector);

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
  return placeholder(size);
}

function isSignatureTemplate(obj) {
  return obj instanceof SignatureTemplate
}

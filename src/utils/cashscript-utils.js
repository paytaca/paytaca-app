import { placeholder, scriptToBytecode } from "@cashscript/utils";
import { SignatureTemplate } from "cashscript";
import { SignatureTemplate as SignatureTemplateV7 } from "cashscript0.7.5";
import { SignatureTemplate as SignatureTemplateV10 } from "cashscript0.10.0";
import { createInputScript, getInputSize, getPreimageSize } from "cashscript/dist/utils";

/**
 * Taken directly from Transaction class' fee calculation
 * Returns the bytesize of contract's transaction input
 * @param {import("cashscript").Transaction} transaction
 */
export function calculateInputSize(transaction) {
  const redeemScript = transaction.redeemScript || transaction.contract?.redeemScript

  const args = transaction.args || transaction.encodedFunctionArgs;
  const placeholderArgs = args.map((arg) => (isSignatureTemplate(arg) ? placeholder(65) : arg));
  // Create a placeholder preimage of the correct size
  const placeholderPreimage = transaction.abiFunction.covenant
      ? placeholder(getPreimageSize(scriptToBytecode(redeemScript)))
      : undefined;
  // Create a placeholder input script for size calculation using the placeholder
  // arguments and correctly sized placeholder preimage
  const placeholderScript = createInputScript(redeemScript, placeholderArgs, transaction.selector, placeholderPreimage);

  // Add one extra byte per input to over-estimate tx-in count
  const contractInputSize = getInputSize(placeholderScript) + 1;
  return contractInputSize
}

function isSignatureTemplate(obj) {
  if (obj instanceof SignatureTemplateV10) return True
  if (obj instanceof SignatureTemplateV7) return True
  return obj instanceof SignatureTemplate
}

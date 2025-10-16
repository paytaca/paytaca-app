import { getOutputSize } from "cashscript/dist/utils.js"
import { calculateInputSize } from "src/utils/cashscript-utils.js"
import { createEscrowReleaseOutputsV3 } from "./settlement.js"

/**
 * @param {import("../index.js").Escrow} escrow  
 */
export function createEscrowFundingOutputs(escrow) {
  if (escrow.version == 'v3') return createEscrowFundingOutputsV3(escrow)
  return [{ to: escrow.getContract().address, amount: String(escrow.fundingSats) }]
}

/**
 * @param {import("../index.js").Escrow} escrow
 */
export function createEscrowFundingOutputsV3(escrow) {
  const contract = escrow.getContract()
  
  const lockNftCategory = Array.from({ length: 64 }).fill('f').join('')
  const settlementOutputs = createEscrowReleaseOutputsV3(escrow, lockNftCategory)
  const lockNftSettlementOutput = settlementOutputs.find(output => {
    return output?.token?.nft && output.token.category == lockNftCategory
  })

  const lockNftOutputSize = lockNftSettlementOutput
    ? BigInt(getOutputSize(lockNftSettlementOutput))
    : 0n

  /** @type {import("cashscript").Output[]} */
  const outputs = []

  const inputSize = BigInt(getSettlementInputSize(contract, escrow.params.timestamp));

  const hasBchOutput = settlementOutputs.some(output => !output.token)
  if (hasBchOutput || !escrow.params.deliveryFeeCategory) {
    outputs.push({ to: contract.address, amount: inputSize })
  }

  for(const settlementOutput of settlementOutputs) {
    const outputSize = BigInt(getOutputSize(settlementOutput))
    if (settlementOutput.token && !settlementOutput.token?.nft) {
      let amount = settlementOutput.amount + outputSize + inputSize
      if (settlementOutput.token.category == escrow.params.deliveryFeeCategory && lockNftSettlementOutput) {
        amount += lockNftOutputSize + lockNftSettlementOutput.amount
      }

      outputs.push({
        to: contract.tokenAddress,
        amount: amount,
        token: {...settlementOutput.token},
      })
    } else {
      if (settlementOutput === lockNftSettlementOutput && escrow.params.deliveryFeeCategory) continue
      outputs[0].amount += settlementOutput.amount + outputSize
    }
  }

  outputs[0].amount += BigInt(10n);
  return outputs
}


/**
 * @param {Contract} contract 
 * @param {Number} timestamp 
 * @returns 
 */
export function getSettlementInputSize(contract, timestamp) {
  const max8Bytes = BigInt('0x' + Array.from({ length: 16 }).fill("f").join(''))
  const timestampParam = timestamp ? BigInt(timestamp) : max8Bytes

  const pubkeyPlaceholder = new Uint8Array(33).fill(0xff);
  const signaturePlaceholder = new Uint8Array(65).fill(0xff);
  return calculateInputSize(
    contract.functions.settlement(pubkeyPlaceholder, signaturePlaceholder, timestampParam, true)
  );
}

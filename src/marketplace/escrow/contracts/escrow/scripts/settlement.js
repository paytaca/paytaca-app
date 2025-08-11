import { pkhashToCashAddress, toTokenAddress } from "src/utils/crypto.js";
import { generateCommitment } from "../../../utils.js";

/**
 * @typedef {import("../index.js").Escrow} Escrow
 * @typedef {'release' | 'refund' | 'full_refund'} SettlementType
*/

/**
 * @param {Object} opts 
 * @param {Escrow} opts.escrow
 * @param {SettlementType} opts.settlementType
 * @param {String} [opts.lockNftCategory]
 */
export function createEscrowSettlementOutputs(opts) {
  const { escrow, settlementType } = opts;
  if (['v1', 'v2'].includes(escrow?.version)) {
    return createEscrowSettlementOutputsV1(escrow, settlementType)
  }

  if (settlementType === 'release') {
    return createEscrowReleaseOutputsV3(escrow, opts?.lockNftCategory);
  }
  if (settlementType === 'refund') {
    return createEscrowRefundOutputsV3(escrow);
  }
  return []
}

/**
 * For escrow V1 and V2, constructs output for all settlement types
 * @param {Escrow} escrow 
 * @param {SettlementType} settlementType 
 * @returns {import("cashscript").Output[]}
 */
function createEscrowSettlementOutputsV1(escrow, settlementType) {
  if (settlementType === 'full_refund') {
    const refundAmount = BigInt(
      escrow.fundingAmounts.amount +
      escrow.fundingAmounts.deliveryFee + 
      escrow.fundingAmounts.serviceFee +
      escrow.fundingAmounts.arbitrationFee
    )
    return [{ to: pkhashToCashAddress(escrow.params.buyerPkHash), amount: refundAmount }]
  }

  if(settlementType === 'refund') {
    return [
      {to: pkhashToCashAddress(escrow.params.buyerPkHash), amount: BigInt(escrow.fundingAmounts.amount + escrow.fundingAmounts.deliveryFee) },
      {to: pkhashToCashAddress(escrow.params.servicerPkHash), amount: BigInt(escrow.fundingAmounts.serviceFee) },
      {to: pkhashToCashAddress(escrow.params.arbiterPkHash), amount: BigInt(escrow.fundingAmounts.arbitrationFee) },
    ]
  }

  if (settlementType === 'release') {
    const outputs = [
      {to: pkhashToCashAddress(escrow.params.sellerPkHash), amount: BigInt(escrow.fundingAmounts.amount) },
      {to: pkhashToCashAddress(escrow.params.servicerPkHash), amount: BigInt(escrow.fundingAmounts.serviceFee) },
      {to: pkhashToCashAddress(escrow.params.arbiterPkHash), amount: BigInt(escrow.fundingAmounts.arbitrationFee) },
    ]

    if (escrow.fundingAmounts.deliveryFee) {
      const nftCommitment = generateCommitment({
        nftId: escrow.params.lockNftId,
        amount: escrow.fundingAmounts.deliveryFee,
        category: escrow.params.deliveryFeeCategory,
      })

      const deliveryFeePoolTokenAddr = toTokenAddress(escrow.params.feePoolAddress, escrow.network == 'chipnet', 'p2sh')
      outputs.push({
        to: deliveryFeePoolTokenAddr,
        amount: BigInt(escrow.fundingAmounts.deliveryFee),
        token: {
          category: deliveryFeeCategory,
          amount: 0n,
          nft: {
            capability: 'none',
            commitment: nftCommitment,
          }
        },
      })
    }

    return outputs
  }

  return []
}

/**
 * For escrow v3, constructs relase outputs
 * @param {Escrow} escrow
 * @param {String} lockNftCategory
 */
export function createEscrowReleaseOutputsV3(escrow, lockNftCategory) {
  const params = escrow.params

  const outputs = [
    constructSettlementOutput(
      params.sellerPkHash, params.amountCategory, BigInt(params.amount),
    ),
    constructSettlementOutput(
      params.servicerPkHash, params.serviceFeeCategory, BigInt(params.serviceFee),
    ),
    constructSettlementOutput(
      params.arbiterPkHash, params.arbitrationFeeCategory, BigInt(params.arbitrationFee),
    ),
  ]

  if (!params.deliveryFee || params.deliveryFee < 0) return outputs

  const feePoolTokenAddress = toTokenAddress(params.feePoolAddress)
  const nftCommitment = generateCommitment({
    nftId: params.lockNftId,
    amount: params.deliveryFee,
    category: params.deliveryFeeCategory,
  })
  if (params.deliveryFeeCategory) {
    outputs.push(
      {
        to: feePoolTokenAddress, amount: 1000n,
        token: {
          category: lockNftCategory, amount: 0n,
          nft: { commitment: nftCommitment, capability: 'none' } ,
        },
      },
      {
        to: feePoolTokenAddress, amount: 1000n,
        token: { category: params.deliveryFeeCategory, amount: BigInt(params.deliveryFee) },
      }
    )
  } else {
    outputs.push({
      to: feePoolTokenAddress, amount: BigInt(params.deliveryFee),
      token: {
        category: lockNftCategory, amount: 0n,
        nft: { commitment: nftCommitment, capability: 'none' },
      }
    })
  }

  return outputs
}

/**
 * @param {Escrow} escrow
 */
export function createEscrowRefundOutputsV3(escrow) {
  const params = escrow.params

  const outputs = [
    constructSettlementOutput(params.buyerPkHash, params.amountCategory, BigInt(params.amount)),
    constructSettlementOutput(params.buyerPkHash, params.serviceFeeCategory, BigInt(params.serviceFee)),
    constructSettlementOutput(params.buyerPkHash, params.arbitrationFeeCategory, BigInt(params.arbitrationFee)),
  ]

  if (params.deliveryFee) {
    const deliveryFeeOutput = constructSettlementOutput(
      params.buyerPkHash, params.deliveryFeeCategory, BigInt(params.deliveryFee)
    )
    outputs.push(deliveryFeeOutput)
  }

  return outputs
}


/**
 * @param {String} pkhash 
 * @param {String} category 
 * @param {BigInt} amount 
 * @param {BigInt} [dust=1000n]
 * @returns {import("cashscript").Output}
 */
function constructSettlementOutput(pkhash, category, amount, dust=1000n) {
  const address = pkhashToCashAddress(pkhash)
  const tokenAddress = toTokenAddress(address)
  if (category) {
    return { to: tokenAddress, amount: dust, token: { category, amount } }
  }
  return { to: address, amount }
}

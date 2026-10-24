import { pkhashToCashAddress, toNetworkAddress, toTokenAddress } from "src/utils/crypto.js";
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
    return createEscrowSettlementOutputsV1(escrow, settlementType, opts?.lockNftCategory)
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
 * @param {String} lockNftCategory
 * @returns {import("cashscript").Output[]}
 */
function createEscrowSettlementOutputsV1(escrow, settlementType, lockNftCategory) {
  if (settlementType === 'full_refund') {
    const refundAmount = BigInt(
      escrow.fundingAmounts.amount +
      escrow.fundingAmounts.deliveryFee + 
      escrow.fundingAmounts.serviceFee +
      escrow.fundingAmounts.arbitrationFee
    )
    return [{ to: pkhashToCashAddress(escrow.params.buyerPkHash, escrow.network === 'chipnet'), amount: refundAmount }]
  }

  if(settlementType === 'refund') {
    return [
      {to: pkhashToCashAddress(escrow.params.buyerPkHash, escrow.network === 'chipnet'), amount: BigInt(escrow.fundingAmounts.amount + escrow.fundingAmounts.deliveryFee) },
      {to: pkhashToCashAddress(escrow.params.servicerPkHash, escrow.network === 'chipnet'), amount: BigInt(escrow.fundingAmounts.serviceFee) },
      {to: pkhashToCashAddress(escrow.params.arbiterPkHash, escrow.network === 'chipnet'), amount: BigInt(escrow.fundingAmounts.arbitrationFee) },
    ]
  }

  if (settlementType === 'release') {
    const outputs = [
      {to: pkhashToCashAddress(escrow.params.sellerPkHash, escrow.network === 'chipnet'), amount: BigInt(escrow.fundingAmounts.amount) },
      {to: pkhashToCashAddress(escrow.params.servicerPkHash, escrow.network === 'chipnet'), amount: BigInt(escrow.fundingAmounts.serviceFee) },
      {to: pkhashToCashAddress(escrow.params.arbiterPkHash, escrow.network === 'chipnet'), amount: BigInt(escrow.fundingAmounts.arbitrationFee) },
    ]

    if (escrow.fundingAmounts.deliveryFee) {
      const nftCommitment = generateCommitment({
        nftId: escrow.params.lockNftId,
        amount: escrow.fundingAmounts.deliveryFee,
        category: escrow.params.deliveryFeeCategory,
      })

      const deliveryFeePoolTokenAddr = toTokenAddress(toNetworkAddress(escrow.params.feePoolAddress, escrow.network === 'chipnet'))
      outputs.push({
        to: deliveryFeePoolTokenAddr,
        amount: BigInt(escrow.fundingAmounts.deliveryFee),
        token: {
          category: lockNftCategory,
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
  const chipnet = escrow.network === 'chipnet'

  const outputs = [
    constructSettlementOutput(
      params.sellerPkHash, params.amountCategory, BigInt(params.amount), chipnet,
    ),
    constructSettlementOutput(
      params.servicerPkHash, params.serviceFeeCategory, BigInt(params.serviceFee), chipnet,
    ),
    constructSettlementOutput(
      params.arbiterPkHash, params.arbitrationFeeCategory, BigInt(params.arbitrationFee), chipnet,
    ),
  ]

  if (!params.deliveryFee || params.deliveryFee < 0) return outputs

  const feePoolTokenAddress = toTokenAddress(toNetworkAddress(params.feePoolAddress, chipnet))
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
  const chipnet = escrow.network === 'chipnet'

  const outputs = [
    constructSettlementOutput(params.buyerPkHash, params.amountCategory, BigInt(params.amount), chipnet),
    constructSettlementOutput(params.buyerPkHash, params.serviceFeeCategory, BigInt(params.serviceFee), chipnet),
    constructSettlementOutput(params.buyerPkHash, params.arbitrationFeeCategory, BigInt(params.arbitrationFee), chipnet),
  ]

  if (params.deliveryFee) {
    const deliveryFeeOutput = constructSettlementOutput(
      params.buyerPkHash, params.deliveryFeeCategory, BigInt(params.deliveryFee), chipnet
    )
    outputs.push(deliveryFeeOutput)
  }

  return outputs
}


/**
 * @param {String} pkhash 
 * @param {String} category 
 * @param {BigInt} amount 
 * @param {Boolean} chipnet
 * @param {BigInt} [dust=1000n]
 * @returns {import("cashscript").Output}
 */
function constructSettlementOutput(pkhash, category, amount, chipnet, dust=1000n) {
  const address = pkhashToCashAddress(pkhash, chipnet)
  const tokenAddress = toTokenAddress(address)
  if (category) {
    return { to: tokenAddress, amount: dust, token: { category, amount } }
  }
  return { to: address, amount }
}

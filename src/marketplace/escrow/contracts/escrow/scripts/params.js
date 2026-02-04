import { defaultAddressType, defaultNetwork } from "../../../constants.js"

/**
 * 
 * @param {Object} params
 * @param {String} params.buyerPkHash
 * @param {String} params.sellerPkHash
 * @param {String} params.servicerPkHash
 * @param {String} params.arbiterPkHash
 * @param {String} params.feePoolAddress
 * @param {Number} params.amount
 * @param {Number} params.serviceFee
 * @param {Number} params.arbitrationFee
 * @param {Number} params.deliveryFee
 * @param {String} [params.amountCategory]
 * @param {String} [params.serviceFeeCategory]
 * @param {String} [params.arbitrationFeeCategory]
 * @param {String} [params.deliveryFeeCategory]
 * @param {Number} params.lockNftId
 * @param {Number} params.timestamp
 * @returns 
 */
export function cleanEscrowManagerParameters(params) {
  return {
    buyerPkHash: params?.buyerPkHash,
    sellerPkHash: params?.sellerPkHash,
    servicerPkHash: params?.servicerPkHash,
    arbiterPkHash: params?.arbiterPkHash,
    feePoolAddress: params?.feePoolAddress,
    amount: parseInt(params?.amount),
    serviceFee: parseInt(params?.serviceFee),
    arbitrationFee: parseInt(params?.arbitrationFee),
    deliveryFee: parseInt(params?.deliveryFee),
    
    amountCategory: params?.amountCategory,
    serviceFeeCategory: params?.serviceFeeCategory,
    arbitrationFeeCategory: params?.arbitrationFeeCategory,
    deliveryFeeCategory: params?.deliveryFeeCategory,

    lockNftId: parseInt(params?.lockNftId),
    timestamp: parseInt(params?.timestamp),
  }
}

/**
 * 
 * @param {Object} options
 * @param {'v1' | 'v2' | 'v3'} options.version
 * @param {'mainnet' | 'chipnet'} options.network
 * @param {'p2sh20' | 'p2sh32'} options.addressType} options 
 * @returns 
 */
export function cleanEscrowManagerOptions(options) {
  return {
    version: options?.version,
    network: options?.network || defaultNetwork,
    addressType: options?.addressType || defaultAddressType,
  }
}

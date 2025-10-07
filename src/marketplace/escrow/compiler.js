import { addressToPkHash } from "src/utils/crypto"
import { Escrow } from "./contracts/escrow"

/**
 * @param {import("src/marketplace/objects").EscrowContract} escrowContract 
 */
export function escrowContractToCashscriptParams(escrowContract) {
  return {
    buyerPkHash: addressToPkHash(escrowContract.buyerAddress),
    sellerPkHash: addressToPkHash(escrowContract.sellerAddress),
    servicerPkHash: addressToPkHash(escrowContract.servicerAddress),
    arbiterPkHash: addressToPkHash(escrowContract.arbiterAddress),
    feePoolAddress: escrowContract?.deliveryFeeKeyNft?.feePoolContract?.address || '',

    amount: parseInt(escrowContract?.amountSats),
    serviceFee: parseInt(escrowContract?.serviceFeeSats),
    arbitrationFee: parseInt(escrowContract?.arbitrationFeeSats),
    deliveryFee: parseInt(escrowContract?.deliveryFeeKeyNft?.amount || 0),

    lockNftId: parseInt(escrowContract?.deliveryFeeKeyNft?.nftId || 0),
    timestamp: parseInt(escrowContract?.timestamp * 1),

    amountCategory: escrowContract?.amountCategory,
    serviceFeeCategory: escrowContract?.serviceFeeCategory,
    arbitrationFeeCategory: escrowContract?.arbitrationFeeCategory,
    deliveryFeeCategory: escrowContract?.deliveryFeeKeyNft?.category,
  }
}


/**
 * @param {import("src/marketplace/objects").EscrowContract} escrowContract 
 */
export function compileEscrowSmartContract(escrowContract) {
  const params = escrowContractToCashscriptParams(escrowContract)
  return new Escrow({
    params: params,
    options: {
      version: escrowContract?.contractVersion,
      network: escrowContract?.address?.startsWith?.("bchtest:") ? 'chipnet' : 'mainnet',
      addressType: escrowContract?.computedAddressType || escrowContract?.addressType,
    },
  })
}

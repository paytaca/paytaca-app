import { EscrowContract } from "../objects";
import { Escrow } from "./contracts/escrow";
import { cashAddrToPkHash } from "./utils";

export function escrowContractToCashscriptParams(escrowContract=EscrowContract.parse()) {
  return {
    buyerPkHash: cashAddrToPkHash(escrowContract.buyerAddress),
    sellerPkHash: cashAddrToPkHash(escrowContract.sellerAddress),
    servicerPkHash: cashAddrToPkHash(escrowContract.servicerAddress),
    arbiterPkHash: cashAddrToPkHash(escrowContract.arbiterAddress),
    feePoolAddress: escrowContract?.deliveryFeeKeyNft?.feePoolContract?.address || '',

    amount: parseInt(escrowContract?.amountSats),
    serviceFee: parseInt(escrowContract?.serviceFeeSats),
    arbitrationFee: parseInt(escrowContract?.arbitrationFeeSats),
    deliveryFee: parseInt(escrowContract?.deliveryFeeKeyNft?.amount || 0),

    lockNftId: parseInt(escrowContract?.deliveryFeeKeyNft?.nftId || 0),
    timestamp: parseInt(escrowContract?.timestamp * 1),
  }
}

export function compileEscrowSmartContract(escrowContract=EscrowContract.parse()) {
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

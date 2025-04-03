import { i18n } from 'src/boot/i18n'
import { backend } from "../backend";
import { EscrowContract } from "../objects";
import { Escrow } from "./contracts/escrow";
import { cashAddrToPkHash, resolvePrivateKeyFromAddress } from "./utils";

const { t: $t } = i18n.global

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

export async function fetchOrderPaymentsForSettlements(orderId) {
  const params = { order_id: orderId || null, is_settled: false, is_funded: true }
  const response = await backend.get(`connecta/escrow/`, { params })
  const results = response.data?.results
  if (!Array.isArray(results)) return []
  return results.map(EscrowContract.parse)
}

/**
 * @param {Object} opts
 * @param {EscrowContract[]} opts.escrowContracts
 * @param {import("src/wallet").Wallet} opts.wallet
 * @param {'release' | 'refund' | 'full_refund'} opts.settlementType
 * @param {import("quasar").DialogChainObject} [opts.dialog]
 */
export async function generateSettlementTransactions(opts) {
  const escrowContracts = opts?.escrowContracts
  const dialog = opts?.dialog
  const wallet = opts?.wallet
  const settlementType = opts?.settlementType

  const fail = (message) => {
    const error = new Error(message)
    error.name = 'SettlementTransactionError'
    throw error
  }

  const results = escrowContracts
    .map(escrowContract => {
      if (dialog) dialog?.update({ message: $t('CompilingContract') })
      const escrow = compileEscrowSmartContract(escrowContract)
      const contract = escrow.getContract()
      if (contract.address !== escrowContract.address) fail($t('CompilingContractError'))
      return { escrowContract, escrow }
    })
    .map(data => {
      if (dialog) dialog?.update({ message: $t('RetrievePrivateKey') })
      const { escrowContract } = data

      let privKeyData = resolvePrivateKeyFromAddress(escrowContract.buyerAddress, wallet)
      if (!privKeyData) privKeyData = resolvePrivateKeyFromAddress(escrowContract.arbiterAddress, wallet)
      if (!privKeyData) fail($t('RetrievePrivateKeyError'))

      return { ...data, wif: privKeyData.wif }
    })
    .map(async (data) => {
      const { escrow, escrowContract } = data
      if (dialog) dialog?.update({ message: $t('CreatingTransaction') })

      const fundingUtxo = {
        "txid": escrowContract.fundingTxid,
        "vout": escrowContract.fundingVout,
        "satoshis": escrowContract.fundingSats,
      }
      let txPromise
      if(settlementType === 'release') {
        txPromise = escrow.release(fundingUtxo, data?.wif)
      } else if (settlementType === 'refund') {
        txPromise = escrow.version === 'v1'
          ? escrow.refund(fundingUtxo, data?.wif)
          : escrow.fullRefund(fundingUtxo, data?.wif)
      }
      const transaction = await txPromise.catch(fail)
      transaction.withTime(0)
      const txHex = await transaction.build()

      return { escrowContract, txHex }
    })

  return Promise.all(results)
}

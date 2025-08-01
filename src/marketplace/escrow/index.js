import { i18n } from 'src/boot/i18n'
import { backend } from "../backend";
import { EscrowContract } from "../objects";
import { resolvePrivateKeyFromAddress } from "./utils";
import { compileEscrowSmartContract, escrowContractToCashscriptParams } from './compiler';
import { generateEscrowFundingTransaction } from './tx-builder';

export { compileEscrowSmartContract, escrowContractToCashscriptParams }

const { t: $t } = i18n.global

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
    .map(async (data) => {
      if (dialog) dialog?.update({ message: $t('RetrievePrivateKey') })
      const { escrowContract } = data

      let privKeyData = await resolvePrivateKeyFromAddress(escrowContract.buyerAddress, wallet)
      if (!privKeyData) privKeyData = await resolvePrivateKeyFromAddress(escrowContract.arbiterAddress, wallet)
      if (!privKeyData) fail($t('RetrievePrivateKeyError'))

      return { ...data, wif: privKeyData.wif }
    })
    .map(async (data) => {
      const { escrow, escrowContract, wif } = await data
      if (dialog) dialog?.update({ message: $t('CreatingTransaction') })

      const fundingUtxo = {
        "txid": escrowContract.fundingTxid,
        "vout": escrowContract.fundingVout,
        "satoshis": escrowContract.fundingSats,
      }
      let txPromise
      if(settlementType === 'release') {
        txPromise = escrow.release(fundingUtxo, wif)
      } else if (settlementType === 'refund') {
        txPromise = escrow.version === 'v1'
          ? escrow.refund(fundingUtxo, wif)
          : escrow.fullRefund(fundingUtxo, wif)
      }
      const transaction = await txPromise.catch(fail)
      transaction.withTime(0)
      const txHex = await transaction.build()

      return { escrowContract, txHex }
    })

  return Promise.all(results)
}

/**
 * @param {import("src/marketplace/objects").EscrowContract} escrowContract
 * @param {import("src/wallet").Wallet} wallet
 */
export async function sendEscrowPayment(escrowContract, wallet) {
  try {
    const escrowContractAddress = escrowContract.address;
    const result = await backend.get(`connecta/escrow/${escrowContractAddress}/funding_requirements/`)
    const fundingAmountsList = result.data?.funding_requirements
    const isChipnet = escrowContractAddress?.startsWith('bchtest:');
    const bchWallet = isChipnet ? wallet.BCH_CHIP : wallet.BCH;
    const { txHex } = await generateEscrowFundingTransaction(
      bchWallet, escrowContractAddress, fundingAmountsList,
    );

    // const mempoolAcceptUrl = `${bchWallet.baseUrl}/stablehedge/test-utils/test_mempool_accept/`
    // const response = await backend.post(mempoolAcceptUrl, { transaction: txHex })
    // const broadcastResult = response?.data
    const setFundingTxResult = await setEscrowFundingTransaction(escrowContractAddress, txHex)
    const txid = setFundingTxResult?.escrowContract.fundingTxid;
    if (!setFundingTxResult?.success && !txid) throw setFundingTxResult?.error
    return { success: true, txid: txid, txFee: txHex.length / 2 }
  } catch(error) {
    console.error(error)
    let errorMsg = error?.error || ''
    if (typeof error === 'string') errorMsg = error;
    if (errorMsg.indexOf('not enough balance in sender') > -1) {
      errorMsg = 'Not enough balance'
    } else if (errorMsg.indexOf('has insufficient priority') > -1) {
      errorMsg = 'Not enough balance to cover the transaction fee'
    }
    return { success: false, error: errorMsg }
  }
}

async function setEscrowFundingTransaction(escrowContractAddress, txHex) {
  return await backend.post(
    `connecta/escrow/${escrowContractAddress}/set_funding_transaction/`,
    { funding_tx_hex: txHex },
  ).then(response => {
    return { success: true, escrowContract: EscrowContract.parse(response?.data) }
  }).catch(error => {
    let errorMessage;
    if (typeof error?.message === 'string') {
      errorMessage = error?.message;
    } else if (typeof error?.response?.data?.[0] === 'string') {
      errorMessage = error?.response?.data?.[0]
    } else if (typeof error?.response?.data?.non_field_errors?.[0] === 'string') {
      errorMessage = error?.response?.data?.non_field_errors?.[0]
    } else if (typeof error?.response?.detail === 'string') {
      errorMessage = error?.response?.detail;
    }

    if (!errorMessage) errorMessage = 'Unknown error occurred';

    return { success: false, error: errorMessage };
  });
}

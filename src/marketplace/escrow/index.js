import { SignatureTemplate, TransactionBuilder, ElectrumNetworkProvider } from 'cashscript0.10.0';
import { watchtowerUtxoToCashscript } from 'src/wallet/stablehedge/transaction-utils';
import { getOutputSize } from 'cashscript0.10.0/dist/utils';

import { i18n } from 'src/boot/i18n'
import { backend } from "../backend";
import { EscrowContract } from "../objects";
import { Escrow } from "./contracts/escrow";
import { cashAddrToPkHash, resolvePrivateKeyFromAddress, toTokenAddress } from "./utils";

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
    const broadcastResult = await bchWallet.watchtower.BCH.broadcastTransaction(txHex);
    const txid = broadcastResult?.result || broadcastResult?.txid;
    if (!broadcastResult?.success && !txid) throw broadcastResult?.result || broadcastResult?.erorr
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

/**
 * 
 * @param {import("src/wallet/bch").BchWallet} bchWallet
 * @param {String} escrowContractAddress
 * @param {{ amount:Number, token: { amount:Number, category:String } }[]} fundingAmountsList 
 */
async function generateEscrowFundingTransaction(bchWallet, escrowContractAddress, fundingAmountsList) {
  const P2PKH_INPUT_SIZE = 148n;
  const { change: changeAddress } = await bchWallet.getAddressSetAt(0);
  const changeTokenAddress = toTokenAddress(changeAddress);

  const escrowContractTokenAddress = toTokenAddress(escrowContractAddress);

  /** @type {Map<String, BigInt>} */
  const tokenCategoryAmountMap = new Map();
  const txBalancerData = { txSize: 10n, totalOutput: 0n, totalInput: 0n }
  const provider = new ElectrumNetworkProvider(bchWallet.isChipnet ? 'chipnet' : 'mainnet');
  const txBuilder = new TransactionBuilder({ provider });
  fundingAmountsList.forEach(outputData => {
    const output = {
      to: outputData.token ? escrowContractTokenAddress : escrowContractAddress,
      amount: BigInt(outputData.amount),
      token: !outputData?.token ? undefined: {
        category: outputData.token.category,
        amount: BigInt(outputData.token.amount),
      }
    };
    txBuilder.addOutput(output);
    txBalancerData.txSize += BigInt(getOutputSize(output));
    txBalancerData.totalOutput += output.amount;
    if (output.token) {
      const category = output.token.category;
      const currentAmount = tokenCategoryAmountMap.get(category) || 0n;
      tokenCategoryAmountMap.set(category, currentAmount + output.token.amount);
    }
  })
  for (const [category, totalTokenAmount] of tokenCategoryAmountMap) {
    const tokenUtxos = await bchWallet.getUtxos({ category, nft: false })
    let totalInputTokenAmount = 0n;
    for (const tokenUtxo of tokenUtxos) {
      const ctUtxo = watchtowerUtxoToCashscript(tokenUtxo);
      if (!ctUtxo.token) continue
      const wif = await bchWallet.getPrivateKey(tokenUtxo.address_path)
      txBuilder.addInput(ctUtxo, new SignatureTemplate(wif).unlockP2PKH());
      totalInputTokenAmount += ctUtxo.token.amount;
      txBalancerData.totalInput += ctUtxo.satoshis;
      txBalancerData.txSize += P2PKH_INPUT_SIZE;
      if (totalInputTokenAmount >= totalTokenAmount) break
    }

    const changeTokenAmount = totalInputTokenAmount - totalTokenAmount;
    if (changeTokenAmount > 0n) {
      const changeOutput = {
        to: changeTokenAddress, amount: 1000n, token: {
          category: category, amount: changeTokenAmount
        }
      };
      txBuilder.addOutput(changeOutput);
      txBalancerData.txSize += BigInt(getOutputSize(changeOutput));
      txBalancerData.totalOutput += changeOutput.amount;
    } else if (changeTokenAmount < 0) {
      throw 'Not enough token balance'
    }
  }

  /** @type {import('src/utils/utxo-utils').WatchtowerUtxo[]} */
  const utxos = await bchWallet.getUtxos();
  const getChangeSats = () => txBalancerData.totalInput - txBalancerData.totalOutput - txBalancerData.txSize;
  for(const wtUtxo of utxos) {
    if (getChangeSats() >= 0) break

    const ctUtxo = watchtowerUtxoToCashscript(wtUtxo);
    const wif = await bchWallet.getPrivateKey(wtUtxo.address_path);
    txBuilder.addInput(ctUtxo, new SignatureTemplate(wif).unlockP2PKH());
    txBalancerData.totalInput += ctUtxo.satoshis;
    txBalancerData.txSize += P2PKH_INPUT_SIZE;
  }
  if (getChangeSats() < 0) throw 'Not enough balance'

  const minChangeableSats = 546n + 34n; // dust sats + p2pkh output
  if (getChangeSats() >= minChangeableSats) {
    const output = { to: changeAddress, amount: getChangeSats() - 34n }
    txBuilder.addOutput(output);
    txBalancerData.txSize += BigInt(getOutputSize(output));
    txBalancerData.totalOutput += output.amount;
  }

  return {
    txHex: txBuilder.build(),
  };
}
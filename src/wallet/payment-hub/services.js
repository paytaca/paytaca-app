import { SignatureTemplate, TransactionBuilder } from 'cashscript13';
import { watchtowerUtxoToCashscriptP2pkh } from "src/utils/utxo-utils";
import { Wallet } from "..";
import { TransactionBalancer } from "../stablehedge/transaction-utils";
import { toTokenAddress } from "src/utils/crypto";
import { formatKitInput, formatKitOutput, getSubscriptionContractInstance } from './cashscript-utils';

/**
 * @param {Object} opts 
 * @param {Wallet} opts.wallet
 * @param {String} opts.contractAddress
 * @param {Number} opts.satoshis
 * @param {Number} [opts.tokenAmount]
 * @param {String} [opts.tokenCategory]
 * @param {Boolean} opts.isChipnet
 * 
 * @returns {Promise<{ success: Boolean, error?: String, txid?: String }>}
 */
export async function topUpSubscription(opts) {
  const { wallet, isChipnet, tokenCategory, tokenAmount } = opts;
  const hasToken = tokenCategory && tokenAmount;
  const bchWallet = isChipnet ? wallet.BCH_CHIP : wallet.BCH;
  const { change: changeAddress } = await bchWallet.getAddressSetAt(0);
  const balancer = new TransactionBalancer();
  balancer.outputs.push({
    to: opts.contractAddress,
    amount: BigInt(opts.satoshis),
    token: !hasToken ? undefined : {
      category: tokenCategory,
      amount: BigInt(tokenAmount),
    }
  })

  if (hasToken) {
    const tokenUtxos = await bchWallet.getUtxos({ category: tokenCategory, nft: false });
    for (const utxo of tokenUtxos) {
      if (balancer.tokenChange(tokenCategory) >= 0n) break;
      const ctUtxo = watchtowerUtxoToCashscriptP2pkh(utxo, wallet);
      balancer.inputs.push(ctUtxo);
    }

    const tokenChange = balancer.tokenChange(tokenCategory);
    if (tokenChange > 0n) {
      balancer.outputs.push({
        to: toTokenAddress(changeAddress),
        amount: 1000n,
        token: { category: tokenCategory, amount: tokenChange },
      })
    } else if (tokenChange < 0n) {
      return {
        success: false,
        error: 'Insufficient token balance',
      }
    }
  }

  const bchUtxos = await bchWallet.getUtxos();
  for(const utxo of bchUtxos) {
    if (balancer.excessSats >= 0n) break;
    const ctUtxo = watchtowerUtxoToCashscriptP2pkh(utxo, wallet);
    balancer.inputs.push(ctUtxo);
  }

  const excessSats = balancer.excessSats;
  if (excessSats > 546n + 34n) { // 546 is min dust and 34n is the output size 
    balancer.outputs.push({
      to: changeAddress,
      amount: excessSats - 34n,
    })
  } else if (excessSats < 0n) {
    return { success: false, error: 'Insufficient BCH balance' }
  }

  const transaction = balancer.build();
  const response = await bchWallet.watchtower.BCH.broadcastTransaction(transaction);
  const responseData = response.data;
  return responseData;
}


/**
 * @param {Object} opts
 * @param {import('.').PaymentHub} opts.hub
 * @param {import('..').Wallet} opts.wallet
 * @param {Boolean} opts.isChipnet
 * @param {Boolean} opts.isMerchant 
 * @param {Object} opts.sub The subscription object data
 */
export async function createCancelSubscriptionTransaction(opts) {
  const { hub, wallet, isChipnet, isMerchant, sub } = opts;

  const bchWallet = isChipnet ? wallet.BCH_CHIP : wallet.BCH
  const kit = await hub.getSubscriptionCancelKit(sub.id, isMerchant)
  if (!kit.inputs || !kit.inputs.length) return;

  // 1. Fetch contract artifact
  const artifactObj = await hub.getContractArtifact(opts?.sub?.payment_category ? 'token' : undefined);
  const contract = getSubscriptionContractInstance(sub, artifactObj, isChipnet);
  const provider = contract.provider;

  // 2. Fetch private key using the exact address index
  const addressIndex = isMerchant ? sub.merchant_address_index : sub.funder_address_index;
  if (addressIndex == null) {
    if (isMerchant) throw new Error('Merchant address index not provided by backend')
    else throw new Error('Funder address index not provided by backend')
  }
  const pathStr = `0/${addressIndex}`

  const privKeyWif = await bchWallet.getPrivateKey(pathStr)
  if (!privKeyWif) {
    if (isMerchant) throw new Error('Could not derive private key for merchant address')
    else throw new Error('Could not derive private key for funder address')
  }

  // 3. Build & sign transaction
  const sig = new SignatureTemplate(privKeyWif)
  const unlockerFunction = isMerchant ? 'merchantCancel' : 'reclaim';
  const unlocker = contract.unlock[unlockerFunction](sig.getPublicKey(), sig); // provided unlockers have the same parameters

  const formattedInputs = kit.inputs.map(input => formatKitInput(input));
  const formattedOutputs = kit.outputs.map(output => formatKitOutput(output));
  const txBuilder = new TransactionBuilder({ provider })
  txBuilder.addInputs(formattedInputs, unlocker)
  txBuilder.addOutputs(formattedOutputs)

  return txBuilder.build();
}

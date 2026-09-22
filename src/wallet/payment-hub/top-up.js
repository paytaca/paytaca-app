import { watchtowerUtxoToCashscriptP2pkh } from "src/utils/utxo-utils";
import { Wallet } from "..";
import { TransactionBalancer } from "../stablehedge/transaction-utils";
import { toTokenAddress } from "src/utils/crypto";

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

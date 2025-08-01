import { ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } from "cashscript0.10.0";
import { getOutputSize } from "cashscript0.10.0/dist/utils";
import { toTokenAddress } from "src/utils/crypto";
import { watchtowerUtxoToCashscript } from 'src/wallet/stablehedge/transaction-utils';

/**
 * @param {import("src/wallet/bch").BchWallet} bchWallet
 * @param {String} escrowContractAddress
 * @param {{ amount:Number, token: { amount:Number, category:String } }[]} fundingAmountsList 
 */
export async function generateEscrowFundingTransaction(bchWallet, escrowContractAddress, fundingAmountsList) {
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
    txBuilder,
    txHex: txBuilder.build(),
  };
}

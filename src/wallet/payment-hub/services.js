import { SignatureTemplate, TransactionBuilder } from 'cashscript13';
import { formatKitInput, formatKitOutput, getSubscriptionContractInstance } from './cashscript-utils';

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
  const artifactObj = await hub.getContractArtifact();
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

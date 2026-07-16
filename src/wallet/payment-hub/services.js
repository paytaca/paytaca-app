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

  console.log("=== CASHSCRIPT PLAYGROUND DEBUG ===");
  console.log("Contract Arguments:");
  console.log("1. recipient:", sub.merchant_address);
  console.log("2. funder:", sub.funder_address);
  console.log("3. pledge:", sub.pledge_satoshis);
  console.log("4. period:", sub.period_blocks);
  console.log(`\nFunction Arguments (${unlockerFunction}):`);
  console.log("1. pk: (Derived from privKeyWif in playground)");
  console.log("2. sig: (Derived from privKeyWif in playground)");
  console.log("-> privKeyWif:", privKeyWif);
  console.log("Derived Path:", pathStr);
  console.log("\nTransaction Inputs:");
  console.log(JSON.stringify(formattedInputs, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  console.log("\nTransaction Outputs:")
  console.log(JSON.stringify(formattedOutputs, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  console.log("===================================");

  return txBuilder.build();
}

import { ElectrumNetworkProvider, Contract, SignatureTemplate } from 'cashscript';
import fs from 'fs';
import { decodeCashAddress, encodeCashAddress } from '@bitauth/libauth';

async function run() {
  const provider = new ElectrumNetworkProvider('chipnet');
  const artifact = JSON.parse(fs.readFileSync('../payment-hub/smart_contracts/recurring_payments.json', 'utf8'));
  
  const recipient = '041d80cdf7ebb86914b868824877a762f939de5b';
  const funder = 'f735165cce67b4967475295c178312652a3224c8';
  const pledge = 8352n;
  const period = 1n;
  
  const contract = new Contract(artifact, [
    Uint8Array.from(Buffer.from(recipient, 'hex')),
    Uint8Array.from(Buffer.from(funder, 'hex')),
    pledge,
    period
  ], { provider });
  
  const privKeyWif = 'L31FkcDFJM6G6u6ijYfvbZLt3xhdjsKCjApZk5NjMm1GTnHUdfgR';
  const sig = new SignatureTemplate(privKeyWif);
  
  const formattedInputs = [{
    txid: '7ce7d1d8de2d28b55e5a7ec9087ba30fd16b7727901c1ef4a5d5636c9116a2ed',
    vout: 1,
    satoshis: 74144n
  }];
  
  const toAddress = 'bchtest:qrmn29jueenmf9n5w554c9urzfjj5v3yeqff62a6vd';
  
  try {
    const txBuilder = contract.functions.merchantCancel(sig.getPublicKey(), sig)
        .from(formattedInputs)
        .to(toAddress, 73624n)
        .withoutChange();
        
    const debugResult = await txBuilder.debug();
    console.log("Debug result:");
    console.dir(debugResult, { depth: null });
  } catch (e) {
    console.error("Error debugging transaction:");
    console.error(e);
  }
}

run();

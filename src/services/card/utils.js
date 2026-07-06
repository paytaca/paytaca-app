import crypto from 'crypto'
import {
  ripemd160,
  binToHex,
  hexToBin,
  decodeCashAddress,
  encodeCashAddress,
  CashAddressType,
  decodePrivateKeyWif,
  hash256,
  instantiateSecp256k1,
} from "@bitauth/libauth"
import { BLOCK_TIME_SEC } from './constants.js'
import { TransactionBuilder, SignatureTemplate, ElectrumNetworkProvider } from 'cashscript'
// import { TransactionBuilder, SignatureTemplate, ElectrumNetworkProvider as CashScriptProvider } from 'cashscript';
import { loadWallet } from 'src/services/wallet.js';

import Watchtower from 'watchtower-cash-js';
const watchtower = new Watchtower({ network: 'mainnet' });

const HASHTYPE = 0x41; // SIGHASH_ALL | SIGHASH_FORKID

export async function getBlockHeight() {
  const provider = new ElectrumNetworkProvider('mainnet')
  const blockHeight = await provider.getBlockHeight()
  console.log('blockHeight:', blockHeight)
  return blockHeight
}

export async function convertTimeToBlock(timestamp) {
  const currentTime = Math.floor(Date.now() / 1000)
  const blocksAhead = Math.floor((timestamp - currentTime) / BLOCK_TIME_SEC)
  const currentBlockHeight = await getBlockHeight()
  const estimatedBlockHeight = currentBlockHeight + blocksAhead
  console.log('estimatedBlockHeight:', estimatedBlockHeight)
  return estimatedBlockHeight
}

export function sha256(data='', encoding='utf8') {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, encoding))
  return _sha256.digest().toString('hex')
}

export function pubkeyToPkHash(pubkey='') {
  return binToHex(ripemd160.hash(hexToBin(sha256(pubkey, 'hex'))))
}

export function convertCashAddressToTokenAddress (address) {
  const decodedAddress = decodeCashAddress(address)
  if (typeof decodedAddress == 'string') throw decodedAddress
  const addrType = decodedAddress.type
  const payload = decodedAddress.payload
  switch(addrType) {
    case (CashAddressType.p2pkhWithTokens):
    case (CashAddressType.p2shWithTokens):
      return address
    case (CashAddressType.p2pkh):
      return encodeCashAddress(decodedAddress.prefix, CashAddressType.p2pkhWithTokens, payload)
    case (CashAddressType.p2sh):
      return encodeCashAddress(decodedAddress.prefix, CashAddressType.p2shWithTokens, payload)
  }
}

/**
 * Sign preimages using the provided WIF private key.
 * Note: This should run on the merchant frontend; it signs input preimages
 * for the spend transaction.
  * @param {Object} params
  * @param {Array} params.preimages - Array of objects containing inputIndex and preimage hex strings.
  * @param {string} params.wif - WIF encoded private key.
 * @returns {Array} - Array of objects containing inputIndex, merchantSigHex, and merchantPkHex.  
 */
export async function signPreimages({ preimages, wif }) {
  const decoded = decodePrivateKeyWif(wif);
  if (typeof decoded === 'string') throw new Error(decoded);

  const secp = await instantiateSecp256k1();
  const merchantPkBin = secp.derivePublicKeyCompressed(decoded.privateKey);
  const merchantPkHex = binToHex(merchantPkBin);

  return preimages.map(({ inputIndex, preimage }) => {
    const preimageBin = hexToBin(preimage);
    const messageHash = hash256(preimageBin);

    const sig64 = secp.signMessageHashSchnorr(decoded.privateKey, messageHash);
    const sigWithHashType = new Uint8Array([...sig64, HASHTYPE]); // 65 bytes

    return {
      inputIndex,
      merchantSigHex: binToHex(sigWithHashType),
      merchantPkHex
    };
  });
}

export function reverseHex(hexString) {
  const bytes = Buffer.from(hexString, 'hex')
  bytes.reverse()
  return bytes.toString('hex')
}

export async function genesisFromScratch() {
  const wallet = await loadWallet()
  console.log('wallet:', wallet)

  // await wallet.consolidateUtxos()
  // return

  const recipientAddress = wallet.address()
  const bchUtxos = await wallet.getBchUtxos() 
  console.log('bchUtxos:', bchUtxos)

  const genesisUtxo = bchUtxos.utxos[0] // Use the first UTXO for genesis
  console.log('genesisUtxo:', genesisUtxo)
  const normalizedUtxo = { 
    txid: genesisUtxo.txid,
    vout: genesisUtxo.vout,
    satoshis: BigInt(genesisUtxo.satoshis) 
  }
  console.log('normalizedUtxo:', normalizedUtxo)

  // In cashscript, token.category is the txid in display (non-reversed) order
  const categoryId = normalizedUtxo.txid
  console.log('categoryId:', categoryId)
  
  const recipientTokenAddress = wallet.tokenAddress()

  const provider = new ElectrumNetworkProvider('mainnet')
  const privkeyWif = wallet.privkey(genesisUtxo.address_path)
  console.log('genesisUtxo.address_path:', genesisUtxo.address_path)
  console.log('privkeyWif:', privkeyWif)
  const sigTemplate = new SignatureTemplate(privkeyWif)

  const hardcodedFee = 1500n
  const change = bchUtxos.cumulativeValue - hardcodedFee - 2000n // 2 outputs of 1000 satoshis each
  console.log('change:', change)

  const tx = new TransactionBuilder({ provider })
    .addInput(normalizedUtxo, sigTemplate.unlockP2PKH())
    .addOutput({
      to: recipientTokenAddress,
      amount: 1000n,
      token: {
        category: categoryId,
        amount: 0n,
        nft: {
          capability: 'none',
          commitment: '01', // hex string
        },
      },
    })
    .addOutput({
      to: recipientTokenAddress,
      amount: 1000n,
      token: {
        category: categoryId,
        amount: 0n,
        nft: {
          capability: 'none',
          commitment: '02',
        },
      },
    })
    .addOutput({
      to: recipientAddress,
      amount: change
    })

  console.log('inputs:', tx.inputs)
  console.log('outputs:', tx.outputs)
    
  const txHex = tx.build()
  const result = await tx.send()

  console.log('genesis txid:', txHex)

  // await watchtower.BCH.broadcastTransaction(txHex)
  //   .then((response => {
  //     console.log('Broadcast response:', response)
  //   }))
  //   .catch((error) => {
  //     console.error('Error broadcasting transaction:', error)
  //   })
  console.log('genesis txid:', result.txid)

  const tokenUtxos = await wallet.getTokenUtxos(wallet.tokenAddress())
  console.log('tokenUtxos:', tokenUtxos)
}
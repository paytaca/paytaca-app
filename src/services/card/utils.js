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
import { TapToPayV2 } from './contract/tap-to-pay.js'
import { toTokenAddress } from 'src/utils/crypto.js'

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

export function encodeLinkingCommitment( { holderType, valueHex }) {
  if (!holderType) throw new Error ('missing required holderType parameter')
  if (!valueHex) throw new Error ('missing required valueHex parameter')

  let holderVal = 0x00
  if (holderType === 'cat') {
    holderVal = 0x01
  }
  
  const holderBuf = Buffer.from([holderVal]); // 1 byte
  const valueBuf = Buffer.from(valueHex, 'hex')
  const commitment = Buffer.concat([holderBuf, valueBuf]);
  return commitment.toString('hex'); 
}

export function decodeLinkingCommitment(hex) {
    if (hex.length === 0) return null;
    const buf = Buffer.from(hex, 'hex');
    return {
        type: buf[0] === 1 ? 'cat' : 'pkh',
        valueHex: buf.subarray(1, buf.length).toString('hex')
    };
}

/**
 * Encodes authorization data into an NFT commitment (hex).
 * @param {Object} params
 * @param {string} params.holderType 'pkh' or 'cat'
 * @param {string} params.category Linking category (hex).
 * @returns {string} Hex commitment.
 */
export function encodeOwnershipCommitment({ holderType, category }) {
  if (!category) throw new Error ('missing required category parameter')

  let holderVal = 0x00
  if (holderType === 'cat') {
    holderVal = 0x01
  }
  
  const holderBuf = Buffer.from([holderVal]); // 1 byte
  const categoryBuf = Buffer.from(category, 'hex')
  const commitment = Buffer.concat([holderBuf, categoryBuf]);
  return commitment.toString('hex'); 
}

/**
 * Decodes an NFT commitment hex into its fields.
 * @param {string} hex
 * @returns {{ type: string, category: string }|null}
 */
export function decodeOwnershipCommitment(hex) {
    if (hex.length === 0) return null;
    const buf = Buffer.from(hex, 'hex');
    return {
        type: buf[0] === 1 ? 'cat' : 'pkh',
        category: buf.subarray(1, buf.length).toString('hex')
    };
}

export function estimateP2pkhFee({ numInputs = 0, numOutputs = 2, feeRate = 2n } = {}) {
  // CashScript contract inputs are larger due to unlocking script (redeem script + args)
  // Approximate: ~300 bytes per contract input, ~148 bytes per P2PKH input
  const INPUT_SIZE = 148
  const OUTPUT_SIZE = 34
  const TX_OVERHEAD = 10

  const estimatedSize = TX_OVERHEAD
      + (numInputs * INPUT_SIZE)
      + (numOutputs * OUTPUT_SIZE)

  return BigInt(estimatedSize) * feeRate
}

export async function mintOwnershipTokens(linkingCategory) {
  console.log('====== minting ownership tokens ======')
  const wallet = await loadWallet()
  console.log('wallet:', wallet)

  const bchUtxos = await wallet.getBchUtxos() 
  console.log('bchUtxos:', bchUtxos)

  let genesisUtxo = bchUtxos.utxos[0] // Use the first UTXO for genesis
  if (genesisUtxo.vout !== 0) {
    await wallet.consolidateUtxos()
    setTimeout(async () => {
      const updatedBchUtxos = await wallet.getBchUtxos()
      console.log('updatedBchUtxos:', updatedBchUtxos)
      genesisUtxo = updatedBchUtxos.utxos[0]
    }, 5000) 
  }
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
  
  const recipientAddress = wallet.address()
  const recipientTokenAddress = wallet.tokenAddress()
  console.log('recipientAddress:', recipientAddress)
  console.log('recipientTokenAddress:', recipientTokenAddress)

  const provider = new ElectrumNetworkProvider('mainnet')
  const privkeyWif = wallet.privkey(genesisUtxo.address_path)
  const sigTemplate = new SignatureTemplate(privkeyWif)

  const nftValue = 1000n // 10000 satoshis for each NFT output
  const estimatedFee = estimateP2pkhFee({ numInputs: 1, numOutputs: 3, feeRate: 2n })
  console.log('estimatedFee:', estimatedFee)

  const change = bchUtxos.cumulativeValue - estimatedFee - (nftValue * 2n) // 2 outputs of 1000 satoshis each
  console.log('change:', change)

  const enPkhCommitment = encodeOwnershipCommitment({ holderType: 'pkh', category: reverseHex(linkingCategory) })
  const enCatCommitment = encodeOwnershipCommitment({ holderType: 'cat', category: reverseHex(linkingCategory) })
  console.log('pkhCommitment:', enPkhCommitment)
  console.log('catCommitment:', enCatCommitment)

  const tx = new TransactionBuilder({ provider })
    .addInput(normalizedUtxo, sigTemplate.unlockP2PKH())
    .addOutput({
      to: recipientAddress,
      amount: change
    })
    .addOutput({
      to: recipientTokenAddress,
      amount: nftValue,
      token: {
        category: categoryId,
        amount: 0n,
        nft: {
          capability: 'mutable',
          commitment: enPkhCommitment, // hex string
        },
      },
    })
    .addOutput({
      to: recipientTokenAddress,
      amount: nftValue,
      token: {
        category: categoryId,
        amount: 0n,
        nft: {
          capability: 'mutable',
          commitment: enCatCommitment, // hex string
        },
      },
    })
    

  console.log('inputs:', tx.inputs)
  console.log('outputs:', tx.outputs)
    
  // const txHex = tx.build()
  const result = await tx.send()

  console.log(result)

  // await watchtower.BCH.broadcastTransaction(txHex)
  //   .then((response => {
  //     console.log('Broadcast response:', response)
  //   }))
  //   .catch((error) => {
  //     console.error('Error broadcasting transaction:', error)
  //   })
  console.log('genesis txid:', result.txid)

  const tokenUtxos = await wallet.getTokenUtxos(categoryId, wallet.tokenAddress())
  console.log('tokenUtxos:', tokenUtxos)
  console.log('====== minting ownership tokens ======')
  return {
    txid: result.txid,
    category: categoryId,
  }
}

export async function mintLinkingToken() {
  console.log('====== minting linking token ======')
  const wallet = await loadWallet()
  console.log('wallet:', wallet)

  const bchUtxos = await wallet.getBchUtxos() 
  console.log('bchUtxos:', bchUtxos)

  let genesisUtxo = bchUtxos.utxos[0] // Use the first UTXO for genesis
  if (genesisUtxo.vout !== 0) {
    await wallet.consolidateUtxos()
    setTimeout(async () => {
      const updatedBchUtxos = await wallet.getBchUtxos()
      console.log('updatedBchUtxos:', updatedBchUtxos)
      genesisUtxo = updatedBchUtxos.utxos[0]
    }, 5000) 
  }
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
  
  const recipientAddress = wallet.address()
  const recipientTokenAddress = wallet.tokenAddress()
  console.log('recipientAddress:', recipientAddress)
  console.log('recipientTokenAddress:', recipientTokenAddress)

  const provider = new ElectrumNetworkProvider('mainnet')
  const privkeyWif = wallet.privkey(genesisUtxo.address_path)
  const sigTemplate = new SignatureTemplate(privkeyWif)

  const nftValue = 1000n // 10000 satoshis for each NFT output
  const estimatedFee = estimateP2pkhFee({ numInputs: 1, numOutputs: 3, feeRate: 2n })
  console.log('estimatedFee:', estimatedFee)

  const change = bchUtxos.cumulativeValue - estimatedFee - (nftValue * 1n) // 1 outputs of 1000 satoshis each
  console.log('change:', change)

  const tx = new TransactionBuilder({ provider })
    .addInput(normalizedUtxo, sigTemplate.unlockP2PKH())
    .addOutput({
      to: recipientAddress,
      amount: change
    })
    .addOutput({
      to: recipientTokenAddress,
      amount: nftValue,
      token: {
        category: categoryId,
        amount: 0n,
        nft: {
          capability: 'none',
          commitment: '',
        },
      },
    })
    
  console.log('inputs:', tx.inputs)
  console.log('outputs:', tx.outputs)
    
  const result = await tx.send()

  console.log(result)

  console.log('genesis txid:', result.txid)
  console.log('====== minting linking token ======')
  return {
    txid: result.txid,
    category: categoryId,
  }
}

export async function createV2Contract(category) {
  const backendPk = process.env.MAINNET_CARD_BACKEND_PUBKEY
  const backendPkh = pubkeyToPkHash(backendPk)
  console.log('backendPkh:', backendPkh)

  const tapToPay = new TapToPayV2(null, {category, backendPkh})
  return tapToPay
}

export async function sendOwnershipTokensToContract({ ownershipCategory, contractAddress }) {
  const wallet = await loadWallet()

  const estimatedFee = estimateP2pkhFee({ numInputs: 2, numOutputs: 2 })
  const fundingUtxos = await wallet.getBchUtxos(null, parseInt(estimatedFee))
  console.log('fundingUtxos:', fundingUtxos)
  
  const tokenUtxos = await wallet.getTokenUtxos(ownershipCategory, wallet.tokenAddress())
  console.log('tokenUtxos:', tokenUtxos)

  const provider = new ElectrumNetworkProvider('mainnet')

  const fundingPrivkeyWif = wallet.privkey(fundingUtxos.utxos[0].address_path)
  const fundingSig = new SignatureTemplate(fundingPrivkeyWif)

  const privkeyWif = wallet.privkey()
  const sigTemplate = new SignatureTemplate(privkeyWif)

  const changeAddress = wallet.changeAddress()
  const change = BigInt(fundingUtxos.cumulativeValue) - BigInt(estimatedFee)
  console.log('change:', change)
  console.log('changeAddress:', changeAddress)

  const contractTokenAddress = toTokenAddress(contractAddress)
  console.log('contractTokenAddress:', contractTokenAddress)

  const outputs = []
  for (let i = 0; i < tokenUtxos.length; i++) {
    const utxo = tokenUtxos[i]
    console.log('token:', utxo.token)
    console.log('token nft:', utxo.token.nft)
    outputs.push({
      to: contractTokenAddress,
      amount: BigInt(utxo.value),
      token: {
        category: utxo.token.category,
        amount: 0n,
        nft: {
          capability: utxo.token.nft.capability,
          commitment: utxo.token.nft.commitment,
        },
      },
    })
  }
  console.log('outputs:', outputs)

  const normalizedFundingUtxos = fundingUtxos.utxos.map(utxo => ({
    txid: utxo.txid,
    vout: utxo.vout,
    satoshis: BigInt(utxo.satoshis)
  }))
  console.log('normalizedFundingUtxos:', normalizedFundingUtxos)

  const normalizedTokenUtxos = tokenUtxos.map(utxo => ({
    txid: utxo.txid,
    vout: utxo.vout,
    satoshis: BigInt(utxo.value),
    token: utxo.token
  }))
  console.log('normalizedTokenUtxos:', normalizedTokenUtxos)

  const tx = new TransactionBuilder({ provider })
    .addInputs(normalizedFundingUtxos, fundingSig.unlockP2PKH())
    .addInputs(normalizedTokenUtxos, fundingSig.unlockP2PKH())
    .addOutput({
      to: changeAddress,
      amount: change
    })
    .addOutputs(outputs)
    
  console.log('inputs:', tx.inputs)
  console.log('outputs:', tx.outputs)
  
  console.log('sending ownership tokens to contract...')
  // const txHex = tx.build()
  // console.log('txHex:', txHex)
  const result = await tx.send()
  // console.log(result)
  // console.log('genesis txid:', result.txid)

  
  return {
    success: true,
    txid: result.txid,
  }
}
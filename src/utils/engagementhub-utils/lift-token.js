import { cashAddressToLockingBytecode, hexToBin } from "@bitauth/libauth"
import { hash256 } from '@cashscript/utils'
import { HashType, SignatureTemplate } from "cashscript"
import { createSighashPreimage, publicKeyToP2PKHLockingBytecode } from "cashscript/dist/utils"
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'

import axios from 'axios'
import Watchtower from "watchtower-cash-js"


const watchtower = new Watchtower(false)
const bchGenesisBlockTime = 1501834939

export const SaleGroup = {
  SEED: 'seed',
  PRIVATE: 'priv',
  PUBLIC: 'pblc'
}

export const SaleGroupPrice = {
  seed: 0.015,
  priv: 0.025,
  pblc: 0.05
}

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const LIFTTOKEN_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}lifttoken/` })


function hexToUint8Array(hexString) {
  if (hexString.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters.");
  }
  const uint8Array = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    uint8Array[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return uint8Array;
}

// ================================
// non-Promise functions
// ================================

export async function generateSignature(txId, wif) {
  const tx = await watchtower.BCH._api
    .post(`transactions/${txId}`)
    .then(resp => {
      return resp.data.details
    })

  const locktime = Math.floor((tx.timestamp - bchGenesisBlockTime) / 600)
  const utxoLockingBytecode = cashAddressToLockingBytecode(tx.inputs[0].address)

  const transaction = {
    version: 2,
    locktime,
    inputs: [{
      outpointIndex: tx.inputs[0].spent_index,
      outpointTransactionHash: hexToBin(txId),
      sequenceNumber: 0xfffffffe,
      unlockingBytecode: new Uint8Array(),
    }],
    outputs: [{
      lockingBytecode: utxoLockingBytecode,
      valueSatoshis: 1000n
    }]
  }
  const sourceOutputs = [{
    lockingBytecode: utxoLockingBytecode,
    valueSatoshis: BigInt(tx.outputs[0].value),
  }]

  const sigHashType = HashType.SIGHASH_SINGLE | HashType.SIGHASH_ANYONECANPAY // 0x83
  const signatureTemplate = new SignatureTemplate(wif, sigHashType)

  const signature = generateP2PKHSig({
    template: signatureTemplate,
    transaction,
    inputIndex: 0,
    sourceOutputs,
  })

  return Buffer.from(signature).toString('hex')
}

/**
 * @param {Object} params
 * @param {SignatureTemplate} params.template
 * @param {Number} params.inputIndex
 * @param {import("@bitauth/libauth").TransactionBCH} params.transaction
 * @param {import("@bitauth/libauth").Output[]} params.sourceOutputs
 * @param {Boolean} [params.includeSignature]
 */
export function generateP2PKHSig(params) {
  const template = params?.template
  const transaction = params?.transaction
  const sourceOutputs = params?.sourceOutputs
  const inputIndex = params?.inputIndex

  const pubkey = template.getPublicKey();
  const prevOutScript = publicKeyToP2PKHLockingBytecode(pubkey);
  const hashtype = template.getHashType();
  const preimage = createSighashPreimage(transaction, sourceOutputs, inputIndex, prevOutScript, hashtype);
  const sighash = hash256(preimage);

  return template.generateSignature(sighash);
}

// ================================
// functions with calls to engagement hub
// ================================

export async function getReservationsData() {
  return await LIFTTOKEN_URL
    .get(`reservation/${getWalletHash()}/`)
    .then(response => {
      if (response.status !== 200) return []
      return response.data
    })
    .catch(_error => { return [] })
}

export async function getPurchasesData() {
  return await LIFTTOKEN_URL
    .get(`purchase/${getWalletHash()}/`)
    .then(response => {
      if (response.status !== 200) return []
      return response.data
    })
    .catch(_error => { return [] })
}

export async function processPurchaseApi(data) {
  data.wallet_hash = getWalletHash()
  return await LIFTTOKEN_URL
    .post('purchase/process_purchase/', data)
    .then(response => { return response.status === 201 })
    .catch(_error => { return false })
}

export async function getContractAddressApi () {
  return await LIFTTOKEN_URL
    .get('purchase/get_contract_address/')
    .then(response => {
      if (response.status === 200) return response.data.address
      return null
    })
    .catch(_error => { return null } )
}
import { cashAddressToLockingBytecode, hexToBin } from "@bitauth/libauth"
import { hash256 } from '@cashscript/utils'
import { OracleData } from "@generalprotocols/price-oracle"
import { HashType, SignatureTemplate } from "cashscript"
import { createSighashPreimage, publicKeyToP2PKHLockingBytecode } from "cashscript/dist/utils"
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'

import axios from 'axios'
import Watchtower from "watchtower-cash-js"


const watchtower = new Watchtower(false)
const btcGenesisBlock = 1231006505;

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

const ORACLE_PUBKEY =
  process.env.ORACLE_PUBKEY_USD ||
  "02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818";
const ORACLE_RELAY = process.env.ORACLE_RELAY || "oracles.generalprotocols.com";

// ================================
// Promise functions
// ================================

export async function generateSignature(txId, wif) {
  const tx = await watchtower.BCH._api
    .post(`transactions/${txId}`)
    .then(resp => {
      return resp.data.details
    })

  const locktime = Math.floor((tx.timestamp - btcGenesisBlock) / 600);
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

export async function getAddressPath(address) {
  return await watchtower.BCH._api
    .post(`address-info/bch/${address}`)
    .then(resp => {
      return resp.data.address_path
    })
}

export async function getOracleData() {
  return await axios.get(
    `https://${ORACLE_RELAY}/api/v1/oracleMessages?publicKey=${ORACLE_PUBKEY}&count=1`
  ).then(async (response) => {
    const message = await OracleData.parseOracleMessage(
      hexToBin(response.data.oracleMessages[0].message)
    );
    const price =
      (message.dataContent[0] |
        (message.dataContent[1] << 8) |
        (message.dataContent[2] << 16) |
        (message.dataContent[3] << 24)) >>>
      0;
    return {
      price: price / 10 ** 2,
      messageTimestamp: message.messageTimestamp
    };
  })
}

// ================================
// non-Promise functions
// ================================

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

export function updateRsvpPublicKeys (data) {
  return  LIFTTOKEN_URL
    .patch(`reservation/${getWalletHash()}/`, data)
    .catch(error => console.error(error))
}
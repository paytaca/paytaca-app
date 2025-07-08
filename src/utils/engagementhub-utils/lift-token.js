import { createSighashPreimage, publicKeyToP2PKHLockingBytecode } from "cashscript/dist/utils"
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'

import axios from 'axios'

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

// ================================
// non-Promise functions
// ================================

export function processGenerateSigParams() {
  
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
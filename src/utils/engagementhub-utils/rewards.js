import axios from 'axios'

import { Store } from 'src/store'
import { convertCashAddress } from 'src/wallet/chipnet'
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'

// const ENGAGEMENT_HUB_URL =
//   process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const ENGAGEMENT_HUB_URL = 'http://127.0.0.1:8000/api/'
export const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })
export const PROMO_TOKEN_CATEGORY = process.env.PROMO_TOKEN_CATEGORY || '8473d94f604de351cdee3030f6c354d36b257861ad8e95bbc0a06fbab2a2f9cf'

export const Promos = {
  USERREWARDS: 'ur',
  RFPROMO: 'rp' //,
  // LOYALTYPROMO: 'lp',
  // CHAMPIONPROMO: 'cp',
  // PPRPROMO: 'pprp'
}
export const PromosBytes = {
  UR: 0x01.toString(),
  RP: 0x02.toString(),
  // LP: 0x03,
  // CP: 0x04,
  // MP: 0x05
}

// ================================
// local functions
// ================================

function denomination () {
  return Store.getters['global/denomination']
}

function fiatCurrency () {
  const currency = Store.getters['market/selectedCurrency']
  return currency?.symbol
}

// ================================
// util functions
// ================================

export async function getWalletTokenAddress () {
  const { generateReceivingAddress, getDerivationPathForWalletType } = await import('src/utils/address-generation-utils.js')
  const addressIndex = Store.getters['global/getLastAddressIndex']('bch')
  const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
  const bchAddress = await generateReceivingAddress({
    walletIndex: Store.getters['global/getWalletIndex'],
    derivationPath: getDerivationPathForWalletType('bch'),
    addressIndex: validAddressIndex,
    isChipnet: Store.getters['global/isChipnet']
  })
  if (!bchAddress) {
    throw new Error('Failed to generate BCH address')
  }
  return convertCashAddress(bchAddress, false, true)
}

// ================================
// functions with calls to engagement hub
// ================================

// ========== reusable functions ==========

async function processPoints (url, data) {
  return await REWARDS_URL
    .post(url, data)
    .then(response => {
      if (response.status === 200) return response.data
      else return null
    })
    .catch(_error => { return null })
}

async function getData (url) {
  return await REWARDS_URL
    .get(url)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else if (resp.status === 404) return {}
      else return null
    })
    .catch(error => {
      console.error(error)
      if (error?.message.includes('404')) return {}
      else return null
    })
}

async function createData (url) {
  return await REWARDS_URL
    .post(url)
    .then(response => { return response.data })
    .catch(error => {
      console.error(error)
      return null
    })
}

async function updateData (url, data) {
  return await REWARDS_URL
    .patch(url, data)
    .then(response => {
      if (response.status === 200) return response.data
      else return null
    })
    .catch(error => {
      console.error(error)
      return null
    })
}

async function postFetchData (url, data) {
  return await REWARDS_URL
    .post(url, data)
    .then(response => {
      if (response.status === 200) return response.data
      else if (resp.status === 404) return {}
      else return null
    })
    .catch(error => {
      console.error(error)
      if (error?.message.includes('404')) return {}
      else return null
    })
}

// ========== get functions ==========

export async function getUserPromoData () {
  return await getData(`userpromo/${getWalletHash()}/`)
}

export async function getUserRewardsData (id) {
  return await getData(`userreward/${id}/`)
}

export async function getRfPromoData (id) {
  return await getData(`rfpromo/${id}/`)
}

export async function getRpMaxRedeemable () {
  const rpMax = await getData('rfpromo/get_rp_max_redeemable/')
  // fallback to original 10_000 when something goes wrong with server fetch
  return rpMax && Object.keys(rpMax).length > 0 ? rpMax.rp_max : 10000
}

// ========== create functions ==========

export async function createUserPromoData () {
  await REWARDS_URL
    .post('userpromo/', { wallet_hash: getWalletHash() })
    .then(_response => { })
    .catch(error => { console.error(error) })
}

export async function createUserRewardsData () {
  return await createData('userreward/')
}

export async function createRfPromoData () {
  return await createData('rfpromo/')
}

// ========== update functions ==========

export async function updateUserPromoData (data) {
  await updateData(`userpromo/${getWalletHash()}/`, data)
}

export async function updateUserRewardsData(id, data) {
  return await updateData(`userreward/${id}/`, data)
}

export async function updateRfPromoData (id, data) {
  await updateData(`rfpromo/${id}/`, data)
}

// ========== other functions ==========

export async function fetchMerchantTransactionsData (data) {
  return await postFetchData('userreward/get_ur_merchant_transactions/', data)
}

export async function getPromoRedeemHistory (promo, data) {
  const promoUrl = {
    'ur': 'userreward/get_ur_redeem_history/',
    'rp': 'rfpromo/get_rp_redeem_history/'
  }

  return await postFetchData(promoUrl[promo], data)
}

export async function processReferralCode (data) {
  return await REWARDS_URL
    .post('userreward/process_referral_code/', data)
    .then(_response => { return {} })
    .catch(error => {
      console.error(error)
      return error.response.data
    })
}

export async function awardInitialUP (data) {
  return await REWARDS_URL
    .post('userreward/award_initial_points/', data)
    .then(_response => { })
    .catch(error => { console.error(error) })
}

export async function processOnetimePoints (data) {
  return await processPoints('userreward/process_onetime_points/', data)
}

export async function processMerchantOtcPoints (data) {
  return await processPoints('userreward/process_merchant_otc_points/', data)
}

export async function processPointsRedemption (data) {
  return await processPoints('userpromo/process_points_redemption/', data)
}
import axios from 'axios'

import { Store } from 'src/store'
import { convertCashAddress } from 'src/wallet/chipnet'
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'
import { requestManager } from 'src/utils/request-manager'

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
// const ENGAGEMENT_HUB_URL = 'http://127.0.0.1:8000/api/'
export const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })
requestManager.attachTo(REWARDS_URL)
export const PROMO_TOKEN_CATEGORY = process.env.PROMO_TOKEN_CATEGORY
export const PROMO_TOKEN_DECIMALS = 2

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
// util functions
// ================================

export async function getWalletTokenAddress (use0thAddressIndex=false) {
  const { generateReceivingAddress, getDerivationPathForWalletType } = await import('src/utils/address-generation-utils.js')
  const addressIndex = use0thAddressIndex ? 0 : Store.getters['global/getLastAddressIndex']('bch')
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
    .catch(() => { return null })
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
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      if (error?.message.includes('404')) return {}
      else return null
    })
}

async function createData (url) {
  return await REWARDS_URL
    .post(url)
    .then(response => { return response.data })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
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
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return null
    })
}

async function postFetchData (url, data) {
  return await REWARDS_URL
    .post(url, data)
    .then(response => {
      if (response.status === 200) return response.data
      else if (response.status === 404) return {}
      else return null
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
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
  // fallback to original value of 10_000 when something goes wrong with server fetch
  return rpMax && Object.keys(rpMax).length > 0 ? rpMax.rp_max : 10000
}

export async function getLiftConversionRatio () {
  const resp = await getData('userpromo/get_lift_convertion_ratio/')
  // fallback to original value of 4 when something goes wrong with server fetch
  const conversionRatio = resp && Object.keys(resp).length > 0
    ? resp.conversion_ratio
    : 4
  const eligibilityDate = resp && Object.keys(resp).length > 0
    ? resp.eligibility_date
    : new Date('2026-07-01T00:00:00Z') // July 01, 2026

  return { conversionRatio, eligibilityDate }
}

export async function getRewardsSwapContractDetails () {
  return await getData('userpromo/get_rewards_swap_contract_details/')
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

export async function getTransactionsData (data) {
  return await postFetchData('userreward/get_transactions/', data)
}

export async function fetchRfPromoReferrals (data) {
  return await postFetchData('rfpromo/get_rp_referrals/', data)
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
      return error.response?.data || { error: error.message || 'Network error' }
    })
}

export async function awardInitialUP (data) {
  return await REWARDS_URL
    .post('userreward/award_initial_points/', data)
    .then(_response => { })
    .catch(error => { console.error(error) })
}

export async function processMerchantOtcPoints (data) {
  return await processPoints('userreward/process_merchant_otc_points/', data)
}

export async function processRampCashinPoints (data) {
  return await processPoints('userreward/process_cashin_points/', data)
}

export async function processCauldronPoints (data) {
  return await processPoints('userreward/process_cauldron_points/', data)
}

export async function processEloadPoints (data) {
  return await processPoints('userreward/process_eload_points/', data)
}

export async function processPromoTokensSwap (data) {
  return await REWARDS_URL
    .post('userpromo/process_promo_tokens_swap/', data)
    .then(response => { return response.data })
    .catch(error => {
      console.error(error)
      return error.response?.data || { error: error.message || 'Network error' }
    })
}

export async function recordPointsRedemption (data) {
  return await REWARDS_URL
    .post('userpromo/record_points_redemption/', data)
    .then(response => {
      if (response.status === 200) return { error: '' }
      else return response.data
    })
    .catch(error => {
      console.error(error)
      return error.response?.data || { error: error.message || 'Network error' }
    })
}
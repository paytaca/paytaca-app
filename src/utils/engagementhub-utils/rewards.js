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
export const PROMO_CONTRACT_VERSION = 'v2'

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

/**
 * Message produced by axios when a request is cancelled through the
 * RequestManager (or any other cancel token). Those are not real failures and
 * must not be logged as such.
 */
function isCanceledError (error) {
  return axios.isCancel?.(error) === true || error?.message === 'canceled'
}

/**
 * Extracts a human-readable message out of an axios error, tolerating the
 * shapes we actually see: a response body, an axios message, or nothing.
 */
function describeError (error) {
  return error?.response?.data?.error
    || error?.response?.data?.detail
    || error?.message
    || 'Unknown error'
}

function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retries `fn` a few times with a linear backoff.
 *
 * Rewards data is required to render the app, and a single dropped request
 * used to leave the page permanently broken for the rest of the session.
 * Only transient failures are retried — a 4xx is a real answer from the
 * server and retrying it just wastes round trips.
 */
async function withRetry (fn, { retries = 2, delayMs = 400 } = {}) {
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error
      const status = error?.response?.status
      const isRetriable = !status || status >= 500 || isCanceledError(error)
      if (!isRetriable || attempt === retries) throw error
      await delay(delayMs * (attempt + 1))
    }
  }
  throw lastError
}

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

async function processPoints (url, data, skipAbortManager=false) {
  return await REWARDS_URL
    .post(url, data, skipAbortManager ? { skipAbortManager: true } : undefined)
    .then(response => {
      if (response.status === 200) return response.data
      else return null
    })
    .catch(() => { return null })
}

/**
 * Performs a GET against engagement-hub.
 *
 * Resolves to:
 *   - the response body on 200
 *   - `{}` when the resource does not exist (404) or the request failed, so
 *     that callers treat "no record yet" and "server hiccup" the same way and
 *     bootstrap instead of showing a dead error card
 *   - throws when the request was cancelled or the wallet hash is unknown
 */
async function getData (url, skipAbortManager = false) {
  return await withRetry(async () => {
    return await REWARDS_URL
      .get(url, skipAbortManager ? { skipAbortManager: true } : undefined)
      .then(resp => {
        if (resp.status === 200) return resp.data
        else if (resp.status === 404) return {}
        else return null
      })
      .catch(error => {
        if (isCanceledError(error)) throw error
        console.error('Failed to GET ' + url + ': ' + describeError(error))
        // Network error or unexpected status: let the caller bootstrap rather
        // than failing. Returning null here used to render a dead error card.
        return {}
      })
  })
}

async function createData (url, data = {}) {
  return await REWARDS_URL
    .post(url, data)
    .then(response => { return response.data })
    .catch(error => {
      if (!isCanceledError(error)) {
        console.error('Failed to POST ' + url + ': ' + describeError(error))
      }
      return null
    })
}

async function updateData (url, data, skipAbortManager = false) {
  return await REWARDS_URL
    .patch(url, data, skipAbortManager ? { skipAbortManager: true } : undefined)
    .then(response => {
      if (response.status === 200) return response.data
      else return null
    })
    .catch(error => {
      if (!isCanceledError(error)) {
        console.error('Failed to PATCH ' + url + ': ' + describeError(error))
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
      if (!isCanceledError(error)) {
        console.error('Failed to POST ' + url + ': ' + describeError(error))
      }
      // These callers surface their own error state on a falsy result, so only
      // a genuine 404 (nothing to list yet) becomes an empty object here.
      if (error?.response?.status === 404) return {}
      else return null
    })
}

// ========== get functions ==========

export async function getUserPromoData () {
  const walletHash = getWalletHash()
  // Without a wallet hash the URL would be `userpromo/undefined/`, which
  // always 404s and makes both the server and the logs useless to debug.
  if (!walletHash) throw new Error('Wallet hash is not available yet')
  // Not abort-managed: this request gates the whole page, so a navigation
  // elsewhere in the app must not silently cancel it.
  return await getData(`userpromo/${walletHash}/`, true)
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

/**
 * Creates the UserPromo record for the current wallet.
 *
 * Returns `true` when the record exists afterwards so callers can re-read it.
 * Failures used to be swallowed entirely, which meant a failed bootstrap left
 * the wallet permanently without a record until the app was restarted.
 */
export async function createUserPromoData () {
  const walletHash = getWalletHash()
  if (!walletHash) {
    console.error('Cannot create UserPromo: wallet hash is not available yet')
    return false
  }

  return await withRetry(async () => {
    return await REWARDS_URL
      .post('userpromo/', { wallet_hash: walletHash }, { skipAbortManager: true })
      .then(() => true)
      .catch(error => {
        if (isCanceledError(error)) throw error
        // A duplicate POST is a 500 server-side (UNIQUE constraint on the
        // encrypted wallet hash). The record does exist, so treat it as success.
        if (error?.response?.status === 500) {
          console.warn('createUserPromoData returned 500 (record likely already exists)')
          return true
        }
        throw error
      })
  }).catch(error => {
    console.error('Failed to create UserPromo: ' + describeError(error))
    return false
  })
}

export async function createUserRewardsData () {
  return await createData('userreward/', { wallet_hash: getWalletHash() })
}

export async function createRfPromoData () {
  return await createData('rfpromo/', { wallet_hash: getWalletHash() })
}

// ========== update functions ==========

export async function updateUserPromoData (data) {
  const walletHash = getWalletHash()
  if (!walletHash) return null
  // Records `last_viewed` and the 0/0 public key. Skipping the abort manager
  // keeps that bookkeeping from being dropped by an unrelated navigation.
  return await updateData(`userpromo/${walletHash}/`, data, true)
}

export async function updateUserRewardsData(id, data) {
  return await updateData(`userreward/${id}/`, data)
}

export async function updateRfPromoData (id, data) {
  return await updateData(`rfpromo/${id}/`, data)
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
  return await processPoints('userreward/process_cauldron_points/', data, true)
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
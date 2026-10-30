import axios from 'axios'

import { Store } from 'src/store'
import { convertCashAddress } from 'src/wallet/chipnet'
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'
import { requestManager } from 'src/utils/request-manager'

// const ENGAGEMENT_HUB_URL =
//   process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const ENGAGEMENT_HUB_URL = 'http://127.0.0.1:8000/api/'
export const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })
requestManager.attachTo(REWARDS_URL)
export const ELITEPROGRAM_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}eliteprogram/` })
requestManager.attachTo(ELITEPROGRAM_URL)
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
// Paytaca Elite Program enums
// ================================

export const EliteStatus = Object.freeze({
  CHECKING: 'checking',
  LOCKED: 'locked',
  ACTIVE: 'active',
  PAUSED: 'paused'
})

export const EliteStatusLabels = Object.freeze({
  [EliteStatus.CHECKING]: 'Checking',
  [EliteStatus.LOCKED]: 'Locked',
  [EliteStatus.ACTIVE]: 'Active',
  [EliteStatus.PAUSED]: 'Paused'
})

export const EliteRedeemErrorCode = Object.freeze({
  Unknown: 'ELITE-RDM-00',
  WalletUnavailable: 'ELITE-RDM-01',
  PointsLoadFailed: 'ELITE-RDM-02',
  SwapConfigUnavailable: 'ELITE-RDM-03',
  ContractBalanceUnavailable: 'ELITE-RDM-04',
  InsufficientBchForFee: 'ELITE-RDM-05',
  ContractTransactionFailed: 'ELITE-RDM-06',
  SwapFailedAfterBroadcast: 'ELITE-RDM-07',
  RecordFailedAfterSwap: 'ELITE-RDM-08'
})

const ELITE_REDEEM_ERROR_CODES = new Set(Object.values(EliteRedeemErrorCode))

export function appendEliteRedeemErrorRef (message, errorCode) {
  const ref = ELITE_REDEEM_ERROR_CODES.has(errorCode)
    ? errorCode
    : EliteRedeemErrorCode.Unknown
  return `${message} (${ref})`
}

export const EliteTxType = Object.freeze({
  OTC: 'otc',
  MARKETPLACE: 'mkp'
})

export const EliteTxTypeLabels = Object.freeze({
  [EliteTxType.OTC]: 'Over-the-counter',
  [EliteTxType.MARKETPLACE]: 'Marketplace'
})
export const getEliteTxTypeLabel = type => EliteTxTypeLabels[type] || 'Unknown purchase'

export const EliteTxTypeIcons = Object.freeze({
  [EliteTxType.OTC]: 'store',
  [EliteTxType.MARKETPLACE]: 'img:marketplace.svg'
})

export const EliteTxTypeRefLabels = Object.freeze({
  [EliteTxType.OTC]: 'Ref. ID',
  [EliteTxType.MARKETPLACE]: 'Order #'
})

export const EliteAsset = Object.freeze({
  BCH: 'sats',
  LIFT: 'lift'
})

export const EliteAssetLabels = Object.freeze({
  [EliteAsset.BCH]: 'BCH',
  [EliteAsset.LIFT]: 'LIFT Token'
})
export const getEliteAssetLabel = asset => EliteAssetLabels[asset] || 'Unknown asset'

export const EliteAssetIcons = Object.freeze({
  [EliteAsset.BCH]: 'img:bch-logo.png',
  [EliteAsset.LIFT]: 'img:lift-token.png'
})

// ================================
// util functions
// ================================

/**
 * Detects a request that was torn down rather than answered by the server.
 *
 * Aborts come back as `createError('Request aborted', config, 'ECONNABORTED')`
 * from the RequestManager (it aborts the underlying XHR on navigation), and
 * `ECONNABORTED` is the convention the rest of the app already uses to spot
 * those — see `src/utils/subscription-utils.js` and the exchange/ramp request
 * error handlers.
 */
function isCanceledError (error) {
  return axios.isCancel?.(error) === true
    || error?.message === 'canceled'
    || error?.code === 'ECONNABORTED'
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

function toRewardsApiError (error) {
  const data = error?.response?.data
  const message = typeof data === 'string' && data ? data : describeError(error)
  return {
    ...(data && typeof data === 'object' ? data : {}),
    error: message,
    status: error?.response?.status ?? null
  }
}

function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retries `fn` a few times with a linear backoff.
 *
 * Rewards data is required to render the app, and a single dropped request
 * used to leave the page permanently broken for the rest of the session.
 * Only transient failures are retried. A 4xx is a real answer from the
 * server, and a cancelled request was torn down because the user navigated
 * away — retrying either just re-fires work nobody is waiting for.
 */
async function withRetry (fn, { retries = 2, delayMs = 400 } = {}) {
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error
      const status = error?.response?.status
      const isRetriable = !isCanceledError(error) && (!status || status >= 500)
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
 * Always resolves, so callers never need a try/catch:
 *   - the response body on success
 *   - `{}` when the resource does not exist (404), when the request was
 *     cancelled, or when it failed after retrying
 *
 * Returning `{}` for failures is deliberate: callers read that as "no record
 * yet" and bootstrap instead of rendering a dead error card with no way to
 * recover. Transient failures are retried first, so the `{}` fallback is only
 * reached when retrying would not help.
 */
async function getData (url, skipAbortManager = false) {
  try {
    return await withRetry(async () => {
      const response = await REWARDS_URL
        .get(url, skipAbortManager ? { skipAbortManager: true } : undefined)
      return response.data
    })
  } catch (error) {
    // A 404 is a real answer ("no record yet") and a cancel is a navigation
    // teardown; neither is worth reporting. Anything else is logged, but is
    // still not fatal — the caller falls back to bootstrapping.
    if (error?.response?.status !== 404 && !isCanceledError(error)) {
      console.error('Failed to GET ' + url + ': ' + describeError(error))
    }
    return {}
  }
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

export async function getAssetsThresholds (programId = null) {
  // Throws rather than substituting a fallback. These values gate enrollment, and
  // the two assets are in different units -- the BCH one is fiat PHP despite its
  // key name, the LIFT one is atomic units. Pass the enrolled Program's id to get
  // its age-based floor; without one the base is returned. A hardcoded guess that
  // is merely plausible is worse than an error, so the caller shows its retry state.
  return await ELITEPROGRAM_URL
    .get(
      'get_assets_min_thresholds/',
      programId ? { params: { program: programId } } : undefined
    )
    .then(resp => {
      if (resp.status === 200) return resp.data
      throw new Error(`Unexpected status ${resp.status} fetching Elite Program thresholds`)
    })
}

export async function enrollEliteProgram (walletHash, lookupKey) {
  try {
    const resp = await ELITEPROGRAM_URL.post(
      'enroll/',
      { wallet_hash: walletHash, lookup_key: lookupKey },
      { headers: { 'X-Elite-Program-Key': process.env.ELITE_PROGRAM_API_KEY } }
    )
    return { ok: true, data: resp.data }
  } catch (error) {
    const aborted = Boolean(error?.message?.includes('aborted'))
    if (!aborted) {
      console.error(error)
    }
    return {
      ok: false,
      aborted,
      status: error?.response?.status ?? null,
      code: error?.response?.data?.code ?? null
    }
  }
}

export async function getEliteProgramSummaryData (id) {
  return await ELITEPROGRAM_URL
    .get(`${id}/`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return null
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return null
    })
}

export async function getEliteProgramTransactionsData (id, limit, offset) {
  return await ELITEPROGRAM_URL
    .get(`${id}/transactions/?limit=${limit}&offset=${offset}`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return []
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return []
    })
}

export async function getEliteProgramTopupsData (id, limit, offset) {
  return await ELITEPROGRAM_URL
    .get(`${id}/topups/?limit=${limit}&offset=${offset}`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return []
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return []
    })
}

export async function getEliteProgramHistorySummaryData (id) {
  return await ELITEPROGRAM_URL
    .get(`${id}/summary/`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return null
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return null
    })
}

export async function getEliteProgramMonthlyStats (id) {
  return await ELITEPROGRAM_URL
    .get(`${id}/monthly/`)
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return null
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return null
    })
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
    .then(() => { return {} })
    .catch(error => {
      console.error(error)
      return error.response?.data || { error: error.message || 'Network error' }
    })
}

export async function awardInitialUP (data) {
  return await REWARDS_URL
    .post('userreward/award_initial_points/', data)
    .then(() => {})
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
      if (!isCanceledError(error)) {
        console.error('Failed to POST userpromo/process_promo_tokens_swap/: ' + describeError(error))
      }
      return toRewardsApiError(error)
    })
}

export async function recordPointsRedemption (data) {
  return await REWARDS_URL
    .post('userpromo/record_points_redemption/', data)
    .then(response => {
      if (response.status >= 200 && response.status < 300) {
        return { error: '', status: response.status }
      }
      const responseData = response.data
      const message = typeof responseData === 'string' && responseData
        ? responseData
        : responseData?.error || responseData?.detail || `Unexpected status ${response.status}`
      return {
        ...(responseData && typeof responseData === 'object' ? responseData : {}),
        error: message,
        status: response.status
      }
    })
    .catch(error => {
      if (!isCanceledError(error)) {
        console.error('Failed to POST userpromo/record_points_redemption/: ' + describeError(error))
      }
      return toRewardsApiError(error)
    })
}
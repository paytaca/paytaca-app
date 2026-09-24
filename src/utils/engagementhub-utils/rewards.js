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

async function processPoints (url, data, skipAbortManager=false) {
  return await REWARDS_URL
    .post(url, data, skipAbortManager ? { skipAbortManager: true } : undefined)
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

async function createData (url, data = {}) {
  return await REWARDS_URL
    .post(url, data)
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

export async function getAssetsThresholds () {
  return await ELITEPROGRAM_URL
    .get('get_assets_min_thresholds/')
    .then(resp => {
      if (resp.status === 200) return resp.data
      else {
        return { // default values agreed upon from initial meeting
          bch_min_threshold: 1000,
          lift_min_threshold: 100
        }
      }
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return { // default values agreed upon from initial meeting
          bch_min_threshold: 1000,
          lift_min_threshold: 100
        }
    })
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

function generateEliteTransactions () {
  const entries = []
  const otcMerchants = ['Kapitolyo OTC', 'Greenhills OTC', 'Divisoria OTC', 'Alabang OTC', 'Mall of Asia OTC']
  const marketplaceMerchants = ['Talisay Store', 'Bacolod Market', 'Cebu Collectibles', 'Davao Depot', 'Iloilo Finds']
  for (let i = 0; i < 30; i++) {
    const type = i % 2 === 0 ? 'otc' : 'marketplace'
    const bchSpent = Number((0.0003 + (i % 6) * 0.0003).toFixed(4))
    const liftCashback = Number((0.3 + (i % 5) * 0.5).toFixed(1))
    const date = new Date(Date.UTC(2026, 8, 28 - i, 9 + (i % 8), 15 + (i % 45)))
    const merchants = type === 'otc' ? otcMerchants : marketplaceMerchants
    entries.push({
      type,
      merchantName: merchants[i % merchants.length],
      refId: type === 'otc' ? String(10000000 + i * 7).padStart(8, '0') : undefined,
      orderId: type === 'marketplace' ? String((i * 3) % 1000).padStart(3, '0') : undefined,
      txId: `${String.fromCharCode(97 + (i % 26))}${(i + 10).toString(16)}4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e`,
      bchSpent,
      liftCashback,
      date: date.toISOString()
    })
  }
  return entries
}

function generateEliteTopups () {
  const entries = []
  for (let i = 0; i < 25; i++) {
    const asset = i % 2 === 0 ? 'bch' : 'lift'
    const amount = asset === 'bch'
      ? Number((0.001 + (i % 7) * 0.001).toFixed(4))
      : 10 + (i % 9) * 10
    const date = new Date(Date.UTC(2026, 8, 24 - i, 8 + (i % 7), 5 + (i % 50)))
    entries.push({
      asset,
      txId: `${String.fromCharCode(104 + (i % 26))}${(i + 20).toString(16)}0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e`,
      amount,
      date: date.toISOString()
    })
  }
  return entries
}

function buildEliteSummary (transactions, topups) {
  const totalBchSpent = transactions.reduce((sum, t) => sum + t.bchSpent, 0)
  const totalCashbackLift = transactions.reduce((sum, t) => sum + t.liftCashback, 0)
  const bchTopups = topups.filter(t => t.asset === 'bch')
  const liftTopups = topups.filter(t => t.asset === 'lift')
  return {
    transactions: {
      totalCashbackLift: Number(totalCashbackLift.toFixed(2)),
      eligibleTxCount: transactions.length,
      totalBchSpent: Number(totalBchSpent.toFixed(4))
    },
    topups: {
      totalCount: topups.length,
      totalBch: Number(bchTopups.reduce((sum, t) => sum + t.amount, 0).toFixed(4)),
      totalLift: Number(liftTopups.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
    }
  }
}

export async function getEliteProgramPageData () {
  // TODO: Replace mock data with the real engagement-hub endpoint once the
  // Paytaca Elite API is available (e.g. `await getData('elite/${getWalletHash()}/details/')`)
  const transactions = generateEliteTransactions()
  const topups = generateEliteTopups()
  const summary = buildEliteSummary(transactions, topups)
  return {
    status: 'active', // 'active' | 'paused'
    cashbackLift: summary.transactions.totalCashbackLift,
    eligibleTxCount: summary.transactions.eligibleTxCount,
    monthlyCashback: 350, // current month cashback in PHP
    maxCashbackPerMonth: 1000, // PHP 1,000
    transactions,
    topups,
    summary
  }
}

export async function getEliteProgramHistoryData ({ type, limit = 10, offset = 0 }) {
  // TODO: Replace mock data with the real engagement-hub endpoint once the
  // Paytaca Elite API is available (e.g. `await getData('elite/${getWalletHash()}/history/', { type, limit, offset })`)
  const transactions = generateEliteTransactions()
  const topups = generateEliteTopups()
  const items = type === 'topups' ? topups : transactions
  const sliced = items.slice(offset, offset + limit)
  return {
    items: sliced,
    hasMore: offset + sliced.length < items.length,
    summary: buildEliteSummary(transactions, topups)
  }
}

// ========== create functions ==========

export async function createUserPromoData () {
  await REWARDS_URL
    .post('userpromo/', { wallet_hash: getWalletHash() })
    .then(() => {})
    .catch(error => { console.error(error) })
}

export async function createUserRewardsData () {
  return await createData('userreward/', { wallet_hash: getWalletHash() })
}

export async function createRfPromoData () {
  return await createData('rfpromo/', { wallet_hash: getWalletHash() })
}

// ========== update functions ==========

export async function updateUserPromoData (data) {
  await updateData(`userpromo/${getWalletHash()}/`, data)
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
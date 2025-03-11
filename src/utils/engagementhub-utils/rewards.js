import axios from 'axios'
import { Store } from 'src/store'
import { convertToBCH } from 'src/utils/denomination-utils'

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })

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

function bchMarketPrice () {
  if (!fiatCurrency()) return 0
  return Store.getters['market/getAssetPrice']('bch', fiatCurrency())
}

function getWalletHash () {
  return Store.getters['global/getWallet']('bch')?.walletHash
}

// ================================
// util functions
// ================================

export function convertPoints (points, pointsDivisor) {
  const fiat = points / pointsDivisor
  const bch = convertToBCH(denomination(), (fiat / bchMarketPrice()))

  const finalFiat = `${fiat} ${fiatCurrency()}`
  const bchNum = Number(bch) === 0 || Number.isNaN(Number(bch)) ? '0' : bch.toFixed(8)
  const finalBch = `${bchNum} ${denomination()}`

  return `${finalFiat} or ${finalBch}`
}

export function parseLocaleDate (date, isDayIncluded = true) {
  const d = new Date(date)
  const options = {
    year: 'numeric',
    month: 'long'
  }

  if (isDayIncluded) options.day = 'numeric'

  return d.toLocaleDateString(undefined, options)
}

// ================================
// functions with calls to engagement hub
// ================================

/**
 * Process points depending on given url and data.
 * @returns true if points were processed successfully;
 * false otherwise
 */
async function processPoints (url, data) {
  return await REWARDS_URL
    .post(url, data)
    .then(_response => { return true })
    .catch(_error => { return false })
}

export async function getUserRewardsData (id) {
  return await REWARDS_URL
    .get(`userreward/${id}/`)
    .then(response => { return response.data })
    .catch(_error => { return null })
}

export async function createUserRewardsData () {
  return await REWARDS_URL
    .post('userreward/')
    .then(response => { return response.data })
    .catch(error => {
      console.error(error)
      return null
    })
}

export async function processReferralCode (data) {
  await REWARDS_URL
    .post('userreward/process_referral_code/', data)
    .then(_response => { return false })
    .catch(error => {
      console.error(error)
      return true
    })
}

export async function getUserPromoData () {
  return await REWARDS_URL
    .get(`userpromo/${getWalletHash()}/`)
    .then(response => { return response.data })
    .catch(_error => { return null })
}

export async function createUserPromoData () {
  await REWARDS_URL
    .post('userpromo/', { wallet_hash: getWalletHash() })
    .then(_response => { })
    .catch(error => { console.error(error) })
}

export async function updateUserPromoData (data) {
  await REWARDS_URL
    .patch(`userpromo/${getWalletHash()}/`, data)
    .then(_response => { })
    .catch(error => { console.error(error) })
}

export async function getRfPromoData (id) {
  return await REWARDS_URL
    .get(`rfpromo/${id}/`)
    .then(response => { return response.data })
    .catch(_error => { return null })
}

export async function createRfPromoData () {
  return await REWARDS_URL
    .post('rfpromo/')
    .then(response => { return response.data })
    .catch(error => {
      console.error(error)
      return null
    })
}

export async function getPromoPointsDivisorData () {
  return await REWARDS_URL
    .get('promopointsdivisor/')
    .then(response => { return response.data })
    .catch(error => {
      console.error(error)
      // return initial values set during marketing planning
      return {
        ur_divisor: 4,
        rfp_divisor: 4
      }
    })
}

export async function processCashinPoints (data) {
  return await processPoints('userreward/process_cashin_points/', data)
}

export async function processOnetimePoints (data) {
  return await processPoints('userreward/process_onetime_points/', data)
}

export async function processContinuousPoints (data) {
  return await processPoints('userreward/process_continuous_points/', data)
}

export async function processPointsRedemption (data) {
  return await processPoints('userpromo/process_points_redemption/', data)
}

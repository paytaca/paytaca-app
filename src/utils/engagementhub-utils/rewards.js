import axios from 'axios'
import { deriveHdPrivateNodeFromSeed, deriveHdPath, secp256k1 } from '@bitauth/libauth'
import { Store } from 'src/store'
import { convertToBCH } from 'src/utils/denomination-utils'
import { getMnemonic } from 'src/wallet'
import { getWallet } from 'src/utils/send-page-utils'
import { convertCashAddress } from 'src/wallet/chipnet'

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const REWARDS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}rewards/` })

export const Promos = {
  USERREWARDS: 'ur',
  RFPROMO: 'rfp' //,
  // LOYALTYPROMO: 'lp',
  // CHAMPIONPROMO: 'cp',
  // PPRPROMO: 'pprp'
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

export async function getKeyPairFromWalletMnemonic () {
  const mnemonic = await getMnemonic(Store.getters['global/getWalletIndex'])
    .then(mnemonic => {
      return mnemonic
    })
  const rootNode = deriveHdPrivateNodeFromSeed(mnemonic, true)
  const childNode = deriveHdPath(rootNode, getWallet('bch').derivationPath)
  const childPub = secp256k1.derivePublicKeyCompressed(childNode.privateKey)
  const childPriv = childNode.privateKey

  if (typeof childPub === 'string') throw new Error(childPub)

  return { pubKey: childPub, privKey: childPriv }
}

export async function getWalletTokenAddress () {
  const bchAddress = Store.getters['global/getAddress']('bch')
  return convertCashAddress(bchAddress, false, true)
}

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

// ========== reusable functions ==========

/**
 * Process points depending on given url and data.
 * @returns true if points were processed successfully;
 * false otherwise
 */
async function processPoints (url, data) {
  return await REWARDS_URL
    .post(url, data)
    .then(response => { return response.status === 200 })
    .catch(_error => { return false })
}

async function getData (url) {
  return await REWARDS_URL
    .get(url)
    .then(response => { return response.data })
    .catch(_error => { return null })
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
  await REWARDS_URL
    .patch(url, data)
    .then(_response => {})
    .catch(error => { console.error(error) })
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
  await updateData(`userreward/${id}/`, data)
}

export async function updateRfPromoData (id, data) {
  await updateData(`rfpromo/${id}/`, data)
}

// ========== other functions ==========

export async function processReferralCode (data) {
  await REWARDS_URL
    .post('userreward/process_referral_code/', data)
    .then(_response => { return false })
    .catch(error => {
      console.error(error)
      return true
    })
}

export async function getPromoPointsDivisorData () {
  return await REWARDS_URL
    .get('promopointsdivisor/')
    .then(response => { return response.data })
    .catch(error => {
      console.error(error)
      // return initial values set during first marketing planning
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

export async function getContractInitialBalance (data) {
  return await REWARDS_URL
    .post('userpromo/send_contract_initial_balance/', data)
    .then(response => { return response.status === 200 })
    .catch(_error => { return false })
}
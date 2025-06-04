import axios from 'axios'

import { getWalletHash } from 'src/utils/engagementhub-utils/shared'

export const SaleGroup = {
  SEED: 'seed',
  PRIVATE: 'priv',
  PUBLIC: 'pblc'
}

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const LIFTTOKEN_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}lifttoken/` })

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
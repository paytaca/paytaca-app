import axios from 'axios'

import { getBchWallet, getWalletHash } from 'src/utils/engagementhub-utils/shared'

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const TRADE_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}trade/` })

// ================================
// functions with calls to engagement hub
// ================================

export async function getPtcTradeData () {
  return await TRADE_URL
    .get(`ptctrade/${getWalletHash()}`)
    .then(response => { return response.data })
    .catch(_error => { return null })
}

export async function createSaleContractApi (saleGroup) {
  const data = {
    wallet_hash: getWalletHash(),
    xpubkey: getBchWallet().xPubKey,
    sale_group: saleGroup
  }
  return await TRADE_URL
    .post('ptctrade/create_sale_contract/', data)
    .then(response => {
      if (response.status === 201) return response.data
      else return null
    })
    .catch(_error => { return null })
}
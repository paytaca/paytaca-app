import { hexToBin } from "@bitauth/libauth"
import { OracleData } from "@generalprotocols/price-oracle"
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'

import axios from 'axios'
import Watchtower from "watchtower-cash-js"


const watchtower = new Watchtower(false)
const btcGenesisBlock = 1231006505;

export const SaleGroup = {
  SEED: 'seed',
  PRIVATE: 'priv',
}

export const SaleGroupPrice = {
  seed: 0.015,
  priv: 0.03
}

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const LIFTTOKEN_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}lifttoken/` })

const ORACLE_PUBKEY =
  process.env.ORACLE_PUBKEY_USD ||
  "02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818";
const ORACLE_RELAY = process.env.ORACLE_RELAY || "oracles.generalprotocols.com";

// ================================
// Promise functions
// ================================

export async function getAddressPath(address) {
  return await watchtower.BCH._api
    .post(`address-info/bch/${address}`)
    .then(resp => {
      return resp.data.address_path
    })
}

export async function getOracleData() {
  return await axios.get(
    `https://${ORACLE_RELAY}/api/v1/oracleMessages?publicKey=${ORACLE_PUBKEY}&count=1`
  ).then(async (response) => {
    const message = await OracleData.parseOracleMessage(
      hexToBin(response.data.oracleMessages[0].message)
    );
    const price =
      (message.dataContent[0] |
        (message.dataContent[1] << 8) |
        (message.dataContent[2] << 16) |
        (message.dataContent[3] << 24)) >>>
      0;
    return {
      price: price / 10 ** 2,
      messageTimestamp: message.messageTimestamp
    };
  })
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

export function updateRsvpPublicKeys (data) {
  return  LIFTTOKEN_URL
    .patch(`reservation/${getWalletHash()}/`, data)
    .catch(error => console.error(error))
}

export async function confirmReservationApi(data) {
  return await LIFTTOKEN_URL
    .post('reservation/confirm_reservation/', data)
    .then(response => { return response.status === 200 })
    .catch(_error => { return false })
}
import { hexToBin } from "@bitauth/libauth"
import { OracleData } from "@generalprotocols/price-oracle"
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'
import { Contract, ElectrumNetworkProvider } from "cashscript"

import axios from 'axios'
import BCHJS from "@psf/bch-js";
import Watchtower from "watchtower-cash-js"


import VestingContractArtifact from 'src/cashscripts/lift-token/VestingContractv3.json'

const bchjs = new BCHJS();
const watchtower = new Watchtower(false)

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
// Contract functions
// ================================

export function initializeVestingContract(buyerPubkey, liftTokenId, adminPubkey, lockupEnd, amount) {
  const provider = new ElectrumNetworkProvider('mainnet')
  const contractParams = [
    bchjs.Crypto.hash160(Buffer.from(buyerPubkey, 'hex')), // buyer pubkey hash
    changeEndianness(liftTokenId), // LIFT token ID
    adminPubkey, // admin pubkey
    BigInt(convertDateToBlockHeight(lockupEnd)), // lockup end
    BigInt(amount), // total LIFT tokens purchased
  ]

  return new Contract(VestingContractArtifact, contractParams, { provider })
}

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
// Non-promise functions
// ================================

/**
 * Swaps the endian-ness (byte order) of the string,
 * since the contract uses the reversed order.
 * From https://stackoverflow.com/a/47668549.
 * @param {string} string the string to be reversed
 * @returns the swapped string
 */
export function changeEndianness(string) {
  const result = [];
  let len = string.length - 2;
  while (len >= 0) {
    result.push(string.substring(len, len + 2));
    len -= 2;
  }
  return result.join("");
}

/**
 * Convert the target date to equivalent block height. The date will first
 * be converted to an integer timestamp, then it will be converted to
 * block height. The value used for the blocks per second is only an
 * average, since block times are inconsistent. This is done because using
 * block height in the contract is more accurate than age.
 * @param {number | string | Date} date the target date to be converted
 * @returns the converted date
 */
export function convertDateToBlockHeight(date) {
  // BTC Genesis Block | January 03 2009, 18:15:05 UTC
  const btcGenesisBlock = 1231006505;
  const dateTimestamp = Math.floor(new Date(date).getTime() / 1000);

  if (dateTimestamp < btcGenesisBlock) {
    throw new Error(
      "Date stamp cannot be before the date of BTC genesis block."
    );
  }

  const secondsSinceGenesis = dateTimestamp - btcGenesisBlock;
  return Math.floor(secondsSinceGenesis / 600);
}

// ================================
// Functions with calls to engagement hub
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

export async function getIdAndPubkeyApi() {
  return await LIFTTOKEN_URL
    .get('purchase/get_id_and_pubkey/')
    .then(response => {
      if (response.status === 200) return response.data
      return null
    })
    .catch(_error => { return null } )
}
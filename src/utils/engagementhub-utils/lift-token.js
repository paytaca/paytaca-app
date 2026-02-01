import { hexToBin } from "@bitauth/libauth"
import { OracleData } from "@generalprotocols/price-oracle"
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'
import { Contract, ElectrumNetworkProvider } from "cashscript"
import { NFTCapability, Wallet } from 'mainnet-js'

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

// ================================
// Separate section for the function to send custom payment transaction
// consolidated BCH + NFT with 38-byte commitment data for swap contract
// ================================

export async function sendCustomPayment(data) {
  try {
    // gather needed utxos
    const utxos = await getUtxosFromWatchtower(data.walletHash)
    if (utxos.length === 0) {
      throw new Error('No UTXOs found')
    }
  
    // get wif from utxos[0] address_path
    const wif = await data.libauthWallet.getPrivateKeyWifAt(utxos[0].address_path)
    // generate wallet from wif
    const wallet = await Wallet.fromWIF(wif)
    // generate token genesis transaction
    const genResp = await wallet.tokenGenesis({
      cashaddr: data.swapContractAddress,
      amount: 0n,
      commitment: generateNftCommitment(data.nftData),
      capability: NFTCapability.mutable,
      value: BigInt(data.amount),
    })
  
    return { success: true, txid: genResp.txId }
  } catch (error) {
    console.error('sendCustomPayment error:', error)
    return { success: false, txid: null }
  }
}

async function getUtxosFromWatchtower(walletHash) {
  // get utxos of wallethash from watchtower
  const utxos = await watchtower.BCH._api
    .get(`utxo/wallet/${walletHash}/?is_cashtoken=false`)
    .then(resp => {
      const utxos = resp.data.utxos
      // Group utxos by address_path and filter to only
      // those belonging to the most common address_path
      if (!utxos || utxos.length === 0) return []
      // Count occurrences of each address_path
      // Only count utxos with vout === 0
      const counts = utxos.reduce((acc, utxo) => {
        if (utxo.vout === 0) {
          acc[utxo.address_path] = (acc[utxo.address_path] || 0) + 1;
        }
        return acc;
      }, {});
      // Find the address_path with the greatest count
      const maxCount = Math.max(...Object.values(counts));
      const mostCommonPaths = Object.entries(counts)
        .filter(([_, cnt]) => cnt === maxCount)
        .map(([address_path]) => address_path);
      // If tie, select the path whose utxo has the highest value
      // and vout == 0; otherwise pick the first path
      let selectedPath = mostCommonPaths[0];
      if (mostCommonPaths.length > 1) {
        // Find utxos with vout === 0 among most common paths
        let bestPath = null;
        let bestValue = -1;
        for (const path of mostCommonPaths) {
          const matchingUtxos = utxos.filter(u => u.address_path === path && u.vout === 0);
          if (matchingUtxos.length > 0) {
            // Pick highest value utxo for this path
            const maxValueUtxo = matchingUtxos.reduce(
              (maxUtxo, u) => u.value > maxUtxo.value ? u : maxUtxo, matchingUtxos[0]
            );
            if (maxValueUtxo.value > bestValue) {
              bestPath = path;
              bestValue = maxValueUtxo.value;
            }
          }
        }
        if (bestPath !== null) {
          selectedPath = bestPath;
        }
      }
      // Filter utxos to only those with the selected address_path
      const filteredUtxos = utxos
        .filter(u => u.address_path === selectedPath)
        .sort((a, b) => b.value - a.value)
      
      return filteredUtxos
    })
  return utxos
}

function generateNftCommitment(nftData) {
  // convert oracleMessageTimestamp to bytes4
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, nftData.oracleMessageTimestamp, true);
  const timestampBytes = new Uint8Array(buffer);

  // convert vesting contract script hash
  const vestingBytes32 = bchjs.Crypto.hash256(Buffer.from(nftData.bytecode, "hex"));

  return Buffer.from([
    0x02,
    nftData.isEarlySupporter ? 0x00 : 0x01,
    ...vestingBytes32,
    ...timestampBytes,
  ]).toString('hex')
}
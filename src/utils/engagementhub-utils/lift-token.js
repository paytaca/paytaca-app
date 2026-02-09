import { hexToBin } from "@bitauth/libauth"
import { OracleData } from "@generalprotocols/price-oracle"
import { Contract, ElectrumNetworkProvider } from "cashscript"
import { NFTCapability, Wallet } from 'mainnet-js'
import { getWalletHash } from 'src/utils/engagementhub-utils/shared'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { getChangeAddress } from 'src/utils/send-page-utils'

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
// Purchase flow utility function
// ================================

/**
 * Executes the complete purchase flow for LIFT tokens
 * Consolidates duplicated logic from PayReservationConfirmDialog and BuyLiftDialog
 * @param {Object} params - Purchase flow parameters
 * @param {Object} params.purchase - Purchase data { tkn, usd, bch } or { tkn, usd, sats }
 * @param {string} params.liftSwapContractAddress - Contract address
 * @param {string} params.saleGroup - Sale group code ('seed', 'priv', etc.)
 * @param {number} params.messageTimestamp - Oracle message timestamp (optional, will fetch if missing/zero)
 * @param {Object} params.wallet - Wallet instance
 * @param {number} params.walletBalance - Wallet balance in BCH
 * @param {number} params.reservationId - Reservation ID (optional, -1 for direct purchases)
 * @param {number} params.partialPurchaseId - Partial purchase ID (optional, -1 for direct purchases)
 * @param {Function} params.getStoreGetter - Function to access Vuex store getters: (path) => value
 * @returns {Promise<Object>} { success: boolean, txid: string, data: Object, vestingContract: Object, buyerAddress: string, pubkeyHex: string }
 */
export async function executePurchaseFlow(params) {
  const {
    purchase,
    liftSwapContractAddress,
    saleGroup,
    messageTimestamp: providedMessageTimestamp,
    wallet,
    walletBalance,
    reservationId = -1,
    partialPurchaseId = -1,
    getStoreGetter,
  } = params

  // Validate contract address
  if (!liftSwapContractAddress) {
    throw new Error('ContractAddressUnavailable')
  }

  // Validate wallet
  if (!wallet) {
    throw new Error('WalletUnavailable')
  }

  // Calculate payment amount in sats
  let paymentSats
  if (purchase.sats !== undefined) {
    paymentSats = purchase.sats
  } else if (purchase.bch !== undefined) {
    paymentSats = Math.floor(Number(purchase.bch.toFixed(8) || 0) * 10 ** 8)
  } else {
    throw new Error('InvalidPurchaseAmount')
  }

  // Validate purchase amount
  if (paymentSats <= 0 || Number.isNaN(paymentSats)) {
    throw new Error('InvalidPurchaseAmount')
  }

  // Validate and fetch oracle data if messageTimestamp is missing or zero
  let validMessageTimestamp = providedMessageTimestamp
  if (!validMessageTimestamp || validMessageTimestamp === 0) {
    try {
      const oracleData = await getOracleData()
      validMessageTimestamp = oracleData.messageTimestamp || validMessageTimestamp
      if (!validMessageTimestamp || validMessageTimestamp === 0) {
        throw new Error('FailedToGetOracleData')
      }
    } catch (err) {
      console.warn('Failed to refresh oracle data:', err)
      throw new Error('FailedToGetOracleData')
    }
  }

  // Generate BCH address dynamically
  const { generateReceivingAddress, getDerivationPathForWalletType } = await import('src/utils/address-generation-utils.js')
  const addressIndex = getStoreGetter('global/getLastAddressIndex')('bch')
  const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
  const buyerAddress = await generateReceivingAddress({
    walletIndex: getStoreGetter('global/getWalletIndex'),
    derivationPath: getDerivationPathForWalletType('bch'),
    addressIndex: validAddressIndex,
    isChipnet: getStoreGetter('global/isChipnet')
  })
  if (!buyerAddress) {
    throw new Error('FailedToGenerateAddress')
  }

  // Get address path and pubkey
  const addressPath = await getAddressPath(buyerAddress)
  const walletIndex = getStoreGetter('global/getWalletIndex')
  const { loadLibauthHdWallet } = await import('src/wallet')
  const libauthWallet = await loadLibauthHdWallet(walletIndex, false)
  const pubkeyHex = libauthWallet.getPubkeyAt(addressPath).toString('hex')

  // Get contract data
  const idPubkeyData = await getIdAndPubkeyApi()
  if (!idPubkeyData) {
    console.error('Failed to get ID and pubkey data')
    throw new Error('FailedToGetContractData')
  }
  const { token_id, pubkey } = idPubkeyData

  // Compute lockup end based on current date and sale group
  const year = saleGroup === 'seed' ? 2 : 1
  const lockupEnd = new Date(new Date().setFullYear(new Date().getFullYear() + year))

  // Get token amount (ensure it's in the correct format)
  const purchaseTkn = purchase.tkn || 0

  // Initialize vesting contract
  let vestingContract = null
  try {
    vestingContract = initializeVestingContract(pubkeyHex, token_id, pubkey, lockupEnd, purchaseTkn)
  } catch (error) {
    console.error('Failed to initialize vesting contract:', error)
    throw new Error('FailedToInitializeVestingContract')
  }

  // Send custom payment
  const result = await sendCustomPayment({
    walletHash: wallet._BCH.walletHash,
    amount: paymentSats,
    swapContractAddress: liftSwapContractAddress,
    wallet,
    spendable: walletBalance,
    libauthWallet,
    nftData: {
      isEarlySupporter: saleGroup === 'seed',
      oracleMessageTimestamp: validMessageTimestamp,
      bytecode: vestingContract.bytecode
    }
  })
  if (!result?.success || !result?.txid) {
    throw new Error('PaymentSendingError')
  }

  // Get token address
  const { getWalletTokenAddress } = await import('src/utils/engagementhub-utils/rewards')
  const tokenAddress = await getWalletTokenAddress()

  // Prepare API data
  const data = {
    purchased_amount_usd: purchase.usd || 0,
    purchased_amount_tkn: purchaseTkn,
    purchased_amount_sats: paymentSats,
    current_date: new Date().toISOString(),
    tx_id: result.txid,
    buyer_token_address: tokenAddress,
    buyer_tx_address: buyerAddress,
    reservation: reservationId,
    partial_purchase: partialPurchaseId,
    sale_group: saleGroup,
    public_key: pubkeyHex,
    message_timestamp: validMessageTimestamp,
    vesting_contract_address: vestingContract.address,
    lockup_end: lockupEnd,
  }

  // Process purchase via API
  const isSuccessful = await processPurchaseApi(data)
  if (!isSuccessful) {
    throw new Error('PurchasePaymentError')
  }

  return { success: true, txid: result.txid }
}

// ================================
// Separate section for the function to send custom payment transaction
// consolidated BCH + NFT with 38-byte commitment data for swap contract
// ================================

async function sendCustomPayment(data) {
  try {
    // gather needed utxos
    let utxos = await getUtxosFromWatchtower(data.walletHash)
    if (utxos.length === 0) {
      // throw new Error('No UTXOs found')
      // consolidate UTXOs in the background
      await consolidateUtxos(data.wallet, data.spendable)
      // sleep for 2 seconds to resolve UTXOs after consolidation
      await new Promise(resolve => setTimeout(resolve, 2000))

      // then gather needed utxos again
      utxos = await getUtxosFromWatchtower(data.walletHash)
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

/**
 * Selects UTXOs by filtering to the most common address_path.
 * If multiple paths have the same count, selects the path with the highest value UTXO.
 * @param {Array} utxos - Array of UTXO objects with address_path, vout, and value properties
 * @returns {Array} Filtered and sorted UTXOs (by value, descending)
 */
function selectUtxosByAddressPath(utxos) {
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
}

async function getUtxosFromWatchtower(walletHash) {
  // get utxos of wallethash from watchtower
  const utxos = await watchtower.BCH._api
    .get(`utxo/wallet/${walletHash}/?is_cashtoken=false`)
    .then(resp => selectUtxosByAddressPath(resp.data.utxos))
  return utxos
}

async function consolidateUtxos(wallet, spendable) {
  const changeAddress = await getChangeAddress('bch')
  const result = await getWalletByNetwork(wallet, 'bch').sendBch(
    undefined,
    '',
    changeAddress,
    null,
    undefined,
    [
      {
        address: changeAddress,
        amount: spendable - 0.00001,
        tokenAmount: undefined
      }
    ],
    undefined
  )

  if (!result?.success) {
    throw new Error('Failed to consolidate UTXOs')
  }
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

import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256, hexToBin } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadLibauthHdWallet, loadWallet as loadBchWallet } from 'src/wallet'
import { Store } from 'src/store'
import { markRaw } from 'vue'
import { minTokenValue } from './card/constants'
import { toTokenAddress } from 'src/utils/crypto.js'
import { isTokenAddress } from 'src/utils/address-utils.js'
import { DUST_LIMIT } from 'src/services/card/constants.js'

const DEFAULT_CHANGE_INDEX = 0
const DEFAULT_ADDRESS_INDEX = 0

/**
 * Lightweight wrapper around LibauthHDWallet providing only the essential cryptographic 
 * operations needed for feature implementation.
 * 
 * This class provides: 
 * - simple key derivation, 
 * - address generation,
 * - message signing/verification
 */
export class Wallet {
  /**
   * Create a Wallet.
   * @param {number} walletIndex - The index of the wallet.
   * @param {string} walletHash - The hash of the wallet.
   * @param {Object} [opts] - Optional parameters.
   * @param {number} [opts.changeIndex=DEFAULT_CHANGE_INDEX] - The change index.
   * @param {number} [opts.addressIndex=DEFAULT_ADDRESS_INDEX] - The address index.
   * @param {boolean} [opts.isChipnet=false] - Whether the wallet is for Chipnet.
   */
  constructor (walletIndex, walletHash, opts = { 
      changeIndex: DEFAULT_CHANGE_INDEX, 
      addressIndex: DEFAULT_ADDRESS_INDEX, 
      isChipnet: false
    }) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.changeIndex = opts.changeIndex
    this.addressIndex = opts.addressIndex
    this.isChipnet = opts.isChipnet
  }

  /**
   * Load the wallet.
   * @returns {Promise<void>}
   */
  async loadWallet () {
    this.libauthWallet = await loadLibauthHdWallet(this.walletIndex, this.isChipnet)
  }

  /**
   * Get the raw wallet.
   * @returns {Promise<Object>} The raw wallet.
   */
  async getRawWallet () {
    let rawWallet = await markRaw(loadBchWallet('BCH', this.walletIndex))
    if (this.isChipnet) {
      rawWallet = rawWallet.BCH_CHIP
    } else {
      rawWallet = rawWallet.BCH
    }
    return rawWallet
  }

  /**
   * Get the key pair.
   * @param {string} [addressPath=''] - The address path.
   * @returns {Object} The key pair.
   */
  keypair (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    const privateKeyWif = this.privkey(addressPath)
    const publicKey = this.pubkey(addressPath)
    return {
      privateKey: privateKeyWif,
      publicKey: publicKey
    }
  }

  /**
   * Get the address path.
   * @param {number} [addressIndex=this.addressIndex] - The index of the address.
   * @returns {string} The address path.
   */
  addressPath (addressIndex = this.addressIndex) {
    return `${this.changeIndex}/${addressIndex}`
  }

  /**
   * Get the change address path.
   * @returns {string} The change address path.
   */
  changeAddressPath () {
    return `1/${this.addressIndex}`
  }

  /**
   * Get the address.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The address.
   */
  address (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.libauthWallet.getAddressAt({ path: addressPath })
  }

  /**
   * Get the change address.
   * @returns {string} The change address.
   */
  changeAddress () {
    // const rawWallet = this.getRawWallet()
    // const addressSet = rawWallet.getAddressSetAt(this.addressIndex)
    // return addressSet.change
    const addressPath = this.changeAddressPath()
    return this.libauthWallet.getAddressAt({ path: addressPath })
  }

  /**
   * Get the token address.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The token address.
   */
  tokenAddress (addressPath = '') {
    const cashaddress = this.address(addressPath)
    return toTokenAddress(cashaddress)
  }

  /**
   * Get the public key.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The public key.
   */
  pubkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.libauthWallet.getPubkeyAt(addressPath)
  }

  /**
   * Get the private key in WIF format.
   * @param {string} [addressPath=''] - The address path.
   * @returns {string} The private key in WIF format.
   */
  privkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.libauthWallet.getPrivateKeyWifAt(addressPath)
  }

  /**
   * Sign a message.
   * @param {string} wif - The private key in WIF format.
   * @param {string} message - The message to sign.
   * @param {number} [timestamp=null] - The timestamp.
   * @returns {string} The signature.
   */
  signMessage (wif, message, timestamp = null) {
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = sha256.hash(utf8ToBin(message))
    const privateKeyBin = decodePrivateKeyWif(wif).privateKey
    if (typeof privateKeyBin === 'string') throw (new IncorrectWIFError(wif))
    const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
    if (typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin)
    return signature
  }

  /**
   * Verify a signed message.
   * @param {string} publicKey - The public key.
   * @param {string} message - The message to verify.
   * @param {string} signature - The signature.
   * @param {number} [timestamp=null] - The timestamp.
   * @returns {boolean} Whether the signature is valid.
   */
  verifyMessage (publicKey, message, signature, timestamp = null) {
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = sha256.hash(utf8ToBin(message))
    const publicKeyBin = hexToBin(publicKey)
    const signatureBin = hexToBin(signature)
    const isValid = secp256k1.verifySignatureDERLowS(signatureBin, publicKeyBin, messageHash)
    if (typeof isValid === 'string') throw new Error(isValid)
    return isValid
  }

  async getBchUtxos (address = null, amount = null) {
    console.log(`Fetching BCH UTXOs for address: ${address}, with amount: ${amount}`)
    let result = { cumulativeValue: 0, utxos: [] }
    const wallet = await this.getRawWallet()
    if (address) {
      result = await wallet.watchtower.BCH.getBchUtxos(address, amount, { confirmed: true })
    }
    result = await wallet.watchtower.BCH.getBchUtxos(`wallet:${this.walletHash}`, amount, { confirmed: true })
    return {
      cumulativeValue: result.cumulativeValue,
      utxos: result.utxos.map(utxo => ({
        txid: utxo.tx_hash,
        vout: utxo.tx_pos,
        satoshis: utxo.value,
        address_path: utxo.address_path,
        wallet_index: utxo.wallet_index
      }))
    }
  }

  async getTokenUtxos (tokenId, tokenAddress = null, opts = {}) {
    const wallet = await this.getRawWallet()
    if (!tokenAddress) tokenAddress = this.address()
    
    console.log('Getting token UTXOs for tokenId:', tokenId, 'at tokenAddress:', tokenAddress)
    if (!tokenAddress || isTokenAddress(tokenAddress) === false) {
      console.warn('Invalid or missing token address for getTokenUtxos:', tokenAddress)
      return []
    }

    const params = {
      is_cashtoken_nft: true
    }

    if (opts.capability) {
      params.capability = opts.capability
    }

    let result = []
    const response = await wallet.watchtower.BCH._api.get(`utxo/ct/${tokenAddress}/${tokenId}/`, { params: params })
    result = response.data?.utxos
    console.log('Returning token UTXOs:', result)
    return result.map(utxo => ({
      txid: utxo.txid,
      token: {
        category: utxo.tokenid,
        amount: BigInt(utxo.amount),
        nft: {
          capability: utxo.capability,
          commitment: utxo.commitment,
        }
      },
      vout: utxo.vout,
      value: BigInt(utxo.value)
    }))
  }

  /**
   * Create a funding UTXO (vout=0) for NFT-related operations.
   * @param {number|bigint} [satsAmount] - Amount in satoshis to send.
   * @param {string|null} [receivingAddress] - Destination address; defaults to the wallet's first receiving address.
   * @returns {Promise<Object>} API response with transaction details.
   */
  async createFundingUtxo (satsAmount, receivingAddress = null) {
    const wallet = await this.getRawWallet();
    if (!receivingAddress) {
      receivingAddress = (await wallet.getAddressSetAt(0)).receiving;
    }

    const { cumulativeValue, utxos } = await this.getBchUtxos(null, parseInt(satsAmount)); // Get UTXOs up to 100k sats
    console.log('cumulativeValue:', cumulativeValue);
    console.log('UTXOs found for vout=0:', utxos);
    if (utxos.length === 0) {
      console.log('No consolidation needed, 0 UTXOs found.');
      return;
    }
    
    // Use provided amount or estimate full requirement
    const estimatedFee = this.estimateFee({ numP2pkhInputs: utxos.length, numOutputs: 1 }); // Estimated fee for transaction
    const satsToSend = cumulativeValue - estimatedFee
    const bchAmount = Number(satsToSend) / 1e8;
    
    console.log(`Sending ${satsToSend} sats (${bchAmount} BCH) to address:`, receivingAddress);
    
    const sendResult = await wallet.sendBch(bchAmount, receivingAddress);
    console.log('Transaction sent:', sendResult);

    if (sendResult.success == false) {
      throw new Error(`Failed to create vout=0 UTXO: ${sendResult.error}`);
    }
    
    return sendResult;
  }

  async consolidateUtxos (receivingAddress = null) {
    console.log('Starting UTXO consolidation process...');
    const wallet = await this.getRawWallet();
    if (!receivingAddress) {
      receivingAddress = (await wallet.getAddressSetAt(0)).receiving;
    }

    const { cumulativeValue, utxos } = await this.getBchUtxos(null, 100000); // Get UTXOs up to 100k sats
    console.log('cumulativeValue:', cumulativeValue);
    console.log('UTXOs found for consolidation:', utxos);
    if (utxos.length === 0) {
      console.log('No consolidation needed, 0 UTXOs found.');
      return;
    }

    const estimatedFee = this.estimateFee({ numP2pkhInputs: utxos.length, numOutputs: 1 }); // Estimated fee for consolidation transaction
    const consolidationAmount = cumulativeValue - estimatedFee;
    console.log('Estimated fee for consolidation:', estimatedFee);
    console.log('Consolidation amount:', consolidationAmount);
    console.log(`Consolidating ${utxos.length} UTXOs totaling ${consolidationAmount} sats to address:`, receivingAddress);
    
    const bchAmount = Number(consolidationAmount) / 1e8;
    const sendResult = await wallet.sendBch(bchAmount, receivingAddress);
    console.log('Consolidation transaction sent:', sendResult);

    if (sendResult.success == false) {
      throw new Error(`Failed to consolidate UTXOs: ${sendResult.error}`);
    }
    
    return sendResult;
  }

  estimateFee({ numP2pkhInputs = 0, numOutputs = 2, feeRate = 2n } = {}) {
    // Approximate: ~148 bytes per P2PKH input
    const P2PKH_INPUT_SIZE = 148n;
    const OUTPUT_SIZE = 34n;
    const TX_OVERHEAD = 10n;

    const estimatedSize = TX_OVERHEAD
      + (BigInt(numP2pkhInputs) * P2PKH_INPUT_SIZE)
      + (BigInt(numOutputs) * OUTPUT_SIZE);

    return estimatedSize * feeRate;
  }

  /**
   * Estimates satoshis needed for token-related operation
   * Based on actual mainnet-js transaction requirements
   * NB: Fragile estimation! should implement dynamic fee calculation
   * @returns {bigint} Estimated satoshis needed
   */
  estimateTokenOpSatsRequirement () {
    const tokenOutputValue = minTokenValue; // 1000 sats from constants
    const estimatedTxSize = 500; // More realistic: includes change outputs, token data
    const feeRate = 1.2; // sats/byte
    const estimatedFee = BigInt(Math.ceil(estimatedTxSize * feeRate));
    const dustLimit = 546n;
    const buffer = 20000n; // Larger buffer based on actual requirements (~20k sats observed)
    
    const total = tokenOutputValue + estimatedFee + dustLimit + buffer;
    
    console.log('Estimated token operation sats requirement:', {
      tokenOutputValue,
      estimatedFee,
      dustLimit,
      buffer,
      total: Number(total)
    });

    return total;
  }

  async createGenesisUtxo() {
    console.log('Starting UTXO consolidation process...');
    
    const receivingAddress = this.address(); // Use the wallet's own address for consolidation
    const { cumulativeValue, utxos } = await this.getBchUtxos(null, 100000); // Get UTXOs up to 100k sats
    console.log('cumulativeValue:', cumulativeValue);
    console.log('UTXOs found for consolidation:', utxos);
    
    if (utxos.length === 0) {
      throw new Error('Cannot consolidate, 0 UTXOs found.');
    }

    if (cumulativeValue <= DUST_LIMIT) {
      throw new Error(`Cannot consolidate, cumulative value ${cumulativeValue} is below dust limit ${DUST_LIMIT}.`);
    } 

    const estimatedFee = this.estimateFee({ numP2pkhInputs: utxos.length, numOutputs: 1 }); // Estimated fee for consolidation transaction
    const satsAmount = cumulativeValue - estimatedFee;
    console.log('Estimated fee for consolidation:', estimatedFee);
    console.log('Consolidation amount:', satsAmount);
    console.log(`Consolidating ${utxos.length} UTXOs totaling ${satsAmount} sats to address:`, receivingAddress);

    const privateKey = this.privkey();
    const provider = new ElectrumNetworkProvider('mainnet')
    const sigTemplate = new SignatureTemplate(privateKey)

    const tx = new TransactionBuilder({ provider })
        .addInputs(utxos, sigTemplate.unlockP2PKH())
        .addOutput({ to: receivingAddress, amount: satsAmount })

    console.log('===inputs:', tx.inputs)
    console.log('===outputs:', tx.outputs)

    const txHex = tx.build()
    console.log('Built consolidation transaction hex:', txHex)

    const rawWallet = this.getRawWallet()
    const sendResult = await rawWallet.watchtower.BCH.broadcastTransaction(txHex)
    console.log('Consolidation transaction broadcast result:', sendResult)
    
    return sendResult;
  }

  async getOrCreateGenesisUtxo() {
    const bchUtxos = await this.getBchUtxos() 
    console.log('bchUtxos:', bchUtxos)

    if (!bchUtxos || !bchUtxos.utxos || bchUtxos.utxos.length === 0) {
        throw new Error('No BCH UTXOs available for genesis creation')
    }

    let genesisUtxo = bchUtxos.utxos[0] // Use the first UTXO for genesis

    if (genesisUtxo.vout !== 0 || genesisUtxo.satoshis <= DUST_LIMIT) {
      await this.createGenesisUtxo({consolidate: true})
      setTimeout(async () => {
          const updatedBchUtxos = await this.getBchUtxos()
          console.log('updatedBchUtxos:', updatedBchUtxos)
          genesisUtxo = updatedBchUtxos.utxos[0]
      }, 5000) 
    }

    if (genesisUtxo.satoshis <= DUST_LIMIT) {
      throw new Error(`Genesis UTXO is below dust limit: ${genesisUtxo.satoshis} sats`)
    }

    return genesisUtxo
  }
}

/**
 * Loads the Wallet.
 * If walletIndex is not provided, uses the current wallet index from the store. 
 * The changeIndex defaults to 0.
 * The addressIndex defaults to 0.
 * @returns {Promise<Wallet>} The loaded wallet.
 */
export async function loadWallet (
    walletIndex = null, 
    changeIndex= DEFAULT_CHANGE_INDEX, 
    addressIndex = DEFAULT_ADDRESS_INDEX) {
  
  const isChipnet = Store.getters['global/isChipnet']
  const globalWallet = Store.getters['global/getWallet']('bch')
  if (walletIndex === null) walletIndex = Store.getters['global/getWalletIndex']
  const wallet = new Wallet(
    walletIndex,
    globalWallet.walletHash, 
    { changeIndex, addressIndex, isChipnet }
  )
  await wallet.loadWallet()
  return wallet
}

export async function loadCardMerchantWallet (merchantAddressIndex = 1) {
  const isChipnet = Store.getters['global/isChipnet']
  const globalWallet = Store.getters['global/getWallet']('bch')
  const walletIndex = Store.getters['global/getWalletIndex']
  
  const MERCHANT_CHANGE_INDEX = 7 // Dedicated change index for merchant wallet

  const wallet = new Wallet(walletIndex, globalWallet.walletHash, { 
    changeIndex: MERCHANT_CHANGE_INDEX, 
    addressIndex: merchantAddressIndex, 
    isChipnet: isChipnet
  })

  await wallet.loadWallet()
  return wallet
}

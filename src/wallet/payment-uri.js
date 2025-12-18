import axios from 'axios'
import BCHJS from '@psf/bch-js'
import { utils } from 'ethers'
import BigNumber from 'bignumber.js'

import { parsePOSLabel } from 'src/wallet/pos'
import { Wallet } from './index'
import { decodeBIP0021URI } from 'src/wallet/bch'
import { sha256 } from "@psf/bch-js/src/crypto"
import Watchtower from 'watchtower-cash-js';
import { getWalletByNetwork } from './chipnet'
import SingleWallet from './single-wallet'
import { TransactionBalancer } from './stablehedge/transaction-utils'
import { toTokenAddress } from 'src/utils/crypto'
import { watchtowerUtxoToCashscriptP2pkh } from 'src/utils/utxo-utils'

const bchjs = new BCHJS()
/**
 * 
 * @typedef {Object} PaymentUriOutput
 * @property {String} [address]
 * @property {{ currency:String, value:Number|String }} [amount]
 * 
 * @typedef {Object} PaymentUriData
 * @property {PaymentUriOutput[]} outputs
 * @property {String} [name]
 * @property {String} [message]
 * @property {{ chain: 'main' | 'smart', assetId:String, rawValue:String }} asset
 * @property {{ walletHash:String, posId:Number|String }} [pos]
 * @property {Number} timestamp
 * @property {Map<String, String>} otherParams
*/

/**
 * Payment URI scheme for Paytaca app:
 *  payment-uri = "paytaca:" outputs ["?" opts ]
 *
 *  outputs = output [ "&" output ]
 *  output = address [ "@" amount ]
 *  address = smartbchAddress | cashaddress | slpaddress
 *  amount = [ currency ":" ] *digit [ "." *digit ]
 *
 *  opts = opt [ "&" opt ]
 *  opt   = [ name / message / asset / pos / ts / otherparams ]
 *  asset = "asset=" [sbch | bch | "sep20/" slpid | "sep20/" contractAddress ]
 *  pos = "pos=" wallethash "-" posid
 *  ts = "ts=" unix_timestamp
 *  otherparams = paramname [ "=" paramvalue ]
 *
 * 'address' types cashaddress and slpaddress can be without the prefix
 * @param {String} paymentUri
 * 
 * {@link https://gist.github.com/khirvy019/27ea9baae16c37bb49e6a477dbb46054}
 */
export function parsePaytacaPaymentUri(paymentUri = '') {
  const response = {
    outputs: [{ address: '', amount: { currency: null, value: null } }],
    name: undefined,
    message: undefined,
    asset: { chain: 'main', assetId: 'bch', rawValue: '' },
    // amount: { currency: undefined, value: undefined, rawValue: '' },
    pos: undefined,
    timestamp: undefined,
    otherParams: {},
  }
  const urlObject = new URL(paymentUri)
  if (urlObject?.protocol != 'paytaca:') return

  const searchParams = Object.fromEntries(urlObject.searchParams.entries())

  response.asset = resolvePaymentUriAssetParam(searchParams?.asset)
  response.asset.rawValue = searchParams?.asset
  delete searchParams.asset

  if (searchParams?.name) {
    response.name = searchParams?.name
    delete searchParams?.name
  }

  if (searchParams?.message) {
    response.message = searchParams?.message
    delete searchParams?.message
  }

  // if (searchParams?.amount) {
  //   const [value, currency] = searchParams?.amount.split(":", 2).reverse()
  //   response.amount = { currency, value }
  //   response.amount.rawValue = searchParams?.amount
  //   delete searchParams.amount
  // }

  if (searchParams?.POS) {
    response.pos = parsePOSLabel(searchParams?.POS)
    if (response.pos) response.pos.rawValue = searchParams?.POS
    delete searchParams.POS
  }

  if (searchParams?.ts && !isNaN(Number(searchParams?.ts))) {
    response.timestamp = Number(searchParams?.ts)
    delete searchParams?.ts
  }
  response.otherParams = searchParams

  response.outputs = urlObject.pathname.split("&").map(output => {
    const asset = response.asset
    let [address, rawAmount] = output.split("@", 2)
    let amount = { currency: null, value: null }
    if (asset.chain === 'main') {
      if (asset.assetId.startsWith('slp/')) {
        if (!address.startsWith('simpleledger:')) address = 'simpleledger:' + address
      } else {
        if (!address.startsWith('bitcoincash:')) address = 'bitcoincash:' + address
      }
    }

    if (rawAmount) {
      const [value, currency] = rawAmount.split(":", 2).reverse()
      amount = { currency, value: Number(value) }
    }
    return { address, amount }
  })

  // some validations
  let addressValidator = () => true
  if (response.asset.chain === 'main') {
    if (response.asset.assetId.startsWith('slp/')) addressValidator = address => bchjs.SLP.Address.isSLPAddress(address)
    else addressValidator = address => bchjs.Address.isCashAddress(address)
  } else if (response.asset.chain === 'smart') {
    addressValidator = utils.isAddress
  }
  const invalidAddresses = response.outputs
    .map(output => output?.address)
    .filter(address => !address || !addressValidator(address))

  if (invalidAddresses.length) {
    const error = new Error(`Invalid address/es for asset: ${invalidAddresses.join(',')}`)
    error.name = 'InvalidOutputAddress'
    error.addresses = invalidAddresses
    throw error
  }

  if (response.asset.chain === 'smart' && response.outputs.length > 1) {
    const error = new Error('Smart chain must only have 1 output')
    error.name = 'InvalidOutputCount'
    throw error
  }

  return response
}

/**
 * 
 * @param {String} paramValue 
 * @returns {{ chain: 'main' | 'smart', assetId: String }}
 */
function resolvePaymentUriAssetParam(paramValue='') {
  if (paramValue.startsWith('slp/')) return  { chain: 'main', assetId: paramValue }
  return { chain: 'main', assetId: 'bch' }
}


/**
 * 
 * @param {String} content 
 * @param {Object} opts
 * @param {Number} opts.networkTimeDiff For checking urls with expiry, this value will be used to adjust the local time if it is off by the number of milliseconds
 * @param {'main' | 'smart'} opts.chain
 */
export function parsePaymentUri(content, opts) {
  if (content.startsWith('paytaca:')) {
    return parsePaytacaPaymentUri(content)
  }

  const data = {
    outputs: [{
      address: '', amount: { currency: null, value: null },
    }],
    asset: { chain: '', assetId: '' },
    name: null,
    message: null,
    pos: undefined,
    timestamp: 0,
    otherParams: {},
    jpp: { valid: false, fetch: () => null, paymentUri: null },
  }

  let bip0021Decoded, bip0021DecodeError 
  if (opts?.chain === 'main') {
    try { 
      bip0021Decoded = decodeBIP0021URI(content, opts)
    } catch(err) { 
      bip0021DecodeError = err
    }
  }
  let eip681Decoded, eip681DecodeError
  if (opts?.chain === 'smart') {
    try {
      eip681Decoded = decodeEIP681URI(content)
      if (Number(eip681Decoded.chain_id) !== 10000) {
        const chainId = eip681Decoded.chain_id
        eip681Decoded = undefined
        throw new Error(`Invalid chain ID: ${chainId}`)
      }
    } catch(err) { eip681DecodeError = err }
  }

  if ((!opts?.chain || opts?.chain === 'main') && bip0021Decoded) {
    data.outputs[0].address = bip0021Decoded.address
    data.name = bip0021Decoded.label
    data.message = bip0021Decoded.message

    if (bip0021Decoded.amount) data.outputs[0].amount.value = bip0021Decoded.amount
    if (bip0021Decoded.parameters?.currency) data.outputs[0].amount.currency = bip0021Decoded?.parameters?.currency
    if (bip0021Decoded.parameters?.POS) data.posId = bip0021Decoded.parameters?.POS
    if (bip0021Decoded.parameters?.ts) data.timestamp = Number(bip0021Decoded.parameters?.ts)

    data.otherParams = bip0021Decoded.parameters
    data.asset.chain = 'main'
    return data
  }

  if ((!opts?.chain || opts.chain === 'smart') && eip681Decoded) {
    data.outputs[0].address = eip681Decoded.target_address
    data.outputs[0].address = eip681Decoded.target_address
    if (eip681Decoded.parsedValue) data.outputs[0].amount.value = eip681Decoded.parsedValue
    if (eip681Decoded.parameters?.currency) data.outputs[0].amount.currency = eip681Decoded ?.parameters?.currency

    data.otherParams = eip681Decoded.parameters
    data.asset.chain = 'smart'
    return data
  }

  // throw approriate error/s
  if (bip0021DecodeError && opts?.chain === 'main') throw bip0021DecodeError
  if (eip681DecodeError && opts?.chain === 'smart') throw eip681DecodeError
  if (bip0021DecodeError && eip681DecodeError) throw [bip0021DecodeError, eip681DecodeError]
  if (bip0021DecodeError || eip681DecodeError) throw bip0021DecodeError || eip681DecodeError

  if (!data?.outputs?.[0]?.address && JSONPaymentProtocol.isValidPaymentLink(content)) {
    data.jpp.valid = true
    data.jpp.paymentUri = JSONPaymentProtocol.getPaymentLink(content)
    data.jpp.fetch = () => JSONPaymentProtocol.fetch(content)
  }
  return data
}


export function JsonPaymentProtocolError (...args) {
  const error = new Error(...args)
  error.name = 'JsonPaymentProtocolError'
  return error
}


export class JPPSourceTypes {
  static DEFAULT = 'default'
  static BITCOIN_COM = 'bitcoin.com'
  static BITPAY = 'bitpay'
  static ANYPAY = 'anypay'
  static WATCHTOWER = 'watchtower'

  /**
   * 
   * @param {URL | String} paymentUrl 
   */
  static resolve(paymentUrl) {
    try {
      let link = new URL(paymentUrl)
      if (link.host.indexOf('bitcoin.com') >= 0) return this.BITCOIN_COM
      if (link.host.indexOf('bitpay') >= 0) return this.BITPAY
      if (link.host.indexOf('watchtower.cash') >= 0) return this.WATCHTOWER
      if (link.host.indexOf('localhost') >= 0) return this.WATCHTOWER
      if (link.host.indexOf('anypay') >= 0) return this.ANYPAY
      return this.DEFAULT
    } catch(error) {
      console.error(error)
    }
    return null
  }

}

/**
 * {@link https://en.bitcoin.it/wiki/BIP_0070}
 * {@link https://github.com/bitpay/jsonPaymentProtocol/blob/master/v1/specification.md}
 * {@link https://github.com/developers-cash/cash-pay-server}
 */
export class JSONPaymentProtocol {
  static JsonPaymentProtocolError = JsonPaymentProtocolError
  /**
   * @typedef {Object} PaymentRequestOutput
   * @property {String} address
   * @property {Number} amount
   * @property {Object} [token]
   * @property {String} token.category
   * @property {Number} token.amount
   * @property {Object} [token.nft]
   * @property {Object} token.nft
   * @property {String} token.nft.capability
   * @property {String} token.nft.commitment
   * 
   * @param {Object} data
   * @param {String} [data.chain]
   * @param {String} data.network - "test" | "main"
   * @param {String} data.currency - e.g. "BTC", "BCH"
   * @param {Number} data.requiredFeePerByte
   * @param {PaymentRequestOutput[]} data.outputs
   * @param {String} data.time - ISO datetime string
   * @param {String} data.expires - ISO datetime string
   * @param {String} data.memo
   * @param {String} data.paymentUrl
   * @param {String} data.paymentId
   * @param {Object} opts
   * @param {Number} opts.networkTimeDiff
   */
  constructor(data, opts) {
    this._data = data
    this.transactions = []

    if (this.parsed.paymentUrl) {
      this.source = JPPSourceTypes.resolve(this.parsed.paymentUrl)
    }
    this.opts = opts
  }

  get expired() {
    let now = Date.now() 
    if (opts?.networkTimeDiff) now += opts?.networkTimeDiff
    return now > this.parsed.expires
  }

  get parsed() {
    const parsedData = {
      chain: this._data?.chain || '',
      network: this._data?.network || '',
      currency: this._data?.currency || '',
      requiredFeePerByte: this._data?.requiredFeePerByte || 0,
      outputs: [{
        address: '', amount: 0,
        token: {
          category: '',
          amount: 0,
          nft: { capability: '', commitment: '' },
        }
      }],
      time: new Date(this._data?.time),
      expires: new Date(this._data?.expires),
      memo: this._data?.memo || '',
      paymentUrl: this._data?.paymentUrl || '',
      paymentId: this._data?.paymentId || '',
    }
    if (Array.isArray(this._data?.outputs)) parsedData.outputs = this._data?.outputs
    parsedData.outputs = parsedData.outputs.filter(output => output?.address && output?.amount)
      .map(output => {
        try {
          // some services(like anypay) do not include the 'bitcoincash:' prefix
          output.address = bchjs.Address.toCashAddress(output.address)
        } catch {}
        return output
      })

    return parsedData
  }

  get total() {
    return Number(
      this.parsed.outputs.reduce((subtotal=0, output) => subtotal + output.amount, 0).toFixed(8)
    )
  }

  get errors() {
    const errors = []
    if (this.parsed.currency !== 'BCH') errors.push('Unsupported currency')
    if (this.parsed.network && this.parsed.network !== 'main') errors.push('Invalid network')

    if (!this.parsed.outputs.length) errors.push('No outputs found')
    return errors
  }

  get isValid() {
    return Boolean(this.errors.length)
  }

  get txids() {
    if (this._data?.payment?.txid) return [this._data?.payment?.txid]
    if (!Array.isArray(this.transactions)) return []
    return this.transactions.map(tx => JSONPaymentProtocol.rawTxToHash(tx))
  }

  get totalSendAmountSats() {
    return this.parsed.outputs.reduce((subtotal, output) => subtotal + output.amount, 0)
  }

  get tokenAmounts() {
    const tokenAmountsMap = new Map();
    for (const output of this.parsed.outputs) {
      const category = output?.token?.category;
      if (!category || output?.token?.nft?.capability) continue
      const amount = output?.token?.amount;
      const subtotal = tokenAmountsMap.get(category) || 0;
      tokenAmountsMap.set(category, subtotal + amount);
    }
    const result = [];
    tokenAmountsMap.forEach((amount, category) => {
      result.push({ category, amount })
    })
    return result
  }

  get nfts () {
    return this.parsed.outputs.filter(output => output.token?.nft?.capability)
      .map(output => output?.token)
  }

  get paymentData() {
    if (!this._data?.payment) return

    return {
      memo: this._data?.payment?.memo,
      txid: this._data?.payment?.txid,
      paidAt: this._data?.payment?.paidAt ? new Date(this._data?.payment?.paidAt) : null,
      refundTo: this._data?.payment?.refundTo,
    }
  }

  /**
   * @param {Wallet | SingleWallet} wallet 
   * @param {String} [category]
   * @param {{ capability: String, commitment: String }} [nft]
   */
  async getUtxosFromWallet(wallet, category, nft) {
    const params = {
      confirmed: this.source == JPPSourceTypes.BITPAY ? true : undefined,
      is_cashtoken: category ? true : undefined,
      is_cashtoken_nft: nft?.capability ? true : undefined,
    }

    /** @type {import("watchtower-cash-js").BCH} */
    const bchWallet = wallet instanceof SingleWallet
      ? wallet.watchtower?.BCH
      : getWalletByNetwork(wallet, 'bch')?.watchtower?.BCH

    let urlPath
    if (wallet instanceof SingleWallet) {
      let address = wallet.isChipnet ? wallet.testnetAddress : wallet.cashAddress
      if (category) urlPath = `utxo/ct/${toTokenAddress(address)}/${category}/`
      else urlPath = `utxo/bch/${address}/`
    } else {
      const walletHash = getWalletByNetwork(wallet, 'bch')?.walletHash
      urlPath = `utxo/wallet/${walletHash}/`
      if (category) urlPath += category + `/`
    }

    const utxoFetchResp = await bchWallet._api.get(urlPath, { params })
    /** @type {import('src/utils/utxo-utils').WatchtowerUtxo[]} */
    const utxos = utxoFetchResp.data?.utxos;
    return utxos;
  }

  /**
   * @param {Wallet} wallet 
   */
  async prepareTransaction(wallet, changeAddress) {
    if (this.parsed.outputs.find(output => !output.address.startsWith('bitcoincash'))) {
      throw JsonPaymentProtocolError('Invalid recipient address')
    }

    if (!changeAddress) {
      if (wallet instanceof SingleWallet) {
        changeAddress = wallet.isChipnet ? wallet.testnetAddress : wallet.cashAddress
      } else {
        changeAddress = (await getWalletByNetwork(wallet, 'bch').getAddressSetAt(0)).change
      }
    }

    const txBuilder = new TransactionBalancer()
    txBuilder.feePerByte = this.parsed.requiredFeePerByte || 1.1

    for (let i = 0; i < this.parsed.outputs.length; i++) {
      const output = this.parsed.outputs[i]
      const sendAmount = new BigNumber(output.amount)
      txBuilder.outputs.push({
        to: output.address,
        amount: BigInt(sendAmount),
        token: !output.token ? undefined : {
          category: output.token.category,
          amount: BigInt(output.token.amount),
          nft: output.token.nft,
        }
      })
    }

    const nftOutputs = txBuilder.outputs.filter(output => output?.token?.nft)
    const ftCatagories = txBuilder.outputs
      .filter(output => output?.token && !output?.token?.nft)
      .map(output => output.token.category)
      .filter((element, index, list) => list.indexOf(element) === index)

    const utxosMap = new Map();
    await Promise.all(nftOutputs.map(async nftOutput => {
      const utxos = await this.getUtxosFromWallet(
        wallet, nftOutput.token.category, nftOutput.token.nft
      )
      const utxo = utxos.find(utxo => {
        return utxo.tokenid == nftOutput.token.category &&
          utxo.capability == nftOutput.token.nft.capability &&
          utxo.commitment == nftOutput.token.nft.commitment && 
          !utxosMap.has(`${utxo.txid}:${utxo.vout}`)
      })
      if (!utxo) throw JsonPaymentProtocolError('Not enough token NFT balance')
      utxosMap.set(`${utxo.txid}:${utxo.vout}`, 1)

      const parsedUtxo = watchtowerUtxoToCashscriptP2pkh(utxo, wallet);
      txBuilder.inputs.push(parsedUtxo)
    }))

    await Promise.all(ftCatagories.map(async category => {
      const ftUtxos = await this.getUtxosFromWallet(wallet, category)
      for (const ftUtxo of ftUtxos) {
        if (txBuilder.tokenChange(category) >= 0n) break

        if (utxosMap.has(`${ftUtxo.txid}:${ftUtxo.vout}`)) continue
        utxosMap.set(`${ftUtxo.txid}:${ftUtxo.vout}`, 1)

        const parsedUtxo = watchtowerUtxoToCashscriptP2pkh(ftUtxo, wallet);
        txBuilder.inputs.push(parsedUtxo)
      }

      const excessTokens = txBuilder.tokenChange(category);
      if (excessTokens < 0n) {
        console.error('Not enough balance for token', category, '. Need', excessTokens)
        throw JsonPaymentProtocolError('Not enough token balance')
      }
      if (excessTokens > 0n) {
        txBuilder.outputs.push({
          to: toTokenAddress(changeAddress),
          amount: 1000n,
          token: { category, amount: excessTokens },
        })
      }
    }))

    const bchUtxos = await this.getUtxosFromWallet(wallet);
    for (const bchUtxo of bchUtxos) {
      if (txBuilder.excessSats >= 0n) break

      if (utxosMap.has(`${bchUtxo.txid}:${bchUtxo.vout}`)) continue
      utxosMap.set(`${bchUtxo.txid}:${bchUtxo.vout}`, 1)

      const parsedUtxo = watchtowerUtxoToCashscriptP2pkh(bchUtxo, wallet);
      txBuilder.inputs.push(parsedUtxo)
    }

    const changeOutput = { to: changeAddress, amount: 546n }
    txBuilder.outputs.push(changeOutput)

    // Iteratively adjust change output to ensure correct fee
    // This handles any rounding issues in fee calculation with multiple inputs
    let iterations = 0
    const maxIterations = 20
    let previousExcess = null
    
    while (iterations < maxIterations) {
      const excess = txBuilder.excessSats
      
      if (excess < 0n) {
        // Not enough funds even with change output, remove it
        txBuilder.outputs = txBuilder.outputs.filter(output => output !== changeOutput)
        break
      } else if (excess === 0n) {
        // Perfect balance, we're done
        break
      } else if (excess > 0n && excess < 10n && previousExcess !== null && previousExcess === excess) {
        // If we're stuck with a small positive excess (1-9 satoshis) that isn't changing,
        // add it to the fee by reducing the change output by that amount
        changeOutput.amount -= excess
        if (changeOutput.amount < 546n) {
          // If change becomes dust, remove it and accept the slight overpayment
          txBuilder.outputs = txBuilder.outputs.filter(output => output !== changeOutput)
        }
        break
      } else {
        // Add excess to change output
        previousExcess = excess
        changeOutput.amount += excess
      }
      
      iterations++
    }
    
    // Final validation: ensure we're not underpaying
    const finalExcess = txBuilder.excessSats
    if (finalExcess < 0n) {
      throw JsonPaymentProtocolError('Insufficient funds for transaction including fees')
    }

    this.preparedTx = { builder: txBuilder, verified: false }
    return this.preparedTx
  }

  signPreparedTx() {
    if (!this.preparedTx?.builder) throw new JsonPaymentProtocolError('Transaction unprepared')
    if (!this.preparedTx?.verified) throw new JsonPaymentProtocolError('Transaction not verified')

    this.signedTxHex = this.preparedTx.builder.build()
    return this.signedTxHex
  }

  async verifyPayment() {
    // Bitcoin.com payment request doesnt seem to have verify payment
    if (this.source === JPPSourceTypes.BITCOIN_COM || this.source === JPPSourceTypes.ANYPAY) {
      this.preparedTx.verified = true
      return
    }

    if (!this?.preparedTx?.builder) throw JsonPaymentProtocolError('Transaction not prepared') 
    const unsignedTransaction = this?.preparedTx?.builder?.buildUnsigned()

    const requestOpts = {
      url: this.parsed.paymentUrl,
      headers: { 'Content-Type': 'application/verify-payment' },
      data: {
        currency: this.parsed.currency,
        unsignedTransaction: unsignedTransaction,
        weightedSize: unsignedTransaction.length / 2, // tx hex in bytes
      },
      responseType: 'json',
    }

    if (this.source === JPPSourceTypes.BITCOIN_COM) {
      requestOpts.headers['Content-Type'] = 'application/bitcoincash-verifypayment'
      requestOpts.responseType = 'blob'
    } else if (this.source === JPPSourceTypes.BITPAY) {
      requestOpts.headers['Content-Type'] = 'application/payment-verification'
      requestOpts.headers['X-Paypro-Version'] = 2

      requestOpts.data = {
        chain: this.parsed.chain,
        transactions: [{
          tx: unsignedTransaction,
          weightedSize: unsignedTransaction.length/2,
        }],
        currency: this.parsed.currency,
      }
    } else if (this.source === JPPSourceTypes.WATCHTOWER) {
      if (!requestOpts.url.endsWith('/')) requestOpts.url += '/'
      requestOpts.url += 'verify/'
      requestOpts.headers['Content-Type'] = 'application/json'
      requestOpts.data = {
        raw_tx_hex: unsignedTransaction,
      }
    }

    try {
      const response = await axios.post(requestOpts.url, requestOpts.data, {
        headers: requestOpts.headers,
      })
      this.verifyRequest = requestOpts
      this.verifyResponse = response
      if (response?.error) throw new Error({ response })

      this.preparedTx.verified = true
      return response
    } catch(error) {
      console.error(error)
      if (typeof error?.response?.data === 'string') throw JsonPaymentProtocolError(error?.response?.data)
      if (typeof error?.response?.data?.error === 'string') throw JsonPaymentProtocolError(error?.response?.data?.error)
      if (typeof error?.response?.data?.msg === 'string') throw JsonPaymentProtocolError(error?.response?.data?.msg)
      throw error
    }
  }

  async pay() {
    const signedTxHex = this.signPreparedTx()
    const transactions = [signedTxHex]
    const requestOpts = {
      proxy: false,
      url: this.parsed.paymentUrl,
      headers: { 'Content-Type': 'application/payment' },
      data: {
        currency: this.parsed.currency,
        transactions: transactions,
      },
      responseType: 'json',
    }
 
    if (this.source === JPPSourceTypes.BITCOIN_COM || this.source === JPPSourceTypes.ANYPAY) {
      requestOpts.proxy = true
      requestOpts.headers ={
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
      requestOpts.url = 'payment-requests/pay/'
      requestOpts.data = {
        payment_url: this.parsed.paymentUrl,
        raw_tx_hex: transactions[0],
        source: this.source,
      }
    } else if (this.source === JPPSourceTypes.BITPAY || this.source === JPPSourceTypes.ANYPAY) {
      requestOpts.headers['Content-Type'] = 'application/payment'
      if (this.source === JPPSourceTypes.BITPAY) requestOpts.headers['X-Paypro-Version'] = 2
      requestOpts.data = {
        chain: this.parsed.chain,
        currency: this.parsed.currency,
        transactions: [{
          tx: transactions[0],
          weightedSize: transactions[0]?.length/2
        }],
      }
    } else if (this.source == JPPSourceTypes.WATCHTOWER) {
      if (!requestOpts.url.endsWith('/')) requestOpts.url += '/'
      requestOpts.url += 'pay/'
      requestOpts.headers['Content-Type'] = 'application/json'
      requestOpts.data = {
        raw_tx_hex: transactions[0],
      }
    }

    try {
      const watchtower = new Watchtower()
      const response = await watchtower.BCH._api.post(
        requestOpts.url,
        requestOpts.data,
        { headers: requestOpts.headers }
      )
      this.paymentRequest = requestOpts
      this.paymentResponse = response
      if (response?.error) throw new Error({ response })
      if (requestOpts.proxy && !response?.data?.success) throw JsonPaymentProtocolError(response?.data?.message)

      this.paymentAckMemo = response?.data?.memo || response?.data?.message
      this.transactions = transactions
      return response
    } catch(error) {
      console.error(error)
      const txid = JSONPaymentProtocol.rawTxToHash(transactions[0])
      try {
        const exists = await JSONPaymentProtocol.txExists(txid)
        if (exists) {
          this.transactions = transactions
          this.paymentManuallyVerified = true
          console.warn('Payment failed but transaction exists')
          return
        }
      } catch(_error) {
        console.error(_error)
      }

      if (typeof error?.response?.data === 'string') throw JsonPaymentProtocolError(error?.response?.data)
      if (error?.response?.data?.message) throw JsonPaymentProtocolError(error?.response?.data?.message)
      if (Array.isArray(error?.response?.data?.non_field_errors) && error?.response?.data?.non_field_errors.length) {
        throw JsonPaymentProtocolError(error?.response?.data?.non_field_errors?.[0])
      }
      throw error
    }
  }

  /**
   * 
   * @typedef {Object} BitPayJPPOutput
   * @property {String} address
   * @property {Number} amount
   * 
   * @typedef {Object} BitPayJPPInstruction
   * @property {String} type
   * @property {Number} requiredFeeRate
   * @property {BitPayJPPOutput[]} outputs
   * 
   * 
   * @param {Object} data 
   * @param {String} data.time
   * @param {String} data.expires
   * @param {String} data.memo
   * @param {String} data.paymentUrl
   * @param {String} data.paymentId
   * @param {String} data.chain
   * @param {String} data.network
   * @param {BitPayJPPInstruction[]} data.instructions
   */
  static parseBitpayRequestData(data) {
    const txInstruction = data?.instructions.find(instruction => instruction.type === 'transaction')
    return {
      time: data?.time,
      expires: data?.expires,
      memo: data?.memo,
      paymentUrl: data?.paymentUrl,
      paymentId: data?.paymentId,
      chain: data?.chain,
      network: data?.network,
      currency: data?.chain,
      requiredFeePerByte: txInstruction?.requiredFeeRate,
      outputs: txInstruction?.outputs?.map(output => Object({
        amount: output?.amount,
        address: bchjs.Address.toCashAddress(output?.address),
      })),
    }
  }

  /**
   * @param {String} paymentUri 
   * @param {Object} opts
   * @param {Boolean} opts.verify
   * @param {Number} opts.networkTimeDiff
   */
  static async fetch(paymentUri, opts) {
    let link = new URL(paymentUri)
    const paymentUrl = link
    const searchParams = Object.fromEntries(link.searchParams.entries())
    if (searchParams?.r) link = new URL(searchParams?.r)

    let method = 'get'
    let data
    const headers = {
      Accept: 'application/payment-request',
    }
    const params = {}

    const jppSource = JPPSourceTypes.resolve(link)
    let proxy = false
    if (jppSource === JPPSourceTypes.BITCOIN_COM) {
      params.payment_url = String(link)
      link = 'payment-requests/fetch/'
      headers.Accept = 'application/json'
      proxy = true
    } else if (jppSource === JPPSourceTypes.BITPAY) {
      const paymentOptsResp = await axios.get(
        String(link),
        { headers: {Accept: 'application/payment-options', 'X-Paypro-Version': 2 } }
      )
      if (!Array.isArray(paymentOptsResp?.data?.paymentOptions)) {
        throw JsonPaymentProtocolError('Unable to fetch payment options')
      }
      const bchOpt = paymentOptsResp?.data?.paymentOptions?.find(
        paymentOpt => paymentOpt?.chain === "BCH" && paymentOpt?.currency === "BCH"
      )
      if (!bchOpt) throw JSONPaymentProtocol("Invoice does not accept BCH")

      method = 'post'
      data = bchOpt

      delete headers['Accept']
      headers['Content-Type'] = 'application/payment-request'
      headers['X-Paypro-Version'] = 2
    } else if (jppSource === JPPSourceTypes.WATCHTOWER) {
      headers.Accept = 'application/json'
    } else if (jppSource == JPPSourceTypes.ANYPAY) {
      headers['X-Currency'] = 'BCH'
    }

    let parsedData
    if (jppSource === JPPSourceTypes.BITPAY) {
      const axiosInstance = axios.create({})
      axiosInstance.interceptors.request.use(config => {
        if (config?.headers?.[method]?.Accept) delete config.headers[method].Accept
        if (config?.headers?.[method]?.accept) delete config.headers[method].accept
        return config
      })
      const response = await axiosInstance.request({method: method, data: data, url: String(link), headers, params })
      parsedData = this.parseBitpayRequestData(response?.data)
      parsedData.currency = data?.currency
    } else {
      const watchtower = new Watchtower()
      const response = await watchtower.BCH._api.request({method: method, data: data, url: String(link), headers, params })
      parsedData = response.data
      parsedData.paymentUrl = parsedData.payment_url || parsedData.paymentUrl
      parsedData.paymentId = parsedData.payment_id || parsedData.paymentId
      parsedData.requiredFeePerByte = parsedData.required_fee_per_byte || parsedData.requiredFeePerByte
      if (parsedData?.payment?.paid_at) {
        parsedData.payment.paidAt = parsedData?.payment?.paid_at
      }
      if (jppSource == JPPSourceTypes.ANYPAY) {
        parsedData.paymentUrl = String(link)
        parsedData.chain = 'BCH'
      }
      if (proxy && parsedData) {
        if (!parsedData.paymentId) {
          const splitPath = paymentUrl.pathname.split('/')	
          parsedData.paymentId = splitPath[splitPath.length-1]
        }
        parsedData.currency = parsedData.currency || 'BCH'
      }
    }
    return new JSONPaymentProtocol(parsedData, opts)
  }


  static getPaymentLink(paymentUri) {
    try {
      let link = new URL(paymentUri)
      const searchParams = Object.fromEntries(link.searchParams.entries())
      return new URL(searchParams?.r)
    } catch(error) {
      console.error(error)
    }
    return null
  }

  static isValidPaymentLink(paymentUri) {
    return Boolean(this.getPaymentLink(paymentUri))
  }

  static rawTxToHash(tx='') {
    return sha256(sha256(Buffer.from(tx, 'hex'))).reverse().toString('hex')
  }

  static async getTxConfirmations(txid='') {
    const response = await axios.get(`https://watchtower.cash/api/transactions/${txid}/`).catch(console.log)
    if (response?.data?.details?.txid) {
      return {
        txid: response?.data?.details?.txid,
        confirmations: response?.data?.details?.confirmations,
      }
    }

    return axios.get(
      `https://rest1.biggestfan.net/v2/rawtransactions/getRawTransaction/${txid}/`,
      { params: { verbose: true } },
    )
      .then(response => {
        if (response?.data?.error) return Promise.reject(new Error(response?.data?.error))
        return {
          txid: response?.data?.txid,
          confirmations: response?.data?.confirmations,
        }
      })
      .catch(error => {
        // response status for rate limit
        if (error?.response?.status !== 503) return Promise.reject(error)

        return axios.get(`https://api.fullstack.cash/v5/electrumx/tx/data/${txid}/`) 
          .then(response => {
            if (!response?.success) return Promise.reject(new Error(response?.data?.error))
            return {
              txid: response?.data?.details?.txid,
              confirmations: response?.data?.details?.confirmations,
            }
          })
      })
  }

  static async txExists(txid='') {
    const result = await JSONPaymentProtocol.getTxConfirmations(txid).catch(console.error)
    return Boolean(result?.txid)
  }

  static async isTxConfirmed(txid='') {
    const result = await JSONPaymentProtocol.getTxConfirmations(txid).catch(console.error)
    return {
      exists: Boolean(result?.txid),
      confirmed: Boolean(result?.confirmations > 0),
    }
  }
}

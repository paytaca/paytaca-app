import BCHJS from '@psf/bch-js'
import { utils } from 'ethers'

import { parsePOSLabel } from 'src/wallet/pos'
import { decodeBIP0021URI } from 'src/wallet/bch'
import { decodeEIP681URI } from 'src/wallet/sbch/utils'

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
  if (paramValue === 'sbch') return { chain: 'smartbch', assetId: 'bch' }
  if (paramValue.startsWith('sep20/')) return  { chain: 'smart', assetId: paramValue }

  if (paramValue.startsWith('slp/')) return  { chain: 'main', assetId: paramValue }
  return { chain: 'main', assetId: 'bch' }
}


/**
 * 
 * @param {String} content 
 * @param {Object} opts
 * @param {'main' | 'smart'} opts.chain
 */
export function parsePaymentUri(content, opts) {
  console.log('Parsing payment URI:', content)
  if (content.startsWith('paytaca:')) {
    console.log('Parsing content using in-app protocol')
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
  }

  let bip0021Decoded, bip0021DecodeError 
  if (opts?.chain === 'main') {
    try { bip0021Decoded = decodeBIP0021URI(content) } catch(err) { bip0021DecodeError = err }
  }
  let eip681Decoded, eip681DecodeError
  if (opts?.chain === 'smart') {
    try { eip681Decoded = decodeEIP681URI(content) } catch(err) { eip681DecodeError = err }
  }

  if ((!opts?.chain || opts?.chain === 'main') && bip0021Decoded) {
    console.log('Parsing content using BIP0021')
    data.outputs[0].address = bip0021Decoded.address
    data.name = bip0021Decoded.label
    data.message = bip0021Decoded.message

    if (bip0021Decoded.amount) data.outputs[0].amount.value = bip0021Decoded.amount
    if (bip0021Decoded.parameters?.currency) data.outputs[0].amount.currency = bip0021Decoded?.parameters?.currency
    if (bip0021Decoded.parameters?.POS) data.pos = parsePOSLabel(bip0021Decoded.parameters?.POS)
    if (bip0021Decoded.parameters?.ts) data.timestamp = Number(bip0021Decoded.parameters?.ts)

    data.otherParams = bip0021Decoded.parameters
    data.asset.chain = 'main'
    return data
  }

  if ((!opts?.chain || opts.chain === 'smart') && eip681Decoded) {
    console.log('Parsing content using EIP681')
    data.outputs[0].address = eip681Decoded.target_address
    data.outputs[0].address = eip681Decoded.target_address
    if (eip681Decoded.parsedValue) data.outputs[0].amount.value = eip681Decoded.parsedValue
    if (eip681Decoded.parameters?.currency) data.outputs[0].amount.currency = eip681Decoded ?.parameters?.currency

    data.otherParams = eip681Decoded.parameters
    data.asset.chain = 'smart'
  }

  // throw approriate error/s
  if (bip0021DecodeError && opts?.chain === 'main') throw bip0021DecodeError
  if (eip681DecodeError && opts?.chain === 'smart') throw eip681DecodeError
  if (bip0021DecodeError && eip681DecodeError) throw [bip0021DecodeError, eip681DecodeError]
  if (bip0021DecodeError || eip681DecodeError) throw bip0021DecodeError || eip681DecodeError

  return data
}

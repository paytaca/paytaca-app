import crypto from 'crypto'
import {
  ripemd160,
  binToHex,
  hexToBin,
  decodeCashAddress,
  encodeCashAddress,
  CashAddressType,
  decodePrivateKeyWif,
  hash256,
  instantiateSecp256k1,
} from "@bitauth/libauth"
import { BLOCK_TIME_SEC } from './constants.js'
import { ElectrumNetworkProvider } from 'cashscript'
import { cardLogger } from 'src/utils/debug-logger.js'

const HASHTYPE = 0x41; // SIGHASH_ALL | SIGHASH_FORKID

export async function getBlockHeight() {
  const provider = new ElectrumNetworkProvider('mainnet')
  const blockHeight = await provider.getBlockHeight()
  cardLogger.log('blockHeight:', blockHeight)
  return blockHeight
}

export async function convertTimeToBlock(timestamp) {
  const currentTime = Math.floor(Date.now() / 1000)
  const blocksAhead = Math.floor((timestamp - currentTime) / BLOCK_TIME_SEC)
  const currentBlockHeight = await getBlockHeight()
  const estimatedBlockHeight = currentBlockHeight + blocksAhead
  cardLogger.log('estimatedBlockHeight:', estimatedBlockHeight)
  return estimatedBlockHeight
}

export function sha256(data='', encoding='utf8') {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, encoding))
  return _sha256.digest().toString('hex')
}

export function pubkeyToPkHash(pubkey='') {
  return binToHex(ripemd160.hash(hexToBin(sha256(pubkey, 'hex'))))
}

export function convertCashAddressToTokenAddress (address) {
  const decodedAddress = decodeCashAddress(address)
  if (typeof decodedAddress == 'string') throw decodedAddress
  const addrType = decodedAddress.type
  const payload = decodedAddress.payload
  switch(addrType) {
    case (CashAddressType.p2pkhWithTokens):
    case (CashAddressType.p2shWithTokens):
      return address
    case (CashAddressType.p2pkh):
      return encodeCashAddress(decodedAddress.prefix, CashAddressType.p2pkhWithTokens, payload)
    case (CashAddressType.p2sh):
      return encodeCashAddress(decodedAddress.prefix, CashAddressType.p2shWithTokens, payload)
  }
}

/**
 * Sign preimages using the provided WIF private key.
 * Note: This should run on the merchant frontend; it signs input preimages
 * for the spend transaction.
  * @param {Object} params
  * @param {Array} params.preimages - Array of objects containing inputIndex and preimage hex strings.
  * @param {string} params.wif - WIF encoded private key.
 * @returns {Array} - Array of objects containing inputIndex, merchantSigHex, and merchantPkHex.  
 */
export async function signPreimages({ preimages, wif }) {
  const decoded = decodePrivateKeyWif(wif);
  if (typeof decoded === 'string') throw new Error(decoded);

  const secp = await instantiateSecp256k1();
  const merchantPkBin = secp.derivePublicKeyCompressed(decoded.privateKey);
  const merchantPkHex = binToHex(merchantPkBin);

  return preimages.map(({ inputIndex, preimage }) => {
    const preimageBin = hexToBin(preimage);
    const messageHash = hash256(preimageBin);

    const sig64 = secp.signMessageHashSchnorr(decoded.privateKey, messageHash);
    const sigWithHashType = new Uint8Array([...sig64, HASHTYPE]); // 65 bytes

    return {
      inputIndex,
      merchantSigHex: binToHex(sigWithHashType),
      merchantPkHex
    };
  });
}

export function reverseHex(hexString) {
  const bytes = Buffer.from(hexString, 'hex')
  bytes.reverse()
  return bytes.toString('hex')
}

export function encodeLinkingCommitment( { holderType, valueHex }) {
  if (!holderType) throw new Error ('missing required holderType parameter')
  if (!valueHex) throw new Error ('missing required valueHex parameter')

  let holderVal = 0x00
  if (holderType === 'cat') {
    holderVal = 0x01
  }
  
  const holderBuf = Buffer.from([holderVal]); // 1 byte
  const valueBuf = Buffer.from(valueHex, 'hex')
  const commitment = Buffer.concat([holderBuf, valueBuf]);
  return commitment.toString('hex'); 
}

export function decodeLinkingCommitment(hex) {
    if (hex.length === 0) return null;
    const buf = Buffer.from(hex, 'hex');
    return {
        type: buf[0] === 1 ? 'cat' : 'pkh',
        valueHex: buf.subarray(1, buf.length).toString('hex')
    };
}

/**
 * Encodes authorization data into an NFT commitment (hex).
 * @param {Object} params
 * @param {string} params.holderType 'pkh' or 'cat'
 * @param {string} params.category Linking category (hex).
 * @returns {string} Hex commitment.
 */
export function encodeOwnershipCommitment({ holderType, category }) {
  if (!category) throw new Error ('missing required category parameter')

  let holderVal = 0x00
  if (holderType === 'cat') {
    holderVal = 0x01
  }
  
  const holderBuf = Buffer.from([holderVal]); // 1 byte
  const categoryBuf = Buffer.from(category, 'hex')
  const commitment = Buffer.concat([holderBuf, categoryBuf]);
  return commitment.toString('hex'); 
}

/**
 * Decodes an NFT commitment hex into its fields.
 * @param {string} hex
 * @returns {{ type: string, category: string }|null}
 */
export function decodeOwnershipCommitment(hex) {
    if (hex.length === 0) return null;
    const buf = Buffer.from(hex, 'hex');
    return {
        type: buf[0] === 1 ? 'cat' : 'pkh',
        value: buf.subarray(1, buf.length).toString('hex')
    };
}

export function estimateP2pkhFee({ numInputs = 0, numOutputs = 2, feeRate = 2n } = {}) {
  // CashScript contract inputs are larger due to unlocking script (redeem script + args)
  // Approximate: ~300 bytes per contract input, ~148 bytes per P2PKH input
  const INPUT_SIZE = 148
  const OUTPUT_SIZE = 34
  const TX_OVERHEAD = 10

  const estimatedSize = TX_OVERHEAD
      + (numInputs * INPUT_SIZE)
      + (numOutputs * OUTPUT_SIZE)

  return BigInt(estimatedSize) * feeRate
}

export function isSessionExpired(error) {
  if (error.response) {
    if (error.response.status === 401 || error.response.status === 403) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the icon name or symbol text for a given fiat currency code.
 * Material icon names are prefixed with 'icon:'; Unicode text is returned directly.
 * @param {string} currencySymbol
 * @returns {string}
 */
export function getFiatCurrencyIcon (currencySymbol) {
  const symbol = String(currencySymbol || '').toUpperCase()
  const icons = {
    USD: 'icon:attach_money',
    EUR: 'icon:euro_symbol',
    GBP: 'icon:currency_pound',
    JPY: 'icon:currency_yen',
    CNY: 'icon:currency_yen',
    INR: 'icon:currency_rupee',
    KRW: 'icon:currency_yen',
    PHP: '₱',
    THB: '฿',
    VND: '₫',
    BRL: 'R$',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    HKD: 'HK$',
    TWD: 'NT$',
    MYR: 'RM',
    IDR: 'Rp',
    MXN: '$',
    RUB: '₽',
    CHF: 'Fr',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    NZD: 'NZ$',
    ZAR: 'R',
    TRY: '₺',
    AED: 'د.إ',
    SAR: '﷼',
    PKR: '₨',
    BDT: '৳',
    EGP: '£',
    COP: '$',
    ARS: '$',
    CLP: '$',
    PEN: 'S/',
    UYU: '$U',
    GHS: '₵',
    KES: 'KSh',
    NGN: '₦',
    TZS: 'Sh',
    UGX: 'Sh',
    XAF: 'FCFA',
    XOF: 'CFA',
    XPF: 'CFPF',
    MAD: 'DH',
    DZD: 'DA',
    TND: 'DT',
    JOD: 'JD',
    LBP: 'L£',
    IQD: 'ع.د',
    KWD: 'KD',
    BHD: 'BD',
    OMR: 'RO',
    QAR: 'QR',
    KZT: '₸',
    UAH: '₴',
    PLN: 'zł',
    CZK: 'Kč',
    HUF: 'Ft',
    RON: 'lei',
    BGN: 'лв',
    HRK: 'kn',
    ISK: 'kr',
    GEL: '₾',
    AMD: 'դր',
    AZN: '₼',
    BYN: 'Br',
    MDL: 'L',
    MKD: 'ден',
    RSD: 'дин',
    ALL: 'L',
    BAM: 'KM',
    MNT: '₮',
    LKR: 'Rs',
    MMK: 'K',
    NPR: 'Rs',
    AFN: '؋',
    BND: 'B$',
    FJD: 'FJ$',
    PGK: 'K',
    WST: 'WS$',
    TOP: 'T$',
    VUV: 'VT',
    KPW: '₩',
    MOP: 'MOP$',
    BWP: 'P',
    SZL: 'E',
    LSL: 'L',
    NAD: 'N$',
    MUR: '₨',
    SCR: '₨',
    MVR: 'ރ',
    BBD: 'Bds$',
    BMD: 'BD$',
    KYD: 'CI$',
    ANG: 'ƒ',
    AWG: 'Afl',
    TTD: 'TT$',
    CUP: '$',
    DOP: 'RD$'
  }
  return icons[symbol] || 'icon:attach_money'
}

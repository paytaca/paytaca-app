import BCHJS from "@psf/bch-js";
import base58 from 'bs58'
import {
  CashAddressNetworkPrefix,
  CashAddressType,
  decodeCashAddress,
  encodeCashAddress,
} from '@bitauth/libauth'
import { convertCashAddress } from "src/wallet/chipnet";
import { LibauthHDWallet } from "src/wallet/bch-libauth";
import { Store } from "src/store";
import axios from "axios";

const bchjs = new BCHJS()

export function pubtoAddr(pubkey) {
  const ecPair = bchjs.ECPair.fromPublicKey(Buffer.from(pubkey, 'hex'))
  return bchjs.ECPair.toCashAddress(ecPair)
}

export function pkHashToCashAddr(pkHash='', isChipnet=false) {
  const address = bchjs.Address.toCashAddress(
    hash160ToLegacyAddress(Buffer.from(pkHash, 'hex'))
  )
  if (!isChipnet) return address
  return convertCashAddress(address, true, false)
}

export function hash160ToLegacyAddress(hash160=Buffer.from([])) {
  const versionByte = Buffer.from([0x00]); // Version byte for legacy addresses

  // Step 2: Prepend version byte
  const data = Buffer.concat([versionByte, hash160]);

  // Step 3: Append checksum
  const checksum = bchjs.Crypto.sha256(bchjs.Crypto.sha256(data)).slice(0, 4);
  const dataWithChecksum = Buffer.concat([data, checksum]);

  // Step 5: Base58 encode the data with checksum
  const legacyAddress = base58.encode(dataWithChecksum);

  return legacyAddress;
}

export function legacyAddressToHash160(legacyAddress) {
  // Decode the Base58Check-encoded legacy address
  const decoded = base58.decode(legacyAddress);

  // Extract the hash160 value by removing the version byte and checksum
  const hash160 = decoded.slice(1, -4);

  return Buffer.from(hash160).toString('hex');
}


export function cashAddrToPkHash(address='') {
  const legacyAddress = bchjs.Address.toLegacyAddress(address)
  return legacyAddressToHash160(legacyAddress)
}

export function wifToPriv(wif='') {
  // Code is based on: https://en.bitcoin.it/wiki/Wallet_import_format
  const wifBytes = base58.decode(wif)
  const wifHex = Buffer.from(wifBytes).toString('hex')
  let privkey = wifHex.slice(2, -8)
  if (privkey.endsWith('01')) privkey = privkey.slice(0, -2)
  return privkey
}

/**
 * @param {import('cashscript').Utxo} utxo
 */
export function parseUtxo(utxo) {
  return {
    txid: utxo?.txid,
    vout: utxo?.vout,
    satoshis: BigInt(utxo?.satoshis),
    token: !utxo?.token ? undefined : {
      category: utxo?.token?.category,
      amount: BigInt(utxo?.token?.amount),
      nft: !utxo?.token?.nft ? undefined : {
        capability: utxo?.token?.nft?.capability,
        commitment: utxo?.token?.nft?.commitment,
      }
    }
  }
}

/**
 * @param {import('cashscript').Utxo} utxo
 */
export function serializeUtxo(utxo) {
  return {
    txid: utxo?.txid,
    vout: utxo?.vout,
    satoshis: String(utxo?.satoshis),
    token: !utxo?.token ? undefined : {
      category: utxo?.token?.category,
      amount: String(utxo?.token?.amount),
      nft: !utxo?.token?.nft ? undefined : {
        capability: utxo?.token?.nft?.capability,
        commitment: utxo?.token?.nft?.commitment,
      }
    }
  }
}

export function reverseHex(hexString) {
  const bytes = Buffer.from(hexString, 'hex')
  bytes.reverse()
  return bytes.toString('hex')
}


export function intToHexString(num=20, bytelength=20) {
  let numHexBase = num.toString(16)
  if (numHexBase.length % 2 != 0) numHexBase = '0' + numHexBase
  let numBytes = Buffer.from(numHexBase, 'hex')
  numBytes = Buffer.concat([
    Buffer.from(new Array(bytelength - numBytes.length).fill(0)),
    numBytes,
  ])
  const numHex = reverseHex(numBytes.toString('hex'))

  return numHex
}


/**
 * @param {String} address 
 * @returns {String}
 */
export function toTokenAddress(address) {
  let cashAddress
  try{
    cashAddress = bchjs.Address.toCashAddress(address)
  } catch {
    cashAddress = address
  }

  const isTestnet = cashAddress.split(':')[0].indexOf('test') >= 0
  const decodedAddress = decodeCashAddress(cashAddress)
  const prefix = isTestnet ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
  let _addressType
  switch(decodedAddress.type) {
    case CashAddressType.p2pkh:
      _addressType = CashAddressType.p2pkhWithTokens;
      break;
    case CashAddressType.p2sh:
      _addressType = CashAddressType.p2shWithTokens;
      break;
    case CashAddressType.p2pkhWithTokens:
    case CashAddressType.p2shWithTokens:
      return cashAddress;
  }

  return encodeCashAddress(prefix, _addressType, decodedAddress.payload)
}

/**
 * @param {String} address 
 * @param {import("src/wallet").Wallet} wallet 
 * @returns {{ path:String, wif:String } | undefined}
 */
export async function resolvePrivateKeyFromAddress(address, wallet, maxIndex=100) {
  const dataFromStore = Store.getters['global/walletAddresses']
    ?.map?.(data => {
      if (data?.address !== address) return
      return { path: `0/${data?.address_index}`, wif: data?.wif }
    })
    .find(Boolean)
  if (dataFromStore) return dataFromStore

  const dataFromWatchtower = await resolvePrivateKeyWatchtower(address, wallet).catch(console.error)
  if (dataFromWatchtower) return dataFromWatchtower

  const tokenAddress = toTokenAddress(address) // just to make sure the address type is consistent
  const network = tokenAddress?.startsWith('bchtest') ? 'chipnet' : 'mainnet'
  const libauthWallet = new LibauthHDWallet(wallet.BCH.mnemonic, wallet.BCH.derivationPath, network)

  let path
  const _maxIndex = parseInt(maxIndex) || 100
  for(var index = 0; index < _maxIndex; index++) {
    const receiving = libauthWallet.getAddressAt({ path: `0/${index}`, token: true })
    const change = libauthWallet.getAddressAt({ path: `1/${index}`, token: true })
    if (tokenAddress == receiving) {
      path = `0/${index}`;
      break;
    }
    if (tokenAddress == change) {
      path = `1/${index}`;
      break;
    } 
  }

  if (!path) return

  return { path, wif: libauthWallet.getPrivateKeyWifAt(path) }
}


/**
 * @param {String} address 
 * @param {import("src/wallet").Wallet} wallet 
 */
export async function resolvePrivateKeyWatchtower(address, wallet) {
  const chipnet = address?.startsWith('bchtest')
  const addressUri = encodeURIComponent(address)
  const url = chipnet
    ? `https://chipnet.watchtower.cash/api/address-info/bch/${addressUri}/`
    : `https://watchtower.cash/api/address-info/bch/${addressUri}/`

  const response = await axios.get(url)
  const _address = response.data?.address
  const path = response.data?.address_path
  if(!path) return

  const libauthWallet = new LibauthHDWallet(
    wallet.BCH.mnemonic, wallet.BCH.derivationPath, chipnet ? 'chipnet' : 'mainnet')

  const __address = libauthWallet.getAddressAt({ path: path, token: false })
  if (_address !== __address) return

  return { path, wif: libauthWallet.getPrivateKeyWifAt(path) }
}

window.t = resolvePrivateKeyWatchtower

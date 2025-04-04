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
export function resolvePrivateKeyFromAddress(address, wallet, maxIndex=100) {
  const dataFromStore = Store.getters['global/walletAddresses']
    ?.map?.(data => {
      if (data?.address !== address) return
      return { path: `0/${data?.address_index}`, wif: data?.wif }
    })
    .find(Boolean)
  if (dataFromStore) return dataFromStore

  const tokenAddress = toTokenAddress(address) // just to make sure the address type is consistent
  const network = tokenAddress?.startsWith('bchtest') ? 'chipnet' : 'mainnet'
  const libauthWallet = new LibauthHDWallet(wallet.BCH.mnemonic, wallet.BCH.derivationPath, network)

  const path = Array.from({ length: parseInt(maxIndex) || 100 }).find((_, index) => {
    const receiving = libauthWallet.getAddressAt({ path: `0/${index}`, token: true })
    const change = libauthWallet.getAddressAt({ path: `1/${index}`, token: true })

    if (tokenAddress == receiving) return `0/${index}`
    if (tokenAddress == change) return `1/${index}`
  })

  if (!path) return

  return { path, wif: libauthWallet.getPrivateKeyWifAt(path) }
}

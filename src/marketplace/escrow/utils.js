import axios from "axios";
import { binToHex, hexToBin, hash256 } from '@bitauth/libauth'
import { LibauthHDWallet } from "src/wallet/bch-libauth";
import { Store } from "src/store";
import { toTokenAddress } from "src/utils/crypto";

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
 * @param {Object} opts
 * @param {Number} opts.nftId
 * @param {Number} opts.amount
 * @param {String} opts.category
 */
export function generateCommitment(opts) {
  if (!opts?.category) {
    return intToHexString(opts?.nftId, 20) + intToHexString(opts?.amount, 20) 
  }
  const tokenNftIdHash = hash256(
    hexToBin(reverseHex(opts.category) + intToHexString(opts.nftId, 20))
  );
  return binToHex(tokenNftIdHash) + intToHexString(opts?.amount, 8);
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

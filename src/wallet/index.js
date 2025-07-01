import { SlpWallet } from './slp'
import { SmartBchWallet } from './sbch'
import { BchWallet } from './bch'
import { LibauthHDWallet } from './bch-libauth'
import { sha256 } from 'js-sha256'
import aes256 from 'aes256'

import 'capacitor-secure-storage-plugin'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()

const projectId = {
  mainnet: process.env.WATCHTOWER_PROJECT_ID,
  chipnet: process.env.WATCHTOWER_CHIP_PROJECT_ID
}

export class Wallet {
  constructor (mnemonic, network = 'BCH') {
    this.mnemonic = mnemonic
    if (network === 'BCH') {
      this.loadBCH()
    } else if (network === 'sBCH') {
      this.loadSBCH()
    }
  }

  get BCH() {
    if (!this._BCH) this.loadBCH()
    return this._BCH
  }

  get BCH_CHIP() {
    if (!this._BCH_CHIP) this.loadBCH()
    return this._BCH_CHIP
  }

  get SLP() {
    if (!this._SLP) this.loadBCH()
    return this._SLP
  }

  get SLP_TEST() {
    if (!this._SLP_TEST) this.loadBCH()
    return this._SLP_TEST
  }

  get sBCH() {
    if (!this._sBCH) this.loadSBCH()
    return this._sBCH
  }

  loadBCH() {
    const derivationPaths = {
      bch: "m/44'/145'/0'",
      slp: "m/44'/245'/0'"
    }
    this._BCH = new BchWallet(projectId.mainnet, this.mnemonic, derivationPaths.bch) // Main BCH wallet
    this._BCH_CHIP = new BchWallet(projectId.chipnet, this.mnemonic, derivationPaths.bch, true) // Chip BCH wallet
    this._SLP = new SlpWallet(projectId.mainnet, this.mnemonic, derivationPaths.slp) // SLP wallet
    this._SLP_TEST = new SlpWallet(projectId.chipnet, this.mnemonic, derivationPaths.slp, true) // Test SLP wallet
  }

  loadSBCH() {
    this._sBCH = new SmartBchWallet(projectId.mainnet, this.mnemonic, "m/44'/60'/0'/0") // SmartBCH wallet
    this._sBCH.initWallet()
  }
}

export async function loadWallet(network = 'BCH', index = 0) {
  const mnemonic = await getMnemonic(index)
  return new Wallet(mnemonic, network)
}


/** @type {Wallet[]} */
const _wallets = []
export async function cachedLoadWallet(network='BCH', index = 0) {
  if (!_wallets[index]) {
    _wallets[index] = loadWallet(network, index)
  }
  return _wallets[index]
}

export async function loadLibauthHdWallet(index=0, chipnet=false) {
  const mnemonic = await getMnemonic(index)
  return new LibauthHDWallet(mnemonic, undefined, chipnet ? 'chipnet' : 'mainnet')
}


export async function generateMnemonic (index = 0) {
  let key = 'mn'
  if (index !== 0) {
    key = key + index
  }
  const mnemonic = bchjs.Mnemonic.generate(128)
  await SecureStoragePlugin.set({ key: key, value: mnemonic })
  return mnemonic
}

export async function storeMnemonic (mnemonic, index = 0) {
  let key = 'mn'

  if (index !== 0) {
    key = key + index
  }
  await SecureStoragePlugin.set({ key: key, value: mnemonic })
  return mnemonic
}

export async function getMnemonic (index = 0) {
  let mnemonic = null
  let key = 'mn'

  if (index !== 0) {
    key = key + index
  }

  try {
    // For versions up to v0.9.1 that used to have aes256-encrypted mnemonic
    const secretKey = await SecureStoragePlugin.get({ key: 'sk' })
    const encryptedMnemonic = await SecureStoragePlugin.get({ key: key })
    mnemonic = aes256.decrypt(secretKey.value, encryptedMnemonic.value)
  } catch (err) {
    try {
      mnemonic = await SecureStoragePlugin.get({ key: key })
      mnemonic = mnemonic.value
    } catch (err) {
      console.error(err)
    }
  }
  return mnemonic
}

export async function deleteMnemonic (index) {
  let key = 'mn'
  if (index !== 0) {
    key = key + index
  }
  await SecureStoragePlugin.remove({ key })
}

export async function deletePin (index) {
  const mnemonic = await getMnemonic(index)
  const pinKey = `pin-${sha256(mnemonic)}`
  await SecureStoragePlugin.remove({ key: pinKey })
}

export { Address } from 'watchtower-cash-js';

import { SlpWallet } from './slp'
import { SmartBchWallet } from './sbch'
import { BchWallet } from './bch'
import aes256 from 'aes256'
import { utils } from 'ethers'

import 'capacitor-secure-storage-plugin'
import { Plugins } from '@capacitor/core'

// import store from '../store'

const { SecureStoragePlugin } = Plugins

const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()

const projectId = process.env.WATCHTOWER_PROJECT_ID

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

  get SLP() {
    if (!this._SLP) this.loadBCH()
    return this._SLP
  }

  get sBCH() {
    if (!this._sBCH) this.loadSBCH()
    return this._sBCH
  }

  loadBCH() {
    this._BCH = new BchWallet(projectId, this.mnemonic, "m/44'/145'/0'") // Main BCH wallet
    this._SLP = new SlpWallet(projectId, this.mnemonic, "m/44'/245'/0'") // SLP wallet
  }

  loadSBCH() {
    this._sBCH = new SmartBchWallet(projectId, this.mnemonic, "m/44'/60'/0'/0") // SmartBCH wallet
    this._sBCH.initWallet()
  }
}

export async function loadWallet(network = 'BCH', index = 0) {
  const mnemonic = await getMnemonic(index)
  return new Wallet(mnemonic, network)
}

export async function generateMnemonic (index = 0) {
  console.log(index)
  let key = 'mn'
  if (index !== 0) {
    key = key + index
    console.log(key)
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
  console.log(key)
  await SecureStoragePlugin.set({ key: key, value: mnemonic })
  return mnemonic
}

export async function getMnemonic (index = 0) {
  // console.log(store)
  // console.log(store.getters['global/getWalletIndex'])
  // console.log(store.getters['global/getWalletIndex'])
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
    } catch (err) {}
  }
  return mnemonic
}

export class Address {
  constructor (address) {
    this.address = address
  }

  isSep20Address () {
    return utils.isAddress(this.address)
  }

  isLegacyAddress () {
    return bchjs.Address.isLegacyAddress(this.address)
  }

  toLegacyAddress () {
    return bchjs.Address.toLegacyAddress(this.address)
  }

  toCashAddress () {
    return bchjs.Address.toCashAddress(this.address)
  }

  isCashAddress () {
    return bchjs.Address.isCashAddress(this.address)
  }

  isMainnetCashAddress () {
    return bchjs.Address.isMainnetAddress(this.address)
  }

  isSLPAddress () {
    return bchjs.SLP.Address.isSLPAddress(this.address)
  }

  toSLPAddress () {
    return bchjs.SLP.Address.toSLPAddress(this.address)
  }

  isMainnetSLPAddress () {
    return bchjs.SLP.Address.isMainnetAddress(this.address)
  }
}

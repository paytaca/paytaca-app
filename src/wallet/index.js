import { SlpWallet } from './slp'
import { SmartBchWallet } from './sbch'
import { BchWallet } from './bch'
import randomBytes from 'randombytes'
import aes256 from 'aes256'
import { utils } from 'ethers'

import 'capacitor-secure-storage-plugin'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()

const projectId = process.env.WATCHTOWER_PROJECT_ID

export class Wallet {
  constructor (mnemonic) {
    this.mnemonic = mnemonic
    this.BCH = new BchWallet(projectId, mnemonic, "m/44'/145'/0'") // Main BCH wallet
    this.sBCH = new SmartBchWallet(projectId, mnemonic, "m/44'/60'/0'/0/0") // SmartBCH wallet
    this.SLP = new SlpWallet(projectId, mnemonic, "m/44'/245'/0'") // SLP wallet
  }
}

export async function generateMnemonic () {
  const mnemonic = bchjs.Mnemonic.generate(128)
  const secretKey = randomBytes(128).toString('hex')
  const encryptedMnemonic = aes256.encrypt(secretKey, mnemonic)
  await SecureStoragePlugin.set({ key: 'mn', value: encryptedMnemonic })
  await SecureStoragePlugin.set({ key: 'sk', value: secretKey })
  return mnemonic
}

export async function storeMnemonic (mnemonic) {
  const secretKey = randomBytes(128).toString('hex')
  const encryptedMnemonic = aes256.encrypt(secretKey, mnemonic)
  await SecureStoragePlugin.set({ key: 'mn', value: encryptedMnemonic })
  await SecureStoragePlugin.set({ key: 'sk', value: secretKey })
  return mnemonic
}

export async function getMnemonic () {
  const encryptedMnemonic = await SecureStoragePlugin.get({ key: 'mn' })
  const secretKey = await SecureStoragePlugin.get({ key: 'sk' })
  const mnemonic = aes256.decrypt(secretKey.value, encryptedMnemonic.value)
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

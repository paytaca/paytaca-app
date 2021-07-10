import { SlpWallet } from './slp'
import { BchWallet } from './bch'
import randomBytes from 'randombytes'
import aes256 from 'aes256'

import 'capacitor-secure-storage-plugin'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()

const projectId = 'd9d471d0-9f52-4d5b-8761-e71254f3720f'

export class Wallet {
  constructor (mnemonic) {
    this.BCH = new BchWallet(projectId, mnemonic, "m/44'/145'/0'") // Main BCH wallet
    this.BCHF = new BchWallet(projectId, mnemonic, "m/44'/146'/0'") // Fee funder BCH wallet
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

export async function getMnemonic () {
  const encryptedMnemonic = await SecureStoragePlugin.get({ key: 'mn' })
  const secretKey = await SecureStoragePlugin.get({ key: 'sk' })
  const mnemonic = aes256.decrypt(secretKey.value, encryptedMnemonic.value)
  return mnemonic
}

export default {
  Wallet,
  generateMnemonic,
  getMnemonic
}

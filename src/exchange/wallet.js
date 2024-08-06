import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256 } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadWallet } from 'src/wallet'
import { markRaw } from 'vue'
import { Store } from 'src/store'

export class RampWallet {
  constructor (walletIndex, walletHash, addressIndex, address, isChipnet = false) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.addressIndex = addressIndex
    this.address = address
    this.isChipnet = isChipnet
  }

  async raw () {
    const rawWallet = await markRaw(loadWallet('BCH', this.walletIndex))
    if (this.isChipnet) return rawWallet.BCH_CHIP
    return rawWallet.BCH
  }

  async keypair (addressPath = '') {
    const wallet = await this.raw()
    const privateKeyWif = await this.privkey(wallet, addressPath)
    const publicKey = await this.pubkey(wallet, addressPath)
    return {
      privateKey: privateKeyWif,
      publicKey: publicKey
    }
  }

  async addressPath (wallet = null, addressIndex = '') {
    if (!wallet) wallet = await this.raw()
    if (!addressIndex) addressIndex = this.addressIndex
    const { receiving, change } = await wallet.getAddressSetAt(addressIndex)

    let addressPath = `/${addressIndex}`
    if (this.address === receiving) addressPath = `0${addressPath}`
    if (this.address === change) addressPath = `1${addressPath}`

    return addressPath
  }

  async pubkey (wallet = null, addressPath = '') {
    if (!wallet) wallet = await this.raw()
    if (!addressPath) addressPath = await this.addressPath(wallet)
    const publicKey = await wallet.getPublicKey(addressPath)
    return publicKey
  }

  async privkey (wallet = null, addressPath = '') {
    if (!wallet) wallet = await this.raw()
    if (!addressPath) addressPath = await this.addressPath()
    const privateKeyWif = await wallet.getPrivateKey(addressPath)
    return privateKeyWif
  }

  async signMessage (wif, message, timestamp) {
    // hash the message
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = await sha256.hash(utf8ToBin(message))
    const privateKeyBin = decodePrivateKeyWif(wif).privateKey
    if (typeof privateKeyBin === 'string') throw (new IncorrectWIFError(wif))
    // sign
    const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
    if (typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin)
    return signature
  }
}

export function loadRampWallet () {
  const isChipnet = Store.getters['global/isChipnet']
  const walletIndex = Store.getters['global/getWalletIndex']
  const wallet = Store.getters['global/getWallet']('bch')
  const address = Store.getters['global/getAddress']('bch')
  return new RampWallet(walletIndex, wallet.walletHash, wallet.lastAddressIndex, address, isChipnet)
}
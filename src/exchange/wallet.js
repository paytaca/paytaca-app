import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256 } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadWallet } from 'src/wallet'
import { markRaw } from 'vue'
import { Store } from 'src/store'

export class RampWallet {
  constructor (walletIndex, walletHash, addressIndex, isChipnet = false) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.addressIndex = addressIndex
    this.isChipnet = isChipnet

    const data = {
      walletHash: walletHash,
      walletIndex: walletIndex,
      addressIndex: addressIndex,
      // address: address,
      isChipnet: isChipnet
    }
    console.log('RampWallet: ', data)
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

  async address (wallet = null, addressIndex = this.addressIndex) {
    if (!wallet) wallet = await this.raw()
    return await wallet.getAddressSetAt(addressIndex)
  }

  addressPath (addressIndex = this.addressIndex) {
    return `0/${addressIndex}`
  }

  async pubkey (wallet = null, addressPath = '') {
    if (!wallet) wallet = await this.raw()
    if (!addressPath) addressPath = this.addressPath()
    const publicKey = await wallet.getPublicKey(addressPath)
    return publicKey
  }

  async privkey (wallet = null, addressPath = '') {
    if (!wallet) wallet = await this.raw()
    if (!addressPath) addressPath = this.addressPath()
    const privateKeyWif = await wallet.getPrivateKey(addressPath)
    return privateKeyWif
  }

  async signMessage (wif, message, timestamp) {
    // hash the message
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = sha256.hash(utf8ToBin(message))
    const privateKeyBin = decodePrivateKeyWif(wif).privateKey
    if (typeof privateKeyBin === 'string') throw (new IncorrectWIFError(wif))
    // sign
    const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
    if (typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin)
    return signature
  }
}

export let rampWallet = new RampWallet()
export function loadRampWallet () {
  const isChipnet = Store.getters['global/isChipnet']
  const walletIndex = Store.getters['global/getWalletIndex']
  const wallet = Store.getters['global/getWallet']('bch')
  const address = Store.getters['global/getAddress']('bch')
  const addressIndex = 0
  rampWallet = new RampWallet(walletIndex, wallet.walletHash, addressIndex, isChipnet)
  return new RampWallet(walletIndex, wallet.walletHash, wallet.lastAddressIndex, address, isChipnet)
}

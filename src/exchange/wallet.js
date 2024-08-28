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
    this.raw()

    const data = {
      walletHash: walletHash,
      walletIndex: walletIndex,
      addressIndex: addressIndex,
      isChipnet: isChipnet
    }
    console.log('RampWallet: ', data)
  }

  async raw () {
    const rawWallet = await markRaw(loadWallet('BCH', this.walletIndex))
    if (this.isChipnet) {
      this.wallet = rawWallet.BCH_CHIP
    } else {
      this.wallet = rawWallet.BCH
    }
    return this.wallet
  }

  async keypair (addressPath = '') {
    const privateKeyWif = await this.privkey(addressPath)
    const publicKey = await this.pubkey(addressPath)
    return {
      privateKey: privateKeyWif,
      publicKey: publicKey
    }
  }

  async address (addressIndex = this.addressIndex) {
    if (!this.wallet) await this.raw()
    const { receiving } = await this.wallet.getAddressSetAt(addressIndex)
    return receiving
  }

  addressPath (addressIndex = this.addressIndex) {
    return `0/${addressIndex}`
  }

  async pubkey (addressPath = '') {
    if (!this.wallet) await this.raw()
    if (!addressPath) addressPath = this.addressPath()
    const publicKey = await this.wallet.getPublicKey(addressPath)
    return publicKey
  }

  async privkey (addressPath = '') {
    if (!this.wallet) await this.raw()
    if (!addressPath) addressPath = this.addressPath()
    const privateKeyWif = await this.wallet.getPrivateKey(addressPath)
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

const ADDRESS_INDEX = 0
export let wallet = new RampWallet()
export function loadRampWallet () {
  const isChipnet = Store.getters['global/isChipnet']
  const walletIndex = Store.getters['global/getWalletIndex']
  const globalWallet = Store.getters['global/getWallet']('bch')
  wallet = new RampWallet(walletIndex, globalWallet.walletHash, ADDRESS_INDEX, isChipnet)
  return wallet
}

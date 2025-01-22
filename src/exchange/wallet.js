import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256, hexToBin } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadLibauthHdWallet, loadWallet } from 'src/wallet'
import { Store } from 'src/store'
import { markRaw } from 'vue'

export class RampWallet {
  constructor (walletIndex, walletHash, addressIndex, isChipnet = false) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.addressIndex = addressIndex
    this.isChipnet = isChipnet
  }

  async loadWallet () {
    this.wallet = await loadLibauthHdWallet(this.walletIndex, this.isChipnet)
  }

  async getRawWallet () {
    let rawWallet = await markRaw(loadWallet('BCH', this.walletIndex))
    if (this.isChipnet) {
      rawWallet = rawWallet.BCH_CHIP
    } else {
      rawWallet = rawWallet.BCH
    }
    return rawWallet
  }

  keypair (addressPath = '') {
    const privateKeyWif = this.privkey(addressPath)
    const publicKey = this.pubkey(addressPath)
    return {
      privateKey: privateKeyWif,
      publicKey: publicKey
    }
  }

  addressPath (addressIndex = this.addressIndex) {
    return `0/${addressIndex}`
  }

  address (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.wallet.getAddressAt({ path: addressPath })
  }

  pubkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.wallet.getPubkeyAt(addressPath)
  }

  privkey (addressPath = '') {
    if (!addressPath) addressPath = this.addressPath()
    return this.wallet.getPrivateKeyWifAt(addressPath)
  }

  signMessage (wif, message, timestamp = null) {
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

  verifyMessage (publicKey, message, signature, timestamp = null) {
    // hash the message
    message = timestamp ? [message, timestamp].join('::') : message
    const messageHash = sha256.hash(utf8ToBin(message))
    const publicKeyBin = hexToBin(publicKey)
    const signatureBin = hexToBin(signature)
    // verify
    const isValid = secp256k1.verifySignatureDERLowS(signatureBin, publicKeyBin, messageHash)
    if (typeof isValid === 'string') throw new Error(isValid)
    return isValid
  }
}

const ADDRESS_INDEX = 0
export let wallet = new RampWallet()
export async function loadRampWallet () {
  const isChipnet = Store.getters['global/isChipnet']
  const walletIndex = Store.getters['global/getWalletIndex']
  const globalWallet = Store.getters['global/getWallet']('bch')
  wallet = new RampWallet(walletIndex, globalWallet.walletHash, ADDRESS_INDEX, isChipnet)
  await wallet.loadWallet()
  console.log('Loaded wallet:', wallet)
  return wallet
}

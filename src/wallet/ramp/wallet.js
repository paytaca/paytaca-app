import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256 } from '@bitauth/libauth'
import { IncorrectWIFError } from '@generalprotocols/anyhedge'
import { loadWallet } from 'src/wallet'
import { markRaw } from 'vue'
import { Store } from 'src/store'

export class RampWallet {
  constructor (walletHash, walletIndex, connectedAddressIndex, lastAddressIndex, address, isChipnet = false) {
    this.walletHash = walletHash
    this.walletIndex = walletIndex
    this.connectedAddressIndex = connectedAddressIndex
    this.lastAddressIndex = lastAddressIndex
    this.address = address
    this.isChipnet = isChipnet
    this.keypair()
  }

  async raw () {
    if (!this._raw) {
      await markRaw(loadWallet('BCH', this.walletIndex)).then(rawWallet => {
        this._raw = rawWallet
      })
    }
    if (this.isChipnet) return this._raw.BCH_CHIP
    return this._raw.BCH
  }

  async keypair () {
    return {
      privateKey: await this.pubkey(),
      publicKey: await this.privkey()
    }
  }

  async pubkey () {
    if (!this._pubkey) {
      const _raw = await this.raw()
      this._pubkey = _raw.getPublicKey(this.connectedAddressIndex)
    }
    return this._pubkey
  }

  async privkey () {
    if (!this._privkey) {
      const _raw = await this.raw()
      this._privkey = _raw.getPrivateKey(this.connectedAddressIndex)
    }
    return this._privkey
  }

  async signMessage (message, timestamp) {
    const wif = await this.privkey()
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

const isChipnet = Store.getters['global/isChipnet']
const walletIndex = Store.getters['global/getWalletIndex']
const wallet = Store.getters['global/getWallet']('bch')
const { connectedAddressIndex } = Store.getters['global/getWallet']('bch')
const address = Store.getters['global/getAddress']('bch')
const lastAddressIndex = Store.getters['global/getLastAddressIndex']('bch')

export const rampWallet = new RampWallet(wallet.walletHash, walletIndex, connectedAddressIndex, lastAddressIndex, address, isChipnet)

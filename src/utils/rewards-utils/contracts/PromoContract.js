import { Contract, ElectrumNetworkProvider, Network } from "cashscript"
import { compileString } from "cashc"
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'
import Watchtower from "watchtower-cash-js"

import PromoContractCash from 'src/cashscripts/rewards/PromoContract.cash'

const bchjs = new BCHJS()
const watchtower = new Watchtower(false)
const spiceDecimals = 8

export default class PromoContract {

  constructor (xPubKey, promo) {
    this.xPubkey = xPubKey
    this.promo = promo

    this.initializeContract(promo)
  }

  initializeContract () {
    const artifact = compileString(PromoContractCash)
    const provider = new ElectrumNetworkProvider(Network.MAINNET)
    const contractParams = [
      CryptoJS.SHA256(this.getPubKeyHash(this.xPubkey)).toString(),
      this.promo
    ]

    this.contract = new Contract(artifact, contractParams, { provider })
  }

  async subscribeAddress () {
    await watchtower.BCH._api.post('subscription/', { address: this.contract.address })
  }

  async getTokenBalance () {
    let balance = 0

    // retrieve balance from watchtower
    await watchtower.BCH._api.get(
      `cts/balances/${this.contract.tokenAddress}/fts`,
      { limit: 100 }
    ).then(resp => {
      const tokens = resp.data.results.map(token => {
        return {
          category: token?.tokenId,
          balance: token?.balance
        }
      })
      const spiceToken = tokens.filter(t => t.category === process.env.SPICE_TOKEN_ID)
      if (spiceToken.length > 0) {
        balance = Number(spiceToken[0].balance) / (10 ** spiceDecimals)
      }
    }).catch(async _error => {
      // retrieve balance from contract token utxos
      const spiceUtxos = await this.contract.getUtxos()
        .then(result => {
          return result.filter(r => r.token?.category === process.env.SPICE_TOKEN_ID)
        })
      balance = spiceUtxos.reduce((total, el) => {
        return total + (Number(el.token?.amount) / (10 ** spiceDecimals))
      }, 0)
    })

    return balance
  }

  /**
   * Generates a hash of the given public key using the hash160 algorithm.
   * @param {string} pubKey - The public key to be hashed, in hexadecimal format.
   * @returns {Buffer} The generated hash as a Buffer.
   */
  getPubKeyHash(pubKey) {
    return bchjs.Crypto.hash160(Buffer.from(pubKey, 'hex'))
  }
}
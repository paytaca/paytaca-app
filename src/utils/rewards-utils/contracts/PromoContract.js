import { Contract, ElectrumNetworkProvider, Network } from "cashscript"
import { compileString } from "cashc"
import BCHJS from '@psf/bch-js'
import CryptoJS from 'crypto-js'
import Watchtower from "watchtower-cash-js"

import PromoContractCash from 'src/cashscripts/rewards/PromoContract.cash'

const bchjs = new BCHJS()
const watchtower = new Watchtower(false)
const spiceDecimals = 8

/**
 * Represents an instance of a promo contract. May vary
 * depending on the initialized promo.
 */
export default class PromoContract {
  /**
   * @param {string} xPubKey the xpubkey of the user's wallet
   * @param {'ur' | 'rfp' | 'lp' | 'cp' | 'pprp'} promo type of promo
   */
  constructor (xPubKey, promo) {
    this.xPubkey = xPubKey
    this.promo = promo

    this.initializeContract()
  }

  /**
   * Initializes the contract by compiling its source code, generating
   * the contract parameters, and creating a new Contract instance.
   */
  initializeContract () {
    const artifact = compileString(PromoContractCash)
    const provider = new ElectrumNetworkProvider(Network.MAINNET)
    const contractParams = [
      CryptoJS.SHA256(this.getPubKeyHash(this.xPubkey)).toString(),
      this.promo
    ]

    this.contract = new Contract(artifact, contractParams, { provider })
  }

  /**
   * Subscribes the address of the contract to Watchtower
   * to watch for transactions to and from the address.
   */
  async subscribeAddress () {
    await watchtower.BCH._api.post('subscription/', { address: this.contract.address })
  }

  /**
   * Computes the SPICE token balance of the contract. It first retrieves
   * the balance on Watchtower. If it fails, it retrieves the balance
   * from the contract itself.
   * @returns the computed SPICE token balance
   */
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
        balance = Number(spiceToken[0].balance)
        // balance = Number(spiceToken[0].balance) / (10 ** spiceDecimals)
      }
    }).catch(async _error => {
      // retrieve balance from contract token utxos
      const spiceUtxos = await this.contract.getUtxos()
        .then(result => {
          return result.filter(r => r.token?.category === process.env.SPICE_TOKEN_ID)
        })
      balance = spiceUtxos.reduce((total, el) => {
        return total + Number(el.token?.amount)
      }, 0)
      // balance = spiceUtxos.reduce((total, el) => {
      //   return total + (Number(el.token?.amount) / (10 ** spiceDecimals))
      // }, 0)
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
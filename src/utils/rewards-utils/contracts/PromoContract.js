import { Contract, ElectrumNetworkProvider, Network, SignatureTemplate } from "cashscript"
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

  async redeemPromoTokenToBch (promo) {
    console.log('redeem')
    const output = [
      // 0th output is promo token
      {
        // get token address of swap contract from server
        to: 'bitcoincash:rvwpjvfxc3a6hjlr6y84ech7txlsw7y0gxmppsqmcfpyv8cdhvhtvg82n0us6',
        amount: BigInt(1000),
        token: {
          amount: BigInt(2),
          category: process.env.PROMO_TOKEN_ID,
        }
      },
      // 1st output is AuthKeyNFT
      {
        // get token address of swap contract from server
        to: 'bitcoincash:rvwpjvfxc3a6hjlr6y84ech7txlsw7y0gxmppsqmcfpyv8cdhvhtvg82n0us6',
        amount: BigInt(1000),
        token: {
          amount: BigInt(0),
          category: process.env.PROMO_TOKEN_ID,
          nft: {
            capability: 'none',
            commitment: '01' // get commitment from stored AuthKeyNFT
          }
        }
      }
    ]
    const temp = await this.contract.functions
      .transfer(new SignatureTemplate(this.xPubkey), promo)
      .to(output)
      .send()
    console.log(temp)
  }

  unlockPromoToken () {
    console.log('unlock')
  }

  /**
   * Subscribes the address of the contract to Watchtower
   * to watch for transactions to and from the address.
   */
  async subscribeAddress () {
    await watchtower.BCH._api.post('subscription/', { address: this.contract.address })
  }

  /**
   * Computes the promo token balance of the contract. It first retrieves
   * the balance on Watchtower. If it fails, it retrieves the balance
   * from the contract itself.
   * @returns the computed promo token balance
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
      const promoToken = tokens.filter(t => t.category === process.env.PROMO_TOKEN_ID)
      if (promoToken.length > 0) {
        balance = Number(promoToken[0].balance)
        // balance = Number(promoToken[0].balance) / (10 ** spiceDecimals)
      }
    }).catch(async _error => {
      // retrieve balance from contract token utxos
      const promoTokenUtxos = await this.contract.getUtxos()
        .then(result => {
          return result.filter(r => r.token?.category === process.env.PROMO_TOKEN_ID)
        })
      balance = promoTokenUtxos.reduce((total, el) => {
        return total + Number(el.token?.amount)
      }, 0)
      // balance = promoTokenUtxos.reduce((total, el) => {
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
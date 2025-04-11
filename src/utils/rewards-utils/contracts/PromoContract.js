import { Contract, ElectrumNetworkProvider, Network, SignatureTemplate } from "cashscript"
import { compileString } from "cashc"

import BCHJS from '@psf/bch-js'
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
   * @param {'ur' | 'rfp' | 'lp' | 'cp' | 'pprp'} promo type of promo
   * @param {Uint8Array<ArrayBufferLike>} pubKey the public key derived from the user's wallet mnemonic
   */
  constructor (promo, pubKey) {
    this.promo = promo

    this.initializeContract(pubKey)
  }

  /**
   * Initializes the contract by compiling its source code, generating
   * the contract parameters, and creating a new Contract instance.
   * @param {Uint8Array<ArrayBufferLike>} pubKey the public key derived from the user's wallet mnemonic
   */
  initializeContract (pubKey) {
    const artifact = compileString(PromoContractCash)
    const provider = new ElectrumNetworkProvider(Network.MAINNET)
    const contractParams = [pubKey, this.promo]

    this.contract = new Contract(artifact, contractParams, { provider })
  }

  async redeemPromoTokenToBch (promo, redeemAmount, walletHash, swapContractAddress, privKey) {
    console.log('redeem')
    /*
    // get AuthKeyNFT details from user wallet
    const category = process.env.AUTHKEY_NFT_CHILDREN_TOKEN_ID
    const params = `?wallet_hash=${walletHash}&has_balance=true&category=${category}`
    const nft_url = `https://watchtower.cash/api/cashtokens/nft/${params}`
    const authKeyNft = await axios
      .get(nft_url)
      .then(response => {
        return response.data.results[0]
      })
    */
    
    // send AuthKeyNFT from user wallet to contract ct

    // compile outputs
    const output = [
      // 0th output is promo token
      {
        to: swapContractAddress,
        amount: BigInt(1000),
        token: {
          amount: BigInt(redeemAmount),
          category: process.env.PROMO_TOKEN_ID,
        }
      }/*,
      // 1st output is AuthKeyNFT
      {
        // get token address of swap contract from server
        to: 'bitcoincash:rvwpjvfxc3a6hjlr6y84ech7txlsw7y0gxmppsqmcfpyv8cdhvhtvg82n0us6',
        amount: BigInt(1000),
        token: {
          amount: BigInt(0),
          category: authKeyNft.category,
          nft: {
            capability: authKeyNft.capability,
            commitment: authKeyNft.commitment
          }
        }
      }*/
    ]
    console.log(output)
    const temp = await this.contract.functions
      .transfer(new SignatureTemplate(privKey), promo)
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
}
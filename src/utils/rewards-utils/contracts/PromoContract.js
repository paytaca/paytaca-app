import { ElectrumNetworkProvider, Network } from "cashscript"
import { Contract, SignatureTemplate } from 'cashscript0.10.0'
import { compileString } from "cashc0.10.0"
import { getChangeAddress } from "src/utils/send-page-utils"
import { getMnemonic, Wallet } from "src/wallet"
import { markRaw } from "vue"
import { Store } from "src/store"
import { getWalletByNetwork } from "src/wallet/chipnet"
import { getWalletTokenAddress } from "src/utils/engagementhub-utils/rewards"

import axios from "axios"
import Watchtower from "watchtower-cash-js"

import PromoContractCash from 'src/cashscripts/rewards/PromoContract.cash'

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

  async redeemPromoTokenToBch (amount, walletHash, swapContractAddress, privKey) {
    // get AuthKeyNFT details from user wallet
    const category = process.env.AUTHKEY_NFT_CHILDREN_TOKEN_ID
    const params = `?wallet_hash=${walletHash}&has_balance=true&category=${category}`
    const nft_url = `https://watchtower.cash/api/cashtokens/nft/${params}`
    const authKeyNft = await axios
      .get(nft_url)
      .then(response => {
        return response.data.results[0]
      })
    console.log(authKeyNft)
    
    // send AuthKeyNFT from user wallet to contract ct
    const recipientParams = [{
      address: this.contract.tokenAddress,
      amount: 0.00001,
      tokenAmount: 0
    }]
    const tokenParams = {
      tokenId: authKeyNft.category,
      commitment: authKeyNft.commitment,
      capability: authKeyNft.capability,
      txid: authKeyNft.current_txid,
      vout: "" + authKeyNft.current_index
    }
    const changeAddress = getChangeAddress('bch')

    const walletIndex = Store.getters['global/getWalletIndex']
    const mnemonic = await getMnemonic(walletIndex)
    const wallet = markRaw(new Wallet(mnemonic, this.network))
    await getWalletByNetwork(wallet, 'bch')
      .sendBch(0, '', changeAddress, tokenParams, undefined, recipientParams)
      .then(result => {
        console.log(result)
      })

    // compile outputs
    const output = [
      // 0th output is promo token
      {
        to: swapContractAddress,
        amount: BigInt(1000),
        token: {
          amount: BigInt(amount),
          category: process.env.PROMO_TOKEN_ID,
        }
      },
      // 1st output is AuthKeyNFT
      {
        to: swapContractAddress,
        amount: BigInt(1000),
        token: {
          amount: BigInt(0),
          category: authKeyNft.category,
          nft: {
            capability: authKeyNft.capability,
            commitment: authKeyNft.commitment
          }
        }
      }
    ]

    const temp = await this.contract.functions
      .transfer(new SignatureTemplate(privKey), this.promo)
      .to(output)
      .send()
    console.log(temp)
  }

  /**
   * Recover AuthKeyNFT sent to this contract then send it to user wallet.
   * Called when redeeming promo token to BCH fails for some reason.
   * @param {Uint8Array} privKey 
   */
  async recoverAuthKeyNft (privKey) {
    const category = process.env.AUTHKEY_NFT_CHILDREN_TOKEN_ID
    // filter utxos with token and with AuthKeyNFT category
    const contractUtxos = await this.contract.getUtxos()
    const balanceUtxos = contractUtxos
      .filter(utxo =>
        utxo?.token?.category === undefined && utxo.satoshis > BigInt(1000)
      )
      // ensure that the UTXO with most satoshis is used
      .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
    const authKeyNftUtxo = contractUtxos.filter(utxo =>
      utxo?.token?.category === category && utxo?.token?.amount === BigInt(0)
    )[0]

    // check if authkeynft is present
    if (authKeyNftUtxo) {
      const userTokenAddress = await getWalletTokenAddress()
      const output = [
        {
          to: userTokenAddress,
          amount: BigInt(1000),
          token: {
            amount: BigInt(0),
            category: authKeyNftUtxo.token.category,
            nft: {
              capability: authKeyNftUtxo.token.nft.capability,
              commitment: authKeyNftUtxo.token.nft.commitment
            }
          }
        }
      ]

      const sigTemp = new SignatureTemplate(privKey)
      await this.contract.functions
        .transfer(sigTemp, this.promo)
        .from([authKeyNftUtxo, balanceUtxos])
        .to(output)
        .send()
    } else {
      // error
      console.error('Contract does not have any AuthKeyNFTs stored.')
    }
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
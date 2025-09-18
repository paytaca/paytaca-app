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

import PromoContractArtifact from 'src/cashscripts/rewards/PromoContract.json'

const watchtower = new Watchtower(false)
const promoTokensDecimals = 2

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
    const provider = new ElectrumNetworkProvider(Network.MAINNET)
    const contractParams = [pubKey, this.promo]
    this.contract = new Contract(PromoContractArtifact, contractParams, { provider })
  }

  /**
   * Facilitate the swapping of promo token to BCH. It sends the AuthKeyNFT to
   * the promo contract to be included in the transaction output, which will be
   * processed in the engagement-hub server.
   * @param {Number} amount the amount to be swapped
   * @param {string} walletHash the wallet hash of the user's wallet
   * @param {string} swapContractAddress the token address of the swap contract
   * @param {Uint8Array} privKey the private key derived as a key pair from the wallet's mnemonic
   * @param {number} retries number of retries when transaction fails
   * @returns the transaction ID (`txid`) of the successful transaction; `undefined` otherwise
   */
  async redeemPromoTokenToBch(
    amount, walletHash, swapContractAddress, privKey, retries = 0
  ) {
    let txId
    // get AuthKeyNFT details from user wallet
    const category = process.env.AUTHKEY_NFT_CHILDREN_TOKEN_ID
    const params = `?wallet_hash=${walletHash}&has_balance=true&category=${category}`
    const nft_url = `https://watchtower.cash/api/cashtokens/nft/${params}`
    const authKeyNft = await axios
      .get(nft_url)
      .then(response => {
        return response.data.results[0]
      })
    
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
    const result = await getWalletByNetwork(wallet, 'bch')
      .sendBch(0, '', changeAddress, tokenParams, undefined, recipientParams)
    
    if (result.success) {
      // 1 second timeout to properly load contract utxos after recent transaction
      setTimeout(() => { }, 1000);
      
      try {
        const contractUtxos = await this.contract.getUtxos()
        const balanceUtxos = contractUtxos
          .filter(utxo =>
            utxo?.token?.category === undefined && utxo?.satoshis > BigInt(1000)
          )
        const authKeyNftUtxo = contractUtxos.filter(utxo =>
          utxo?.token?.category === category && utxo?.token?.amount === BigInt(0)
        )[0]
        const tokenUtxos = contractUtxos.filter(utxo => 
          utxo?.token?.category === process.env.PROMO_TOKEN_ID
        )
        
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
              category: authKeyNftUtxo.token.category,
              nft: {
                capability: authKeyNftUtxo.token.nft.capability,
                commitment: authKeyNftUtxo.token.nft.commitment
              }
            }
          }
        ]

        const transaction = await this.contract.functions
          .transfer(new SignatureTemplate(privKey), this.promo)
          .from([authKeyNftUtxo, ...tokenUtxos, ...balanceUtxos])
          .to(output)
          .send()
        txId = transaction.txid
        console.log('Swap transaction processed successfully.')
      } catch (error) {
        console.error(error)
        await this.recoverAuthKeyNft(privKey)
        if (retries <= 3) {
          txId = await this.redeemPromoTokenToBch(
            amount, walletHash, swapContractAddress, privKey, retries + 1
          )
        }
      }
    } else {
      console.error('An error occurred while sending AuthKeyNFT to promo contract.')
    }

    return txId
  }

  /**
   * Recover AuthKeyNFT sent to this contract then send it to user wallet.
   * Called when redeeming promo token to BCH fails for some reason.
   * @param {Uint8Array} privKey 
   */
  async recoverAuthKeyNft (privKey) {
    const category = process.env.AUTHKEY_NFT_CHILDREN_TOKEN_ID
    const contractUtxos = await this.contract.getUtxos()
    const balanceUtxos = contractUtxos
      .filter(utxo =>
        utxo?.token?.category === undefined && utxo.satoshis > BigInt(1000)
      )
      // ensure that the UTXO with most satoshis is used
      .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))[0]
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
      console.log('AuthKeyNFT returned successfully. Retrying redemption if allowed.')
    } else {
      // error
      console.error('Contract does not have any AuthKeyNFTs stored.')
    }
  }

  /**
   * Converts the stored points determined by the given amount in the contract to Paytaca tokens.
   * Since the points stored in the contract are also Paytaca tokens, in essence, this "unlocks"
   * the tokens and is sent to the user's wallet token address, creating a new or adding to
   * their existing token supply.
   * @param {Uint8Array} privKey the private key derived as a key pair from the wallet's mnemonic
   * @param {string} tokenAddress the token address of the user's wallet
   * @param {number} amount the amount to be swapped
   * @returns the transaction ID (`txid`) of the successful transaction; `undefined` otherwise
   */
  async unlockPromoToken (privKey, tokenAddress, amount) {
    let txId

    const contractUtxos = await this.contract.getUtxos()
    const balanceUtxos = contractUtxos
      .filter(utxo =>
        utxo?.token?.category === undefined && utxo?.satoshis > BigInt(1000)
      )
    const tokenUtxos = contractUtxos.filter(utxo => 
      utxo?.token?.category === process.env.PROMO_TOKEN_ID
    )

    const output = [{
      to: tokenAddress,
      amount: BigInt(1000),
      token: {
        amount: BigInt(amount),
        category: process.env.PROMO_TOKEN_ID,
      }
    }]
    
    try {
      const transaction = await this.contract.functions
        .transfer(new SignatureTemplate(privKey), this.promo)
        .from([...tokenUtxos, ...balanceUtxos])
        .to(output)
        .send()
      txId = transaction.txid
      console.log('Convert transaction processed successfully.')
    } catch {
      console.log('Convert transaction failed.')
    }

    return txId
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
        balance = Number(promoToken[0].balance) / (10 ** promoTokensDecimals)
      }
    }).catch(async _error => {
      // retrieve balance from contract token utxos
      const promoTokenUtxos = await this.contract.getUtxos()
        .then(result => {
          return result.filter(r => r.token?.category === process.env.PROMO_TOKEN_ID)
        })
      balance = promoTokenUtxos.reduce((total, el) => {
        return total + (Number(el.token?.amount) / (10 ** promoTokensDecimals))
      }, 0)
    })

    return balance
  }
}
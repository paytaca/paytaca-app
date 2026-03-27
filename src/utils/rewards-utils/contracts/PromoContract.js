import {
  Network,
  Contract,
  SignatureTemplate,
  TransactionBuilder,
  ElectrumNetworkProvider,
} from "cashscript"
import { PROMO_TOKEN_CATEGORY } from "src/utils/engagementhub-utils/rewards"

import axios from "axios"

import PromoContractArtifact from 'src/cashscripts/rewards/PromoContractv1.json'

const ADMIN_PUBKEY = process.env.ADMIN_PUBKEY

/**
 * Represents an instance of a promo contract. May vary
 * depending on the initialized promo.
 */
export default class PromoContract {
  /**
   * Constructor of the PromoContract class
   * @param {String} userPubKey the public key derived from the user's wallet mnemonic
   * @param {String} promo 1-byte hex string representing the target promo
   */
  constructor (userPubKey, promo) {
    this.promo = promo
    this.provider = null

    this.initializeContract(userPubKey)
  }

  /**
   * Initializes the contract by compiling its source code, generating
   * the contract parameters, and creating a new Contract instance.
   * @param {String} userPubKey the public key derived from the user's wallet mnemonic
   */
  initializeContract (userPubKey) {
    this.provider = new ElectrumNetworkProvider(Network.MAINNET)
    const contractParams = [ADMIN_PUBKEY, userPubKey, PROMO_TOKEN_CATEGORY, this.promo]
    this.contract = new Contract(PromoContractArtifact, contractParams, { provider: this.provider })
  }

  async redeemPoints (userWif, userTokenAddress, pointsToRedeem) {
    // get utxos
    const contractUtxos = await this.contract.getUtxos()

    // compute bch and token balances
    const bchBalance = contractUtxos.reduce((prev, utxo) => prev + utxo.satoshis, 0n)
    const tokenBalance = contractUtxos.reduce((prev, utxo) => prev + utxo.token?.amount, 0n)
    const fee = tokenBalance - pointsToRedeem > 0n ? 2000n : 1000n

    // build input
    const inputs = contractUtxos

    // build output
    const outputs = [
      // user address in outputs[0]
      {
        to: userTokenAddress,
        amount: 1000n,
        token: {
          amount: pointsToRedeem,
          category: this.changeEndianness(PROMO_TOKEN_CATEGORY)
        }
      },
      // BCH change output in outputs[1]
      {
        to: this.contract.tokenAddress,
        amount: bchBalance - fee
      }
    ]
    if (tokenBalance - pointsToRedeem > 0n) {
      // tokens change output in outputs[2]
      outputs.push({
        to: this.contract.tokenAddress,
        amount: 1000n,
        token: {
          amount: tokenBalance - pointsToRedeem,
          category: this.changeEndianness(PROMO_TOKEN_CATEGORY)
        }
      })
    }

    // build tx
    const txDetails = await new TransactionBuilder({ provider: this.provider })
      .addInputs(
        inputs,
        this.contract.unlock.withdraw(new SignatureTemplate(userWif), this.promo)
      )
      .addOutputs(outputs)
      .send()

    return txDetails.txid
  }

  /**
   * Subscribes the address of the contract to Watchtower
   * to watch for transactions to and from the address.
   */
  async subscribeAddress () {
    try {
      await axios.post("https://watchtower.cash/api/subscription/", { address: this.contract.address });
    } catch {}
  }

  /**
   * Computes the LIFT token balance of the contract.
   * @returns the computed LIFT token balance
   */
  async getTokenBalance () {
    const tokenUtxos = await this.contract.getUtxos()
      .then(utxos => utxos.filter(r => r.token?.category === PROMO_TOKEN_CATEGORY)
    )
    if (tokenUtxos.length === 0) return 0
    return tokenUtxos
      .reduce((total, el) => {
        return total + (Number(el.token?.amount))
      }, 0)
  }

  /**
   * Swaps the endian-ness (byte order) of the string,
   * since the contract uses the reversed order.
   * From https://stackoverflow.com/a/47668549.
   * @param {string} string the string to be reversed
   * @returns the swapped string
   */
  changeEndianness(string) {
    const result = [];
    let len = string.length - 2;
    while (len >= 0) {
      result.push(string.substring(len, len + 2));
      len -= 2;
    }
    return result.join("");
  }
}
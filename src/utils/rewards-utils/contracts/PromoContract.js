import { ElectrumNetworkProvider, Network, Contract } from "cashscript"
import { PROMO_TOKEN_CATEGORY } from "src/utils/engagementhub-utils/rewards"

import axios from "axios"

import PromoContractArtifact from 'src/cashscripts/rewards/PromoContractv1.json'

const ADMIN_PUBKEY = process.env.ADMIN_PUBKEY
const liftTokenDecimals = 2

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

    this.initializeContract(userPubKey)
  }

  /**
   * Initializes the contract by compiling its source code, generating
   * the contract parameters, and creating a new Contract instance.
   * @param {String} userPubKey the public key derived from the user's wallet mnemonic
   */
  initializeContract (userPubKey) {
    const provider = new ElectrumNetworkProvider(Network.MAINNET)
    const contractParams = [ADMIN_PUBKEY, userPubKey, PROMO_TOKEN_CATEGORY, this.promo]
    this.contract = new Contract(PromoContractArtifact, contractParams, { provider })
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
        return total + (Number(el.token?.amount) / (10 ** liftTokenDecimals))
      }, 0)
  }
}
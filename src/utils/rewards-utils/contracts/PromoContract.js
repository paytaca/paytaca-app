import {
  Output,
  Network,
  Contract,
  SignatureTemplate,
  TransactionBuilder,
  ElectrumNetworkProvider,
} from "cashscript"

import { getOutputSize } from "cashscript/dist/utils";
import { calculateInputSize } from 'src/utils/cashscript-utils';
import { PROMO_TOKEN_CATEGORY, PROMO_TOKEN_DECIMALS } from "src/utils/engagementhub-utils/rewards"

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
    const contractParams = [
      ADMIN_PUBKEY,
      userPubKey,
      this.changeEndianness(PROMO_TOKEN_CATEGORY),
      this.promo
  ]
    this.contract = new Contract(PromoContractArtifact, contractParams, { provider: this.provider })
  }

  async redeemPoints (userWif, rewardsSwapContractAddress, pointsToRedeem) {
    const payload = { txid: '', error: '', fee: 0 }

    // get utxos
    const contractUtxos = await this.contract.getUtxos()
    // compute bch and token balances
    const bchBalance = contractUtxos.reduce((prev, utxo) => prev + utxo.satoshis, 0n)
    const tokenBalance = contractUtxos
      .filter(utxo => utxo.token)
      .reduce((prev, utxo) => prev + utxo.token?.amount, 0n)

    // multiple points to redeem by token decimal
    const actualPointstoRedeem = BigInt(pointsToRedeem * (10 ** PROMO_TOKEN_DECIMALS))

    // build input
    const inputs = contractUtxos

    // build output
    const outputs = [
      // user address in outputs[0]
      {
        to: rewardsSwapContractAddress,
        amount: 1000n,
        token: {
          amount: actualPointstoRedeem,
          category: PROMO_TOKEN_CATEGORY
        }
      }
    ]

    if (tokenBalance - actualPointstoRedeem > 0n) {
      // token change output in outputs[1]
      // (will be outputs[2] later on after inserting bch change output)
      outputs.push({
        to: this.contract.tokenAddress,
        amount: 1000n,
        token: {
          amount: tokenBalance - actualPointstoRedeem,
          category: PROMO_TOKEN_CATEGORY
        }
      })
    }

    // compute fee
    const tx = this.contract.functions.easyWithdraw(new SignatureTemplate(userWif), this.promo)
    // +1 in outputs length for bch change output
    const fee = this.computeContractFee(tx, outputs, inputs.length, outputs.length + 1, 1.5)

    // insert bch change outputs to outputs[1]
    // (token change output is now in outputs[2] if existing)
    outputs.splice(1, 0, {
      to: this.contract.tokenAddress,
      amount: bchBalance - fee - 1000n
    })

    // build tx
    try {
      const txDetails = await new TransactionBuilder({ provider: this.provider })
        .addInputs(
          inputs,
          this.contract.unlock.easyWithdraw(new SignatureTemplate(userWif), this.promo)
        )
        .addOutputs(outputs)
        .send()
  
      payload.txid = txDetails.txid
    } catch (error) {
      if (error?.requireStatement?.message)
        payload.error = error?.requireStatement?.message
      else payload.error = error.message
      payload.fee = fee + 1000n
    }

    return payload
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
      }, 0) / (10 ** PROMO_TOKEN_DECIMALS)
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

  /**
   * Compute the network fee of a contract transaction.
   * @param {Transaction} tx the transaction used to compute the input size
   * @param {Output[]} outputs the outputs of the transaction
   * @param {number} inputLen the length of the input
   * @param {number} outputLen the length of the output
   * @param {number} feeRate the fee rate to be used for the computation (default 1 sats/byte)
   * @returns the computed contract network fee
   */
  computeContractFee(tx, outputs, inputLen, outputLen, feeRate=1) {
    const inputSize = calculateInputSize(tx)

    let outputSize = 0
    for (const output of outputs) {
      outputSize += getOutputSize(output)
    }

    return BigInt(Math.floor(((inputSize * inputLen) + (outputSize * outputLen) + 10) * feeRate))
  }
}
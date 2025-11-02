import BCHJS from "@psf/bch-js"
import axios from "axios";
import {
  CashAddressNetworkPrefix,
  CashAddressType,
  decodeCashAddress,
  encodeCashAddress,
  binToHex,
} from "@bitauth/libauth";

import Watchtower from "watchtower-cash-js";

export default class SingleWallet {
  constructor(opts = { wif: '', isChipnet: false }) {
    this.bchjs = new BCHJS()
    this.wif = opts?.wif
    this.isChipnet = opts?.isChipnet;

    this.watchtower = new Watchtower(this.isChipnet)
    this.balances = [].map(() => {
      return { assetId: 'bch', balance: 0, spendable: 0 }
    })
  }

  get wif() {
    return this._keys?.wif
  }

  set wif(data) {
    const _ecpair = this.bchjs.ECPair.fromWIF(data);
    const pubkey = binToHex(this.bchjs.ECPair.toPublicKey(_ecpair));
    const _decodedAddress = decodeCashAddress(this.bchjs.ECPair.toCashAddress(_ecpair));
    if (typeof _decodedAddress === 'string') {
      throw new Error(`Unable to decode address: ${_decodedAddress}`);
    }

    const cashAddress = encodeCashAddress(
      CashAddressNetworkPrefix.mainnet,
      CashAddressType.p2pkh,
      _decodedAddress.payload,
    );
    const tokenAddress = encodeCashAddress(
      CashAddressNetworkPrefix.mainnet,
      CashAddressType.p2pkhWithTokens,
      _decodedAddress.payload,
    );
    const testnetCashAddress = encodeCashAddress(
      CashAddressNetworkPrefix.testnet,
      CashAddressType.p2pkh,
      _decodedAddress.payload,
    );
    const testnetTokenAddress = encodeCashAddress(
      CashAddressNetworkPrefix.testnet,
      CashAddressType.p2pkhWithTokens,
      _decodedAddress.payload,
    );
    const slpAddress = String(this.bchjs.SLP.Address.toSLPAddress(cashAddress))
    const testnetSlpAddress = String(this.bchjs.SLP.Address.toSLPAddress(testnetCashAddress))

    const keys = Object.freeze({
      wif: data,
      pubkey: pubkey,
      cashAddress: cashAddress,
      tokenAddress: tokenAddress,
      slpAddress: slpAddress,
      testnetSlpAddress: testnetSlpAddress,
      testnetAddress: testnetCashAddress,
      testnetTokenAddress: testnetTokenAddress,
    });

    if (this.wif !== keys.wif) this.balances = []
    Object.defineProperty(this, '_keys', { enumerable: false, configurable: true, value: keys })
  }

  get cashAddress() {
    return this._keys?.cashAddress
  }

  get tokenAddress() {
    return this._keys?.tokenAddress
  }

  get slpAddress() {
    return this._keys.slpAddress
  }

  get testnetAddress() {
    return this._keys?.testnetAddress
  }

  get testnetTokenAddress() {
    return this._keys?.testnetTokenAddress
  }

  get testnetSlpAddress() {
    return this._keys?.testnetSlpAddress
  }

  getAddressForAssetId(assetId='') {
    if (assetId?.startsWith?.('slp/')) {
      return this.isChipnet ? this.testnetSlpAddress : this.slpAddress
    }
    if (assetId?.startsWith?.('ct/')) {
      return this.isChipnet ? this.testnetTokenAddress : this.tokenAddress
    }
    return this.isChipnet ? this.testnetAddress : this.cashAddress
  }

  fetchBchBalance() {
    const address = this.isChipnet ? this.testnetAddress : this.cashAddress;
    return this.watchtower.BCH._api.get(`balance/bch/${address}/`)
      .then(response => this.$handleBalanceResponse(response, 'bch'))
  }

  fetchCashtokenBalance(category) {
    const tokenAddress = this.isChipnet ? this.testnetTokenAddress : this.tokenAddress;
    return this.watchtower.BCH._api.get(`balance/ct/${tokenAddress}/${category}/`)
      .then(response => this.$handleBalanceResponse(response, `ct/${category}`))
  }

  fetchSlpTokenBalance(tokenid) {  
    const slpAddress = this.isChipnet ? this.testnetSlpAddress : this.slpAddress;
    return this.watchtower.SLP._api.get(`balance/slp/${slpAddress}/${tokenid}/`)
      .then(response => this.$handleBalanceResponse(response, `slp/${tokenid}`))
  }

  getBalance(assetId='bch') {
    return this.balances.find(balance => balance?.assetId === assetId)
  }

  fetchBalance(assetId='bch') {
    if (assetId === 'bch') return this.fetchBchBalance()
    if (assetId?.startsWith?.('slp/')) {
      return this.fetchSlpTokenBalance(assetId.split('slp/', 2)[1])
    }
    if (assetId?.startsWith?.('ct/')) {
      return this.fetchCashtokenBalance(assetId.split('ct/', 2)[1])
    }
    return Promise.reject(`Unknown assetId: ${assetId}`)
  }

  getOrFetchBalance(opts={ assetId: '', forceFetch: false }) {
    const balance = this.getBalance(opts?.assetId)
    if (!balance || opts?.forceFetch) return this.fetchBalance(opts?.assetId)
    return balance
  }

  /**
   * @param {import("axios").AxiosResponse} response 
   * @param {String} assetId
   */
  $handleBalanceResponse(response, assetId) {
    const result = {
      balance: parseFloat(response?.data?.balance),
      spendable: parseFloat(response?.data?.spendable),
      tokenId: response?.data?.token_id,
      valid: response?.data?.valid,
    }
    if (assetId) {
      const updatedBalance = { assetId: assetId, balance: result.balance, spendable: result.spendable }
      const index = this.balances.findIndex(balance=> balance.assetId === updatedBalance.assetId)
      if (index >= 0) this.balances[index] = updatedBalance
      else this.balances.push(updatedBalance)
    }
    return result
  }

  getBchUtxos(value, opts) {
    const address = this.isChipnet ? this.testnetAddress : this.cashAddress;
    return this.BCH.getBchUtxos(address, value, opts)
  }

  getCashtokensUtxos(token, opts) {
    const tokenAddress = this.isChipnet ? this.testnetTokenAddress : this.tokenAddress;
    return this.BCH.getCashtokensUtxos(tokenAddress, token, opts);
  }

  /**
   * @param {{ address: String, amount: Number, tokenAmount: Number }[]} recipients
   * @param {{ tokenId: String, commitment?: String, capability?: String, txid?: String, vout?: Number }} [token]
   * @returns {import("watchtower-cash-js/dist/bch").SendResponse}
   */
  sendBch(recipients, token, broadcast=true, priceId) {
    let address;
    if (token) {
      address = this.isChipnet ? this.testnetTokenAddress : this.tokenAddress; 
    } else {
      address = this.isChipnet ? this.testnetAddress : this.cashAddress;
    }
    const data = {
      sender: { address, wif: this.wif },
      recipients,
      changeAddress: this.isChipnet ? this.testnetAddress : this.cashAddress,
      token,
      broadcast: broadcast,
    }
    if (priceId) {
      data.priceId = priceId
    }
    return this.watchtower.BCH.send(data);
  }

  /**
   * @param {String} tokenId 
   * @param {Number} tokenType
   * @param {{ walletHash: String, mnemonic: String, derivationPath: String }} feeFunder
   * @param {{ address: String, amount: Number, tokenAmount: Number }[]} recipients
   * @returns {Promise<{ success: Boolean, txid: String, error?: String }>}
   */
  async sendSlp(tokenId, tokenType, feeFunder, recipients, broadcast=true) {
    const bchAddress = this.isChipnet ? this.testnetAddress : this.cashAddress
    const slpAddress = this.isChipnet ? this.testnetSlpAddress : this.slpAddress
    const data = {
      sender: {
        wif: this.wif,
        address: address,
      },
      tokenId: tokenId,
      feeFunder: feeFunder,
      changeAddresses: { bch: bchAddress, slp: slpAddress },
      recipients,
      broadcast: broadcast,
    }
    if (tokenType === 1) {
      result = await this.watchtower.SLP.Type1.send(data)
    } else if (tokenType === 65) {
      // currently can only send to one recipient
      delete data.tokenId
      delete data.recipients
      data = Object.assign(
        {
          childTokenId: tokenId,
          // get the address of the very first recipient
          recipient: recipients[0].address
        },
        data
      )
      result = await this.watchtower.SLP.NFT1.Child.send(data)
    }
    return result
  }
}

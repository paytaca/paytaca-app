
import { Store } from 'src/store'
import { bus } from 'src/wallet/event-bus'
import { backend, getBackendWsUrl } from '../backend'
import { EscrowContract } from './escrow'
import { WebSocketManager } from '../websocket/manager'
import BCHJS from '@psf/bch-js'
const bchjs = new BCHJS()

export class EscrowManager {
  constructor (orderId) {
    this.orderId = orderId
    this.escrow = null
    this.setupContractWebSocket()
  }

  closeContractWebSocket () {
    this.websocket.closeConnection()
  }

  setupContractWebSocket () {
    this.websocket = new WebSocketManager(`${getBackendWsUrl()}order/${this.orderId}/`)
    this.websocket.subscribeToMessages((message) => {
      if (message?.contract_address) {
        this._validateContractAddressMatch(message?.contract_address)
        this._emitMessage({ type: 'message', message: message })
      }
    })
  }

  subscribeToContract (callback) {
    this.callbackMethod = callback
  }

  _emitMessage (message) {
    if (this.callbackMethod) {
      this.callbackMethod(message)
    }
  }

  async buildContract (arbiterId = null, forceGen = false) {
    const network = this._getNetwork()
    const fees = await this.fetchFees()
    if (forceGen) await this._createContract(arbiterId, forceGen)
    const contract = await this._fetchContract(arbiterId, forceGen)
    this._validateAddressNetworks(contract?.addresses)
    this.escrow = new EscrowContract(contract.pubkeys, contract?.addresses, fees, contract?.timestamp, network)
    this._validateContractAddressMatch(contract?.address)
  }

  async fetchContract () {
    return await this._fetchContract()
  }

  /**
   * Fetches the order contract if existing, otherwise calls _createContract to create the contract.
   * @param {Number} arbiterId The id of arbiter to generate with the contract.
   * @param {Boolean} forceGen Indicates if to force regenerate the contract address in the backend.
   * @returns {Object} The generated/existing contract.
   */
  async _fetchContract (arbiterId = null, forceGen = false) {
    let contract = null
    await backend.get(`/ramp-p2p/order/${this.orderId}/contract/`, { authorize: true })
      .then(response => {
        contract = response.data
        console.log('contract:', contract)
      })
      .catch(error => {
        console.error(error.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
          if (error.response.status === 404) {
            // create the contract if not existing
            if (arbiterId) {
              this._createContract(arbiterId, forceGen)
              contract = this._fetchContract(arbiterId, forceGen)
            }
          }
        } else {
          bus.emit('network-error')
        }
      })
    return contract
  }

  /**
   * Sends a request to create a contract for the given order.
   * @param {Number} arbiterId The id of arbiter to generate with the contract.
   * @param {Boolean} forceGen Indicates if to force regenerate the contract address in the backend.
   * @returns {Object} The generated contract.
   */
  async _createContract (arbiterId, forceGen) {
    const body = {
      order_id: this.orderId,
      arbiter_id: arbiterId,
      force: forceGen
    }
    let contract = null
    await backend.post('/ramp-p2p/order/contract/', body, { authorize: true })
      .then(response => {
        console.log('_createContract:', response)
        contract = response.data
      })
      .catch(error => {
        console.error(error.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          bus.emit('network-error')
        }
      })
    return contract
  }

  async fetchFees () {
    return await this._fetchFees()
  }

  async _fetchFees () {
    let fees = null
    await backend.get('/ramp-p2p/order/contract/fees/', { authorize: true })
      .then(response => {
        const data = response.data.breakdown
        fees = {
          arbitrationFee: data.arbitration_fee,
          serviceFee: data.service_fee,
          contractFee: data.hardcoded_fee
        }
      })
      .catch(error => {
        console.error(error.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          bus.emit('network-error')
        }
      })
    return fees
  }

  _validateAddressNetworks (addresses) {
    // validate that addresses and network match
    const globalNetwork = this._getNetwork()
    Object.keys(addresses).forEach(key => {
      let network = bchjs.Address.detectAddressNetwork(addresses[key])
      if (network === 'testnet') network = 'chipnet'
      if (network !== globalNetwork) throw new Error(`addresses must all be ${globalNetwork} address`)
    })
  }

  _validateContractAddressMatch (address) {
    if (!address || !this.escrow) return
    console.log('validating contract:', this.escrow?.contract)
    console.log(`_validateContractAddressMatch | ${address} === ${this.escrow?.contract?.address}`)
    try {
      if (address !== this.escrow.contract?.address) {
        throw new Error(`Contract addresses mismatch: ${this.address} !== ${this.escrow?.contract?.address}`)
      }
    } catch (error) {
      console.error(error)
      this._emitMessage({ type: 'error', code: 'ContractAddressMismatch', error: error, extra: { contract_address: address } })
    }
  }

  _getNetwork () {
    return Store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet'
  }

  getTransactions () {
    return this.escrow?.getUtxos()
  }

  release () {
    this.escrow.release()
  }

  refund () {
    this.escrow.refund()
  }

  async verifyEscrow (transactionId) {
    await backend.post(`/ramp-p2p/order/${this.orderId}/verify-escrow/`, { txid: transactionId }, { authorize: true })
      .then(response => {
        console.log(response.data)
      })
      .catch(error => {
        console.error(error?.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          bus.emit('network-error')
        }
        if (error.response?.data?.error === 'txid is required') {
          throw new Error('Transaction ID is required for verification')
        } else {
          throw new Error(error)
        }
      })
  }

  async verifyRelease (transactionId) {
    const body = { txid: transactionId }
    await backend.post(`/ramp-p2p/order/${this.orderId}/verify-release/`, body, { authorize: true })
      .then(response => {
        console.log(response.data)
      })
      .catch(error => {
        console.error(error?.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
        } else {
          bus.emit('network-error')
        }
        throw new Error(error)
      })
  }

  async verifyRefund () {

  }

  async fetchTransactionId (action, orderId) {
    if (!orderId) orderId = this.orderId
    let transactionId = Store.getters['ramp/getOrderTxid'](orderId, action)
    if (!transactionId) {
      const utxos = await this.escrow?.getUtxos()
      if (utxos.length > 0) {
        transactionId = utxos[0]?.txid
      }
    }
    console.log('_____xasdftxis:', transactionId)
    return transactionId
  }

  async fetchContractBalance (action) {
    return await this.exponentialBackoff(this._fetchContractBalance, action, 5, 1000)
  }

  async _fetchContractBalance (escrow) {
    let balance = 0
    if (!escrow) return balance
    await escrow?.getBalance().then(bal => { balance = bal }).catch(error => { console.error(error) })
    return balance
  }

  async exponentialBackoff (fn, action, retries, delayDuration) {
    const balance = await fn(this.escrow).catch(error => console.error(error))
    if (this.retryBalance(action, balance)) {
      if (retries > 0) {
        console.log(`Attempt failed. Retrying in ${delayDuration / 1000} seconds...`)
        await this.delay(delayDuration)
        return this.exponentialBackoff(fn, retries - 1, delayDuration * 2)
      }
    }
    return balance
  }

  delay (duration) {
    return new Promise(resolve => setTimeout(resolve, duration))
  }

  retryBalance (action, balance) {
    let retry = false
    switch (action) {
      case 'RELEASE':
        if (balance > 0) retry = true
        break
      case 'ESCROW':
        if (balance <= 0) retry = true
        break
    }
    return retry
  }
}


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
    this.setupContractWebSocket()
  }

  setupContractWebSocket () {
    const websocket = new WebSocketManager(`${getBackendWsUrl()}order/${this.orderId}/`)
    websocket.subscribeToMessages((message) => {
      if (message?.contract_address) {
        try {
          this._validateContractAddressMatch(message?.contract_address)
        } catch (error) {
          console.error(error)
          this._emitMessage({ type: 'error', code: 'ContractAddressMismatch', error: error })
        }
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

  async buildContract (arbiterId, forceGen) {
    const network = this._getNetwork()
    const fees = await this.fetchFees()
    const contract = await this._fetchContract(arbiterId, forceGen)

    this._validateAddressesNetwork(contract.addresses)
    this.escrow = new EscrowContract(contract.pubkeys, contract.addresses, fees, contract.timestamp, network)
  }

  /**
   * Fetches the order contract if existing, otherwise calls _createContract to create the contract.
   * @param {Number} arbiterId The id of arbiter to generate with the contract.
   * @param {Boolean} forceGen Indicates if to force regenerate the contract address in the backend.
   * @returns {Object} The generated/existing contract.
   */
  async _fetchContract (arbiterId, forceGen) {
    const params = {
      arbiter_id: arbiterId,
      force: forceGen
    }
    let contract = null
    await backend.get(`/ramp-p2p/order/${this.orderId}/contract/`, { params: params, authorize: true })
      .then(response => {
        console.log('_fetchContract:', response)
        contract = response.data
        this._validateContractAddressMatch(contract.address)
      })
      .catch(error => {
        console.error(error.response || error)
        if (error.response) {
          if (error.response.status === 403) {
            bus.emit('session-expired')
          }
          if (error.response.status === 404) {
            // create the contract if not existing
            this._createContract(arbiterId, forceGen)
            contract = this._fetchContract(arbiterId, forceGen)
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
    console.log('body:', body)
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

  _validateAddressesNetwork (addresses) {
    // validate that addresses and network match
    const globalNetwork = this._getNetwork()
    Object.keys(addresses).forEach(key => {
      let network = bchjs.Address.detectAddressNetwork(addresses[key])
      if (network === 'testnet') network = 'chipnet'
      if (network !== globalNetwork) throw new Error(`addresses must all be ${globalNetwork} address`)
    })
  }

  _validateContractAddressMatch (address) {
    console.log(`_validateContractAddressMatch | ${address} === ${this.escrow.contract.address}`)
    if (address === this.escrow.contract.address) {
      throw new Error(`Contract addresses mismatch: ${this.address} !== ${this.escrow.contract.address}`)
    }
  }

  _getNetwork () {
    return Store.getters['global/isChipnet'] ? 'chipnet' : 'mainnet'
  }

  release () {
    this.contract.release()
  }

  refund () {
    this.contract.refund()
  }

  verifyTransaction () {}
}

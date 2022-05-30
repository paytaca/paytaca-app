import WalletConnect from "@walletconnect/client";
import { ethers } from "ethers";

// TODO: refactor
export function getPreviousConnector() {
  const wcInfoString = localStorage.getItem('walletconnect')
  console.log('got prev info:', wcInfoString)
  if (!wcInfoString) return
  const wcInfo = JSON.parse(wcInfoString) 
  console.log(wcInfo)
  
  return new WalletConnect(wcInfo)
}

export function createConnector (uri) {
  // Create connector
  const connector = new WalletConnect(
    {
      // Required
      uri: uri,
      // Required
      clientMeta: {
        description: "Paytaca App",
        url: "https://paytaca.com",
        icons: ["https://walletconnect.org/walletconnect-logo.png"],
        name: "Paytaca",
      },
    },
    // {
    //   // Optional
    //   url: "<YOUR_PUSH_SERVER_URL>",
    //   type: "fcm",
    //   token: token,
    //   peerMeta: true,
    //   language: language,
    // }
  )

  /*
    Sample connector event:
    connector.on(event_name, (error, payload) => {
      console.log('session_request')
      console.log(error, payload)
      if (error) {
        throw error;
      }
    })
  */

  /*
    Event names: connect, disconnect, session_request, session_update, call_request, wc_sessionRequest, wc_sessionUpdate

    Payloads:
    ---------------------------------------------------------------------------

    session_request
    {
      id: 1,
      jsonrpc: '2.0'.
      method: 'session_request',
      params: [{
        peerId: '15d8b6a3-15bd-493e-9358-111e3a4e6ee4',
        peerMeta: {
          name: "WalletConnect Example",
          description: "Try out WalletConnect v1.0",
          icons: ["https://example.walletconnect.org/favicon.ico"],
          url: "https://example.walletconnect.org"
        }
      }]
    }

    ---------------------------------------------------------------------------

    call_request
    {
      id: 1,
      jsonrpc: '2.0'.
      method: 'eth_sign',
      params: [
        "0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3",
        "My email is john@doe.com - 1537836206101"
      ]
    }

  */

  return connector
}


/**
  * @param {object}         payload a JSON-RPC request 
  * @param {ethers.Wallet}  wallet  a Wallet instance
*/
export async function callRequestHandler(connector, payload, wallet) {
  let result = null
  let error = null
  try {
    switch(payload.method) {
      case('personal_sign'):
      case('eth_sign'):
        const signedMessage = await wallet.signMessage(payload.params[0])
        result = signedMessage
        break
      case('eth_signTypedData'):
        const parsedSignTypedDataParams = JSON.parse(payload.params[1])
        if (parsedSignTypedDataParams.types.EIP712Domain) delete parsedSignTypedDataParams.types.EIP712Domain
        const signedTypedData = await wallet._signTypedData(
          parsedSignTypedDataParams.domain,
          parsedSignTypedDataParams.types,
          parsedSignTypedDataParams.message,
        )
        result = signedTypedData
        break;
      case('eth_sendTransaction'):
        const tx = await wallet.sendTransaction(serializeTransactionRequest(payload.params[0]))
        result = tx.hash
        break;
      case ('eth_signTransaction'):
        const signedTx = await wallet.signTransaction(serializeTransactionRequest(payload.params[0]))
        result = signedTx
        break;
      default:
        error = { message: 'Unknown method' }
    }
  } catch (err) {
    error = err
  }

  const response = {
    success: false,
    requestPayload: payload,
  }

  console.log(payload, result, error)
  if (result !== null) {
    response.success = true
    response.result = result
    connector.approveRequest({ id: payload.id, jsonrpc: payload.jsonrpc, result: result })
  } else {
    response.success = false
    response.error = error
    connector.rejectRequest({ id: payload.id, jsonrpc: payload.jsonrpc, error: error })
  }

  return response
}


function serializeTransactionRequest(payload) {
  if (!payload) return payload
  const data = {
    from: payload.from,
    to: payload.to,
    value: payload.value,
    data: payload.data,
    gasLimit: payload.gas,
    gasPrice: payload.gasPrice,
    nonce: payload.nonce,
  }

  return data
}


export function isValidWalletConnectUri(uri) {
  if (!uri) return false

  return /wc:[0-9a-f-]*@\d*\?(bridge=.*|key=[0-9a-f]*)/i.test(uri)
}

export function parseWalletConnectUri(uri) {
  if (!uri) return

  const data = {
    uri: uri,
    handshakeTopic: '',
    version: '',
    bridge: '',
    key: '',
  }

  const match = String(uri).match(/^wc:([0-9a-f-]{36})@(\d*)(\?(bridge=.*)|(key=[0-9a-f]*))?$/i)
  if (!match) return

  const url = new URL(uri)
  data.handshakeTopic = match[1]
  data.version = match[2]
  data.bridge = url.searchParams.get('bridge')
  data.key = url.searchParams.get('key')

  return data
  
}


export class WalletConnectManager {

  constructor(app) {
    this.app = app
    this._listeners = {}
    this._subscribedListeners = []

    this.connector = getPreviousConnector()
  }

  get connector () {
    return this._connector
  }

  /**
   * @param {WalletConnect} value
  */
  set connector (value) {
    // remove previous connector's event emmiters before updating
    if (this._connector) this._disconnectConnectorEvents()
    this._connector = value
    if (this._connector) this._attachEventsToConnector()
  }

  _attachEventsToConnector() {
    if (!this.connector) return
    this._attachEventToConnector('session_request')
    this._attachEventToConnector('call_request')
    this._attachEventToConnector('disconnect')
  }

  _attachEventToConnector(eventName) {
    if (!this.connector) return
    const _eventName = String(eventName)
    if (this._isSubscribedTo(_eventName)) return

    const callback = (error, payload) => {
      this._connectorEventHandler(_eventName, error, payload)
    }
    this.connector.on(_eventName, callback)
    this._listeners[_eventName] = callback
  }

  _isSubscribedTo(eventName='') {
    if (!this.connector) return false

    const listener = this._listeners[eventName]
    if (!listener) return false

    if(!Array.isArray(this.connector?._eventManager?._eventEmmiters)) return false
    return this.connector._eventManager._eventEmmiters.some(eventEmmiter => eventEmmiter?.callback === listener)
  }

  _connectorEventHandler(eventName, error, payload) {
    console.log('walletconnect event:', eventName, error, payload)
    if (eventName === 'call_request' && payload) {
      this.app.store.commit('walletconnect/addCallRequest', {
        timestamp: Date.now(),
        payload: payload,
      })
    } else if (eventName === 'disconnect' && !error) {
      this.app.store.commit('walletconnect/clearCallRequests')
      this.connector = null
    }

    this._subscribedListeners.forEach(listener => {
      if (listener?.event !== eventName) return
      if (listener?.callback?.call) listener.callback(error, payload)
    })
  }

  _disconnectConnectorEvents() {
    if (!this.connector) return
    ['session_request', 'call_request', 'disconnect'].forEach(eventName => {
      if (this._isSubscribedTo(eventName)) {
        this.connector._eventManager._eventEmmiters = this.connector._eventManager._eventEmmiters
          .filter(eventEmmiter => eventEmmiter.event !== eventName && eventEmmiter.callback !== this._listeners[eventName])

        delete this._listeners[eventName]
      }
    })
  }

  disconnectConnector() {
    if (!this.connector) return
    this.connector.killSession()
    this.connector = null
  }

  /**
   * Add a listener to an event
   * @param {String} eventName 
   * @param {Function} callback 
   */
  addEventListener(eventName, callback) {
    const _eventName = String(eventName)
    const exists = this._subscribedListeners.some(listener => listener.event === _eventName && listener.callback === callback)
    if (!exists) this._subscribedListeners.push({
      event: _eventName,
      callback: callback,
    })
  }

  /**
   * Removes a listener to an event. If callback is not specified, all listeners are removed
   * @param {String} eventName 
   * @param {Function} callback 
   */
  removeEventListener(eventName, callback) {
    const _eventName = String(eventName)
    if (callback === undefined) {
      this._subscribedListeners = this._subscribedListeners.filter(listener => listener.event !== _eventName)
    } else {
      const listener = this._subscribedListeners.find(
        listener => listener.event === _eventName && listener.callback === callback
      )
      this._subscribedListeners = this._subscribedListeners.filter(_listener => _listener !== listener)
    }
  }
}

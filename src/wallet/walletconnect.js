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
        const signedTypedData = await wallet._signTypedData(
          payload.params[1].domain,
          payload.params[1].types,
          payload.params[1].message,
        )
        result = signedTypedData
        break;
      case('eth_sendTransaction'):
        const tx = await wallet.sendTransaction(payload.params[0])
        result = tx.hash
        break;
      case ('eth_signTransaction'):
        const signedTx = await wallet.signTransaction(payload.params[0])
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

import axios from 'axios'
import WatchtowerSdk from 'watchtower-cash-js'
import { secp256k1, decodePrivateKeyWif, binToHex, instantiateSha256 } from '@bitauth/libauth'
import { privateKeyToCashAddress } from 'src/wallet/walletconnect2/tx-sign-utils'
import { toP2pkhTestAddress } from '../../utils/address-utils'

// type AddressPeerApp = {
//   app_url/*:string*/,
//   app_name/*:string*/,
//   wallet_address/*:string*/,
//   wallet_hash/*:string*/
// }

class Watchtower extends WatchtowerSdk {
  isChipnet = false
  constructor (isChipnet = false) {
    super(isChipnet)
    this.isChipnet = isChipnet
  }

  /**
   * Returns list of external addresses
   */
  async getWalletExternalAddresses (walletHash /*: string */) /*: Promise<string[]> */ {
    let addresses = []
    const response = await fetch(`${this._baseUrl}wallet-addresses/${walletHash}/?change_index=0`)
    if (response.ok) {
      addresses = await response.json()
    }
    return addresses
  }

  /**
   * Fetch wallet's last address index
   */
  async getLastExternalAddressIndex (walletHash/*: string */) /*: Promise<{ address:string; address_index: number } | null> */ {
    const response = await fetch(`${this._baseUrl}last-address-index/wallet/${walletHash}/?exclude_pos=true`)
    let addressAndIndex = null
    if (response.ok) {
      const responseJson = await response.json()
      addressAndIndex = responseJson.address
    }
    return addressAndIndex
  }

  /**
   * Returns a nonce value from. Currently this nonce value
   * is only invalidated after 3 minutes as configured in the watchtower server.
   */
  async getNonce () {
    let getNonceResponse = await fetch(`${this._baseUrl}nonce/`)
    let nonce = ''
    if (getNonceResponse.ok) {
      getNonceResponse = await getNonceResponse.json()
      nonce = getNonceResponse.data?.nonce
    }
    return nonce
  }

  /**
   * Associates an address with a DAPP.
   *
   * @param { object } options
   * @param { string } options.address Use for authentication. Assumed as the address connected to DAPP.
   * @param { Uint8Array } options.privateKey The private key that owns options.address.
   * @param { string } options.appName Name of the DAPP
   * @param { string } options.appUrl Url of the DAPP. E.g. origin of the wallet connect transaction.
   * @param { string } [options.appIcon] Icon of the DAPP
   * @param { string } [options.addressToConnect] Will use as address connected to DAPP if present.
   * @returns { Promise<boolean> } true on success
   */
  async saveConnectedApp ({
    address,
    appName,
    appUrl,
    appIcon,
    privateKey,
    addressToConnect
  }) {
    if (!appName || !appUrl) return false

    const nonce = await this.getNonce()
    if (nonce) {
      const message = `${nonce}|${address}|${appName}|${appUrl}|${addressToConnect}`
      const publicKeyCompressed = secp256k1.derivePublicKeyCompressed(privateKey) /* as Uint8Array */
      let pkToCashAddress = privateKeyToCashAddress(privateKey)
      if (this.isChipnet) {
        pkToCashAddress = toP2pkhTestAddress(pkToCashAddress)
      }
      if (address !== pkToCashAddress) {
        throw new Error('Address isn\'t owned by the privateKey!')
      }

      const sha256 = (await instantiateSha256()).hash
      const hashedMessage = sha256(new TextEncoder().encode(message))
      const derSignature = secp256k1.signMessageHashDER(privateKey, hashedMessage) /* as Uint8Array */
      const derSignatureHex = binToHex(derSignature)
      const postData = {
        public_key: binToHex(publicKeyCompressed),
        signature: derSignatureHex,
        message: message,
        extra: {
          app_icon: appIcon
        }
      }
      const postResponse = await fetch(`${this._baseUrl}wallet-address-app/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })
      return postResponse.ok
    }
    return false
  }

  async getWalletConnectedApps (walletHash) {
    let addressPeerAppList = []
    const response = await fetch(`${this._baseUrl}wallet-address-app/?wallet_hash=${walletHash}`)
    if (response.ok) {
      const responseJson = await response.json()
      addressPeerAppList = responseJson.results
    }
    return addressPeerAppList
  }

  async getWalletConnectedAppsOfUrl (walletHash, appUrl) {
    let addressPeerAppList = []
    if (!appUrl) return addressPeerAppList
    const response = await fetch(`${this._baseUrl}wallet-address-app/?wallet_hash=${walletHash}&app_url=${appUrl}`)
    if (response.ok) {
      const responseJson = await response.json()
      addressPeerAppList = responseJson.results
    }
    return addressPeerAppList
  }

  async getLastUsedAddressAtDappUrl (walletHash, appUrl) {
    let addressPeerAppList = []
    if (!appUrl) return addressPeerAppList
    const response = await fetch(`${this._baseUrl}wallet-address-app/?wallet_hash=${walletHash}&app_url=${appUrl}&limit=1`)
    if (response.ok) {
      const responseJson = await response.json()
      addressPeerAppList = responseJson.results
    }
    return addressPeerAppList
  }

  async getAddressBchBalance (address) {
    const response = await fetch(`${this._baseUrl}balance/bch/${address}`)
    if (response.ok) {
      return await response.json()
    }
  }

  async broadcastTx (tx) {
    const r = await fetch(`${this._baseUrl}broadcast/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction: tx
      })
    })
    if (r.status >= 400) {
      this.error =
        'Problem occured while contacting server. Please try again later.'
      throw this.error
    }
    return await r.json()
  }

  set isChipnet (yes) {
    if (yes) {
      this._baseUrl = 'https://chipnet.watchtower.cash/api/'
    } else {
      this._baseUrl = 'https://watchtower.cash/api/'
    }
  }

  async uploadMultisigWallet(multisigWallet) {
    return await fetch(`${this._baseUrl}multisig/wallets`, {
      method: 'POST',
      body: JSON.stringify(multisigWallet)
    })
  }
  
  async getAddressBchBalance(address) {
    return await axios.get(`${this._baseUrl}balance/bch/${address}/`)
  }
  
  async getAddressTokenBalance(tokenAddress, category = '') {
    if (category) {	
     return await axios.get(`${this._baseUrl}balance/ct/${tokenAddress}/${category}/`)
    }
    return await axios.get(`${this._baseUrl}balance/ct/${tokenAddress}/`)
  }
  
  async subscribeAddress (address) {
    return await axios.post(`${this._baseUrl}subscription/`, { address })
  }

  async getMultisigWalletUtxos(address) {
    return await axios.get(`${this._baseUrl}multisig/wallets/utxos/${address}`)
  }
}

export default Watchtower

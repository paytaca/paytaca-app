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
    
    // Override Wallet.getHistory to automatically enrich responses with capability and commitment for NFTs
    // Use setTimeout to ensure Wallet is initialized from parent class
    setTimeout(() => {
      if (this.Wallet && this.Wallet.getHistory) {
        const originalGetHistory = this.Wallet.getHistory.bind(this.Wallet)
        this.Wallet.getHistory = async (params) => {
          const response = await originalGetHistory(params)
          return this.enrichHistoryResponse(response)
        }
      }
    }, 0)
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

  async broadcastTx (tx, priceId, outputFiatAmounts) {
    const body = { transaction: tx }
    if (priceId) {
      body.price_id = priceId
    }
    if (outputFiatAmounts) {
      body.output_fiat_amounts = outputFiatAmounts
    }
    const r = await fetch(`${this._baseUrl}broadcast/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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

  /**
   * Enriches Wallet History API response to include capability and commitment
   * in token field when is_nft is true
   * @param {Object} response - The API response from Wallet.getHistory
   * @returns {Object} - Enriched response with capability and commitment added to token field
   */
  enrichHistoryResponse(response) {
    if (!response || !response.history) return response

    const enrichedHistory = response.history.map(tx => {
      // Check if transaction has is_nft flag
      const isNft = tx.is_nft === true || tx.is_nft === 'true' || 
                    tx.asset?.is_nft === true || tx.asset?.is_nft === 'true' ||
                    (Array.isArray(tx.attributes) && tx.attributes.some(attr => 
                      attr.key === 'is_nft' && (attr.value === true || attr.value === 'true')
                    ))

      if (isNft && tx.token) {
        // Extract capability and commitment from attributes or other sources
        let capability = null
        let commitment = null

        // Try to get from attributes
        if (Array.isArray(tx.attributes)) {
          const capabilityAttr = tx.attributes.find(attr => attr.key === 'capability')
          const commitmentAttr = tx.attributes.find(attr => attr.key === 'commitment')
          
          if (capabilityAttr) capability = capabilityAttr.value
          if (commitmentAttr) commitment = commitmentAttr.value
        }

        // Try to get from transaction outputs (if available)
        if (!capability && tx.outputs && Array.isArray(tx.outputs)) {
          for (const output of tx.outputs) {
            if (output.token?.nft?.capability) {
              capability = output.token.nft.capability
            }
            if (output.token?.nft?.commitment) {
              commitment = typeof output.token.nft.commitment === 'string' 
                ? output.token.nft.commitment 
                : binToHex(output.token.nft.commitment)
            }
            if (capability && commitment) break
          }
        }

        // Try to get from inputs (if available)
        if (!capability && tx.inputs && Array.isArray(tx.inputs)) {
          for (const input of tx.inputs) {
            if (input.token?.nft?.capability) {
              capability = input.token.nft.capability
            }
            if (input.token?.nft?.commitment) {
              commitment = typeof input.token.nft.commitment === 'string'
                ? input.token.nft.commitment
                : binToHex(input.token.nft.commitment)
            }
            if (capability && commitment) break
          }
        }

        // Enrich token field with capability and commitment
        return {
          ...tx,
          token: {
            ...tx.token,
            ...(capability && { capability }),
            ...(commitment && { commitment })
          }
        }
      }

      return tx
    })

    return {
      ...response,
      history: enrichedHistory
    }
  }
}

export default Watchtower

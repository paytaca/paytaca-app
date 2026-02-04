import axios from 'axios'
import { CashAddressNetworkPrefix, decodeCashAddress } from "bitauth-libauth-v3";
import { MultisigWallet } from './wallet.js';
import { ElectrumNetworkProvider } from 'cashscript';

/**
 * @typedef {'mainnet' | 'testnet3' | 'testnet4' | 'chipnet' | 'mocknet' | 'regtest'} Network
 */

/**
 * @typedef {Object} NetworkProvider
 * @property {GetAddressUtxos}
 * @property {GetAddressBalance}
 * @property {GetWalletUtxos}
 * @property {GetWalletBalance}
 * @property {GetWalletHashUtxos}
 * @property {GetWalletHashBalance}
 * @property {string} hostname
 * 
 */

/**
 * @typedef {Object} NetworkProviderOptions
 * @property {string}
 * @property {GetAddressBalance}
 * @property {GetWalletUtxos}
 * @property {GetWalletBalance}
 * @property {GetWalletHashUtxos}
 * @property {GetWalletHashBalance}
 * @property {Network} network
 * @property {string} hostname
 */

/**
 * @typedef {Object} WatchtowerMultisigCoordinationServerAuthCredentials
 * @property {string} "X-Auth-PubKey" - Hex-encoded public key used to sign the authentication message.
 * @property {string} "X-Auth-Signature" - Combined signature string in the format:
 *   "schnorr=<hex>;der=<hex>".
 * @property {string} "X-Auth-Message" - The raw message that was signed, typically provided by the server.
 */


/**
 * @type {{ [key in Network]: Network }}
 */
export const Network = {
  MAINNET: 'mainnet',
  TESTNET3: 'testnet3',
  TESTNET4: 'testnet4',
  CHIPNET: 'chipnet',
  MOCKNET: 'mocknet',
  REGTEST: 'regtest',
};

/**
 * @typedef {'mainnet' | 'chipnet'} WatchtowerNetworkType
 */

/**
 * @type {{ mainnet: WatchtowerNetworkType, chipnet: WatchtowerNetworkType }}
 */
export const WatchtowerNetwork = {
    mainnet: 'mainnet',
    chipnet: 'chipnet',
    local: 'local'
}
/**
 * @implements { NetworkProvider }
 */
export class WatchtowerNetworkProvider {

    /**
     * @param {Object} config
     * @param {WatchtowerNetworkType} config.network
     */
    constructor(config) {
        this.hostname = 'https://watchtower.cash'
        this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet
        this.network = config?.network || WatchtowerNetwork.mainnet
        if (this.network === WatchtowerNetwork.chipnet) {
            this.hostname = 'https://chipnet.watchtower.cash'
            
            this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.testnet
        }
    }

    // {
    //     txid: 'b9784ef85ef3f57039de7b56db40b70de96ddaa87a143be875e405a093163793',
    //     vout: 0,
    //     satoshis: 7200,
    //     height: 909242,
    //     coinbase: false,
    //     token: null,
    //     addressPath: '1/1',
    //     address: 'bitcoincash:pq7tl7yy4uy4nsvpmvgnmz2v5yhpmv5qg5degh2usg'
    // }
    // {
    //     "txid": "54f8d06f9f3120ceadc3f2ef88dda47604b830d0b62ecc724866941e288fac1c",
    //     "vout": 0,
    //     "satoshis": 1000,
    //     "height": 0,
    //     "coinbase": false,
    //     "token": {
    //      "amount": "30",
    //      "category": "ea9e1baca02a8f3cc266348d39bacc141bf885d76c0eacb0687c7ecd81ab86b5"
    //     }
    // }
    async getAddressUtxos(address, addressPath) {
        const response =  await axios.get(`${this.hostname}/api/multisig/wallets/utxos/${address}`) 
        response?.data?.forEach(utxo => {
            utxo.addressPath = addressPath
            utxo.address = address
            return utxo
        })
        return response?.data || []
    }

    async getWalletHashUtxos(walletHash, utxoType = 'bch') {
        return await axios.get(`${this.hostname}/api/utxo/wallet/${walletHash}?is_cashtoken=${utxoType === 'cashtoken' ? 'true': 'false'}`) 
    }

    async getWalletUtxos(address) {
        throw new Error('Not yet implemented')
    }

    async getAddressBalance(address) {
        const decodedCashAddress = decodeCashAddress(address)
        return []
    }

    async getWalletHashBalance(multisigWalletHash) {
        throw new Error('Not yet implemented')
    }

    async getWalletBalance(multisigWallet) {
        throw new Error('Not yet implemented')
    }

    /**
     * @returns {Promise<{ success: boolean, txid: string }>}
     */
    async broadcastTransaction(rawTxHex) { 
        return  await axios.post(`${this.hostname}/api/broadcast/`, { transaction: rawTxHex })
    }

    async getRawTransaction(txid) {
        const provider = new ElectrumNetworkProvider(this.network)
        return await provider.getRawTransaction(txid)
    }

    async getWalletTransactionHistory ({ walletHash, type = 'all', all='false',  tokenCategory='', page = 1 }) {
        
        let url = `${this.hostname}/api/history/wallet/${walletHash}`
        
        if (tokenCategory) {
          url += `/${tokenCategory}`
        }
      
        url += `?type=${type}&all=${all}&page=${page}`
        
        return await axios.get(url)
      }
      
      
}


// /**
//  * @implements { NetworkProvider }
//  */
// export class ElectrumNetworkProvider {

    // /**
    //  * @param {Object} config
    //  * @param {import('./wallet').Network} config.network
    //  * @param {Network}
    //  */
    // constructor(config) {
    //     this.hostname = 'https://bch.imaginary.cash'
    //     this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet
    //     this.network = config?.network || Network.MAINNET
    //     if (this.network === Network.chipnet) {
    //         this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.chipnet
    //     }
    // }
// }


export class WatchtowerCoordinationServer {

    /**
     * @param {Object} config
     * @param {WatchtowerNetworkType} config.network
     */
    constructor(config) {
        this.network = config.network || WatchtowerNetwork.mainnet
        switch (this.network) {
            case WatchtowerNetwork.chipnet:
                this.hostname = 'https://chipnet.watchtower.cash'
                // this.hostname = 'http://localhost:8000'
                break
            case WatchtowerNetwork.mainnet:
                this.hostname = 'https://watchtower.cash'    
                // this.hostname = 'http://localhost:8000'
                break
            case WatchtowerNetwork.local:
                this.hostname = 'http://localhost:8000'
                break
        }
    }

    /**
     * @param {import('./wallet').MultisigWallet} wallet
     * @return {Promise<import('./wallet').MultisigWallet>}
     */
    async createWallet(wallet) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/`,
            wallet, 
            { headers: await wallet.generateAuthCredentials() }
        )
        return response.data   
    }

    /**
     * @param {import('./wallet').MultisigWallet} wallet
     * @return {Promise<import('./wallet').MultisigWallet>} 
     */
    async syncWallet(wallet) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${wallet.walletHash}/sync/`,
            wallet, 
            { headers: await wallet.generateAuthCredentials() }
        )
        return response.data   
    }

    async updateWalletLastIssuedDepositAddressIndex(wallet, lastIssuedDepositAddressIndex, network) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${wallet.walletHash}/last-issued-deposit-address-index`,
            { network: network || this.network, lastIssuedDepositAddressIndex }, 
            { headers: await wallet.generateAuthCredentials() }
        )
        return response.data
    }

    async updateWalletLastUsedDepositAddressIndex(wallet, lastUsedDepositAddressIndex, network) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${wallet.walletHash}/last-used-deposit-address-index`,
            { network: network || this.network, lastUsedDepositAddressIndex }, 
            { headers: await wallet.generateAuthCredentials() }
        )
        return response.data
    }

    async updateWalletLastUsedChangeAddressIndex(wallet, lastUsedChangeAddressIndex, network) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${wallet.walletHash}/last-used-change-address-index`,
            { network: network || this.network, lastUsedChangeAddressIndex }, 
            { headers: await wallet.generateAuthCredentials() }
        )
        return response.data
    }

    async fetchWallets({ xpub, xprv }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/wallets/?xpub=${xpub}`,
            { headers: MultisigWallet.generateAuthCredentials({ xprv, xpub }) }
        )
        return response.data
    }
    
    async uploadPst(pst) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/psts/`,
            pst, 
            { headers: await pst.wallet.generateAuthCredentials() }
        )
        return response.data
    }
}
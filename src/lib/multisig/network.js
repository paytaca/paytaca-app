import axios from 'axios'
import { CashAddressNetworkPrefix, decodeCashAddress } from "bitauth-libauth-v3";
import { MultisigWallet } from './wallet';

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

    async getWalletHashUtxos(address) {
        throw new Error('Not yet implemented')
    }

    async getWalletUtxos(address) {
        throw new Error('Not yet implemented')
    }

    async getAddressBalance(address) {
        const decodedCashAddress = decodeCashAddress(address)
        console.log('decoded cash address', decodedCashAddress) 
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
}


/**
 * @implements { NetworkProvider }
 */
export class ElectrumNetworkProvider {

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
}


export class WatchtowerCoordinationServer {

    /**
     * @param {Object} config
     * @param {WatchtowerNetworkType} config.network
     */
    constructor(config) {
        switch (config?.network) {
            case WatchtowerNetwork.chipnet:
                this.hostname = 'https://chipnet.watchtower.cash'
                break
            case WatchtowerNetwork.mainnet:
                this.hostname = 'https://watchtower.cash'
                break
            case WatchtowerNetwork.local:
                this.hostname = 'http://localhost:8000'
                break
            default:
                throw new Error('Invalid network for WatchtowerCoordinationServer')
        }
    }

    /**
     * @param {import('./wallet').MultisigWallet} wallet
     * @return {Promise<import('./wallet').MultisigWallet>}
     */
    async createWallet(wallet) {
        console.log('THIS', wallet)
        const authCredentials = await wallet.generateAuthCredentials()
        console.log('Auth credentials', authCredentials)
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/`,
            wallet, 
            { headers: await wallet.generateAuthCredentials() }
        )
        return response.data   
    }

    async fetchWallets({ xpub, xprv }) {
        console.log('credentials'), MultisigWallet.generateAuthCredentials({ xprv, xpub })
        const response = await axios.get(
            `${this.hostname}/api/multisig/wallets/?xpub=${xpub}`,
            { headers: MultisigWallet.generateAuthCredentials({ xprv, xpub }) }
        )

        return response.data
    }
}
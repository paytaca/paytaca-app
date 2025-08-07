import axios from 'axios'
import { CashAddressNetworkPrefix, decodeCashAddress } from "@bitauth/libauth";

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
 * @implements { NetworkProvider }
 */
export class WatchtowerNetworkProvider {

    /**
     * @param {Object} config
     * @param {import('./wallet').Network} config.network
     */
    constructor(config) {
        this.hostname = 'https://watchtower.cash'
        this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet
        this.network = config?.network || Network.MAINNET
        if (this.network === Network.chipnet) {
            this.hostname = 'https://chipnet.watchtower.cash'
            this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.chipnet
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
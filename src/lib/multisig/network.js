import axios from 'axios'
import { CashAddressNetworkPrefix, decodeCashAddress } from "bitauth-libauth-v3";
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
        // this.hostname = 'http://localhost:8000'
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

    async getWalletHashUtxos(walletHash, utxoType = 'bch', tokenFilter = 'ft') {
        let url = `${this.hostname}/api/utxo/wallet/${walletHash}?is_cashtoken=${utxoType === 'cashtoken' ? 'true': 'false'}`
        if (utxoType === 'cashtoken' && tokenFilter === 'ft') {
            url += `&is_cashtoken_nft=false`
        }
        if (utxoType === 'cashtoken' && tokenFilter === 'nft') {
            url += `&is_cashtoken_nft=true`
        }
        return await axios.get(url) 

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
      

    async subscribeWalletAddressIndex ({ walletHash, addresses, addressIndex, type = 'pair' }) {
      
        if (type === 'deposit') {
            delete addresses.change 
        }
        
        if (type === 'change') {
            delete addresses.receiving
        }
        
        const projectId = {
            mainnet: process.env.WATCHTOWER_PROJECT_ID,
            chipnet: process.env.WATCHTOWER_CHIP_PROJECT_ID
        }

        return await axios.post(`${this.hostname}/api/subscription/`, {
            project_id: projectId[this.network],
            addresses,
            address_index: addressIndex,
            wallet_hash: walletHash
        }) 
    }
      
}

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
                break
            case WatchtowerNetwork.mainnet:
                this.hostname = 'https://watchtower.cash'    
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
    async uploadWallet({ wallet, authCredentialsGenerator }) {
        if (!authCredentialsGenerator) return null
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/`,
            wallet, 
            { headers: await authCredentialsGenerator.generateAuthCredentials() }
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

    // --

    async createServerIdentity({ serverIdentity, authCredentialsGenerator }) {
        const authCredentials = await authCredentialsGenerator.generateAuthCredentials()
        
        if (!authCredentials) return null
        const response = await axios.post(
            `${this.hostname}/api/multisig/coordinator/server-identities/`,
            serverIdentity,
            { headers: { ...authCredentials } }
        )
        return response.data
    }

    async getServerIdentity({ publicKey, authCredentialsGenerator }) {
        const authCredentials = await authCredentialsGenerator.generateAuthCredentials()
        const response = await axios.get(
            `${this.hostname}/api/multisig/coordinator/server-identities/${publicKey}/`,
            { headers: { ...authCredentials } }
        )
        return response.data
    }

    async getWallet({ identifier }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/wallets/${identifier}/`
        )
        return response.data
    }

    async getSignerWallets({ publicKey }) {        
        const response = await axios.get(
            `${this.hostname}/api/multisig/signers/${publicKey}/wallets/`
        )
        return response.data
    }


    async getSignerWalletsByMasterFingerprint({ masterFingerprint }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/signers/${masterFingerprint}/wallets/`
        )
        return response.data
    }

    /**
     * @typedef {Object} Proposal
     * @property {string} [wallet] - The wallet id associated with the proposal.
     * @property {string} [proposal] - The serialized/encoded proposal.
     * @property {string} [proposalFormat] - Example: 'psbt' | 'libauth-template' only 'psbt' is supported now.
     * @param {Object} params
     * @param {Proposal} params.proposal - The proposal to upload.
     * @param {*} params.authCredentialsGenerator
     */
    async uploadProposal({ payload, authCosignerAuthCredentials, authCredentials }) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/proposals/?wallet_id=${payload.wallet}`,
            payload, 
            { headers: { ...authCredentials, ...authCosignerAuthCredentials } }
        )
        return response.data
    }

    /**
     * @typedef {Object} Proposal
     * @property {string} [wallet] - The wallet id associated with the proposal.
     * @property {string} [proposal] - The serialized/encoded proposal.
     * @property {string} [proposalFormat] - Example: 'psbt' | 'libauth-template' only 'psbt' is supported now.
     * @param {Object} params
     * @param {Proposal} params.proposal - The proposal to upload.
     * @param {*} [params.authCosignerCredentials] - Cosigner auth credentials 
     * @param {*} [params.authCredentialsGenerator] - 
     */
    async deleteProposal({ id, walletId, authCosignerCredentials, authCredentialsGenerator }) {
        let credentials = authCosignerCredentials
        if (!authCosignerCredentials && authCredentialsGenerator) {
            credentials = await authCredentialsGenerator.generateCosignerAuthCredentials()    
        }
        const response = await axios.delete(
            `${this.hostname}/api/multisig/proposals/${id}/?wallet_id=${walletId}`, 
            { headers: { ...credentials } }
        )
        return response.data
    }

    async getProposalStatus({ unsignedTransactionHash, queryFilter }) {
        let url = `${this.hostname}/api/multisig/proposals/${unsignedTransactionHash}/status/`

        if (queryFilter?.includeDeleted) {
            url += '?include_deleted=true'
        }
        const response = await axios.get(url)
        return response?.data
    }

    async getProposalByUnsignedTransactionHash(unsignedTransactionHash) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${unsignedTransactionHash}/`
        )
        return response.data
    }

    async getProposalCoordinator({ unsignedTransactionHash }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${unsignedTransactionHash}/coordinator/`
        )
        return response?.data
    }

    /**
     * Fetches the list of decoded signer signature data for a proposal and signer.
     *
     * @param {Object} params
     * @param {string} params.masterFingerprint - The signer's master fingerprint.
     * @param {string} params.proposalUnsignedTransactionHash - The unsigned transaction hash for the proposal.
     * @returns {Promise<import('./pst.js').DecodedSignerSignatureData[]>} Array of decoded signature data relevant to the provided master fingerprint.
     */
    async getSignerSignatures({ masterFingerprint, proposalUnsignedTransactionHash }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${proposalUnsignedTransactionHash}/signatures/${masterFingerprint}/`
        )
        return response.data
    }

    async getSignatures({ proposalUnsignedTransactionHash }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${proposalUnsignedTransactionHash}/signatures/`
        )
        return response.data
    }

    async getPsbts({ proposalUnsignedTransactionHash }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${proposalUnsignedTransactionHash}/psbts/`
        )
        return response.data
    }

    /**
     * Submits a partial signature for a multisig proposal.
     *
     * @param {Object} params
     * @param {string} params.proposalUnsignedTransactionHash - The unsigned transaction hash for the proposal.
     * @param {string} params.content - The partial signature payload; could be a PSBT base64 string or some other format. Currently only supports PSBT.
     * @param {string} [params.standard='psbt'] - The standard serialization format of the payload, default is 'psbt'.
     * @param {string} params.authCredentialsGenerator - Object or class instance that knows how to generate cosigner credential for this particular proposal.
     * @returns {Promise<Object>} Response data from the signature submission.
     */
    async submitPsbt({ content, standard = 'psbt', encoding = 'base64', proposalUnsignedTransactionHash, walletId, authCosignerAuthCredentials }) {
        // const authCosignerAuthCredentials = await authCredentialsGenerator.generateCosignerAuthCredentials()
        const response = await axios.post(
            `${this.hostname}/api/multisig/proposals/${proposalUnsignedTransactionHash}/psbts/?wallet_id=${walletId}`,
            { content, standard, encoding },
            { headers: { ...authCosignerAuthCredentials } }
        )

        return response?.data
    }

     /**
      * Fetches proposals for a wallet.
      *
      * @param {string} walletIdentifier - Identifier for the wallet; can be a wallet id, walletHash, or walletDescriptorId.
      * @returns {Promise<Array<{ 
      *   id: number, 
      *   wallet: number, 
      *   proposal: string, 
      *   proposalFormat: string, 
      *   unsignedTransactionHex: string 
      * }>>} Array of proposals associated with the given wallet.
      */
    async getWalletProposals(walletIdentifier, status='pending') {
        const response = await axios.get(
            `${this.hostname}/api/multisig/wallets/${walletIdentifier}/proposals/?status=${status}`
        )
        return response.data
    }

    async uploadWalletWcSession({ walletIdentifier, payload, authCosignerAuthCredentials }) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${walletIdentifier}/walletconnect/sessions/`,
            payload,
            { headers: { ...authCosignerAuthCredentials } }
        )
        return response.data
    }

    async getWalletWcSessions({ walletIdentifier }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/wallets/${walletIdentifier}/walletconnect/sessions/`,
        )
        return response.data
    }
}
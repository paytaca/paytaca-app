import axios from 'axios'
import { CashAddressNetworkPrefix, decodeCashAddress } from "bitauth-libauth-v3";
import { ElectrumNetworkProvider } from 'cashscript';

/**
 * Default timeout for network requests (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Timeout for critical operations like transaction broadcast (60 seconds)
 */
const BROADCAST_TIMEOUT = 60000;

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
        this.hostname = process.env.WATCHTOWER_MAINNET || 'https://watchtower.cash'
        this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet
        this.network = config?.network || WatchtowerNetwork.mainnet
        if (this.network === WatchtowerNetwork.chipnet) {
            this.hostname = process.env.WATCHTOWER_CHIPNET || 'https://chipnet.watchtower.cash'
            this.cashAddressNetworkPrefix = CashAddressNetworkPrefix.testnet
        }
    }
    
    async getAddressUtxos(address, addressPath) {
        const response =  await axios.get(
            `${this.hostname}/api/multisig/wallets/utxos/${address}`,
            { timeout: DEFAULT_TIMEOUT }
        ) 
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
        return await axios.get(url, { timeout: DEFAULT_TIMEOUT }) 

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
    async broadcastTransaction(rawTxHex, maxRetries = 3) { 

        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await axios.post(
                    `${this.hostname}/api/broadcast/`, 
                    { transaction: rawTxHex },
                    { timeout: 60000 } // Longer timeout for broadcast
                );
                return response;
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (error.response?.status === 400) {
                    throw error; // Invalid transaction, don't retry
                }
                
                // Exponential backoff
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, Math.pow(2, attempt) * 1000)
                    );
                }
            }
        }
        
        throw lastError;
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
        
        return await axios.get(url, { timeout: DEFAULT_TIMEOUT })
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

        return await axios.post(
            `${this.hostname}/api/subscription/`,
            {
                project_id: projectId[this.network],
                addresses,
                address_index: addressIndex,
                wallet_hash: walletHash
            },
            { timeout: DEFAULT_TIMEOUT }
        ) 
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
            { 
                headers: await wallet.generateAuthCredentials(),
                timeout: DEFAULT_TIMEOUT
            }
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
            { 
                headers: await authCredentialsGenerator.generateAuthCredentials(),
                timeout: DEFAULT_TIMEOUT
            }
        )
        return response.data   
    } 

    async updateWalletLastIssuedDepositAddressIndex(wallet, lastIssuedDepositAddressIndex, network) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${wallet.walletHash}/last-issued-deposit-address-index`,
            { network: network || this.network, lastIssuedDepositAddressIndex }, 
            { 
                headers: await wallet.generateAuthCredentials(),
                timeout: DEFAULT_TIMEOUT
            }
        )
        return response.data
    }

    async updateWalletLastUsedDepositAddressIndex(wallet, lastUsedDepositAddressIndex, network) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${wallet.walletHash}/last-used-deposit-address-index`,
            { network: network || this.network, lastUsedDepositAddressIndex }, 
            { 
                headers: await wallet.generateAuthCredentials(),
                timeout: DEFAULT_TIMEOUT
            }
        )
        return response.data
    }

    async updateWalletLastUsedChangeAddressIndex(wallet, lastUsedChangeAddressIndex, network) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${wallet.walletHash}/last-used-change-address-index`,
            { network: network || this.network, lastUsedChangeAddressIndex }, 
            { 
                headers: await wallet.generateAuthCredentials(),
                timeout: DEFAULT_TIMEOUT
            }
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
            { 
                headers: { ...authCredentials },
                timeout: DEFAULT_TIMEOUT
            }
        )
        return response.data
    }

    async getServerIdentity({ publicKey, authCredentialsGenerator }) {
        const authCredentials = await authCredentialsGenerator.generateAuthCredentials()
        const response = await axios.get(
            `${this.hostname}/api/multisig/coordinator/server-identities/${publicKey}/`,
            { 
                headers: { ...authCredentials },
                timeout: DEFAULT_TIMEOUT
            }
        )
        return response.data
    }

    async getWallet({ identifier }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/wallets/${identifier}/`,
            { timeout: DEFAULT_TIMEOUT }
        )
        return response.data
    }

    async getSignerWallets({ publicKey }) {        
        const response = await axios.get(
            `${this.hostname}/api/multisig/signers/${publicKey}/wallets/`,
            { timeout: DEFAULT_TIMEOUT }
        )
        return response.data
    }


    async getSignerWalletsByMasterFingerprint({ masterFingerprint }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/signers/${masterFingerprint}/wallets/`,
            { timeout: DEFAULT_TIMEOUT }
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
            { 
                headers: { ...authCredentials, ...authCosignerAuthCredentials },
                timeout: DEFAULT_TIMEOUT
            }
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
            { 
                headers: { ...credentials },
                timeout: DEFAULT_TIMEOUT
            }
        )
        return response.data
    }

    async getProposalStatus({ unsignedTransactionHash, queryFilter }) {
        let url = `${this.hostname}/api/multisig/proposals/${unsignedTransactionHash}/status/`

        if (queryFilter?.includeDeleted) {
            url += '?include_deleted=true'
        }
        const response = await axios.get(url, { timeout: DEFAULT_TIMEOUT })
        return response?.data
    }

    async getProposalByUnsignedTransactionHash(unsignedTransactionHash) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${unsignedTransactionHash}/`,
            { timeout: DEFAULT_TIMEOUT }
        )
        return response.data
    }

    async getProposalCoordinator({ unsignedTransactionHash }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${unsignedTransactionHash}/coordinator/`,
            { timeout: DEFAULT_TIMEOUT }
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
            `${this.hostname}/api/multisig/proposals/${proposalUnsignedTransactionHash}/signatures/${masterFingerprint}/`,
            { timeout: DEFAULT_TIMEOUT }
        )
        return response.data
    }

    async getSignatures({ proposalUnsignedTransactionHash }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${proposalUnsignedTransactionHash}/signatures/`,
            { timeout: DEFAULT_TIMEOUT }
        )
        return response.data
    }

    async getPsbts({ proposalUnsignedTransactionHash }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/proposals/${proposalUnsignedTransactionHash}/psbts/`,
            { timeout: DEFAULT_TIMEOUT }
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
            { 
                headers: { ...authCosignerAuthCredentials },
                timeout: DEFAULT_TIMEOUT
            }
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
            `${this.hostname}/api/multisig/wallets/${walletIdentifier}/proposals/?status=${status}`,
            { timeout: DEFAULT_TIMEOUT }
        )
        return response.data
    }

    async uploadWalletWcSession({ walletIdentifier, payload, authCosignerAuthCredentials }) {
        const response = await axios.post(
            `${this.hostname}/api/multisig/wallets/${walletIdentifier}/walletconnect/sessions/`,
            payload,
            { 
                headers: { ...authCosignerAuthCredentials },
                timeout: DEFAULT_TIMEOUT
            }
        )
        return response.data
    }

    async getWalletWcSessions({ walletIdentifier }) {
        const response = await axios.get(
            `${this.hostname}/api/multisig/wallets/${walletIdentifier}/walletconnect/sessions/`,
            { timeout: DEFAULT_TIMEOUT }
        )
        return response.data
    }
}
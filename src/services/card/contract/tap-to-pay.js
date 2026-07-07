

import { Contract as MainnetContract } from '@mainnet-cash/contract';
import { SignatureTemplate, Contract, TransactionBuilder, Network, ElectrumNetworkProvider } from 'cashscript';
import { P2PKH_DUST, TX_FEE } from '../constants.js';
import { binToHex } from '@bitauth/libauth';
import { pubkeyToPkHash } from '../utils.js';
import { decodeCommitment, encodeCommitment, encodeMerchantHash } from '../auth-nft.js';
import artifact from './TapToPay.json';
import artifactV2 from './TapToPay-V2.json';
import Watchtower from 'src/lib/watchtower/index.js';
import { loadWallet } from 'src/services/wallet.js';
import { isTokenAddress } from 'src/utils/address-utils.js';

import { 
    encodeOwnershipCommitment, 
    decodeOwnershipCommitment,
    encodeLinkingCommitment,
    decodeLinkingCommitment
} from '../utils.js';

/**
 * Reverses a hex string by byte (2-char) pairs.
 *
 * Used to flip the on-chain token category endianness when matching
 * authorization NFT UTXOs in `mutate()`.
 *
 * @param {string} hex - Hex string to reverse.
 * @returns {string} Reversed hex string; returns input when empty or invalid.
 */
function reverseHex(hex) {
  if (!hex) return hex;
  const pairs = hex.match(/.{1,2}/g);
  return pairs ? pairs.reverse().join('') : hex;
}

// Helper to safely convert numbers/strings to BigInt
const toBigInt = (v) => (typeof v === 'bigint' ? v : BigInt(v ?? 0))

/**
 * TapToPay contract helper bound to a specific `contractId`.
 *
 * This is an instance-based wrapper around the TapToPay CashScript contract,
 * exposing convenience methods to query UTXOs and perform contract actions
 * like mutate and sweep for that specific contract instance.
 */
class TapToPay {
    constructor (contractId) {
        this.contractId = contractId;
    }

    /**
     * Contract creation parameters extracted from the on-chain contract.
     * @returns {{ ownerPkh: string, backendPkh: string, category: string }}
     */
    get contractCreationParams () {
        throw new Error('contractCreationParams getter must be implemented in subclass');
    }

    /**
     * Builds and returns a CashScript contract instance.
     * @returns {Contract}
     */
    getContract () {
        throw new Error('getContract() must be implemented in subclass');
    } 

    /**
     * Fetches all UTXOs for the contract address.
     * @returns {Promise<Array>}
     */
    async getUtxos () {
        const contract = this.getContract()
        return await contract.getUtxos();
    }

    /**
     * Fetches token UTXOs for the contract address.
     * @param {string} tokenId - Token category ID to filter UTXOs.
     * @param {string} tokenAddress - Token address to query for UTXOs.
     * @returns {Promise<Array>}
     */
    async getTokenUtxos (tokenId, tokenAddress) {      
        if (!tokenAddress || isTokenAddress(tokenAddress) === false) {
            console.warn('Invalid or missing token address for getTokenUtxos:', tokenAddress)
            return []
        }
    
        let result = []
        const wallet = await loadWallet()
        const rawWallet = await wallet.getRawWallet()
        const response = await rawWallet.watchtower.BCH._api.get(`utxo/ct/${tokenAddress}/${tokenId}/`, {
            params: {
                is_cashtoken_nft: true
            }}
        )
        result = response.data?.utxos
        return result?.map(utxo => ({
            txid: utxo.txid,
            token: {
                category: utxo.tokenid,
                amount: BigInt(utxo.amount),
                nft: {
                    capability: utxo.capability,
                    commitment: utxo.commitment,
                }
            },
            vout: utxo.vout,
            satoshis: BigInt(utxo.value)
        })) || []
    }

    /**
     * Fetches BCH-only UTXOs for the contract address.
     * @param {number} [amount=0] - Optional minimum cumulative amount of BCH UTXOs to fetch.
     * @returns {Promise<Array>}
     */
    async getBchUtxos (amount = 0) {
        const cashAddress = this.getContract().address
        const wallet = await loadWallet()
        const rawWallet = await wallet.getRawWallet()
        const { cumulativeValue, utxos } = await rawWallet.watchtower.BCH.getBchUtxos(cashAddress, amount)
        return {
            cumulativeValue,
            utxos: utxos?.map(utxo => ({
                txid: utxo.tx_hash,
                vout: utxo.tx_pos,
                satoshis: BigInt(utxo.value)
            })) || []
        }
    }

    /**
     * Fetches funding inputs for the wallet's cash address.
     * @param {number} amount - Optional minimum cumulative amount of BCH UTXOs to fetch.
     * @returns {Promise<{cumulativeValue: bigint, groupedUtxos: Array, changeAddress: string}>}
     */
    async getFundingInputs (amount = 0) {
        const wallet = await loadWallet()
        const changeAddress = wallet.changeAddress()
        const handle = `wallet:${wallet.walletHash}`
        const { cumulativeValue, utxos } = await wallet.getBchUtxos(handle, parseInt(amount))

        // Watchtower returns utxos from both cashAddress and its changeAddress.
        // But we need to use the correct keypair for signing based on which address the UTXO belongs to
        // So we group the UTXOs by address_path
        let utxosByAddressPath = {}
        if (utxos.length > 0) {
            utxosByAddressPath = utxos.reduce((acc, utxo) => {
                const path = utxo.address_path || 'unknown'
                if (!acc[path]) {
                    let privkey = wallet.privkey()
                    if (path !== 'unknown') privkey = wallet.privkey(path)
                    acc[path] = { 
                        privkey: privkey,
                        utxos: [] 
                    }
                }
                acc[path].utxos.push(utxo)
                return acc
            }, {})
        }

        // Keep funding UTXOs grouped by source key so each group can be signed correctly.
        const groupedBchFundingInputs = Object.values(utxosByAddressPath)
            .filter(group => group?.privkey && Array.isArray(group?.utxos) && group.utxos.length > 0)
            .map(group => ({
                signatureTemplate: new SignatureTemplate(group.privkey),
                inputs: group.utxos.map((input) => ({
                    satoshis: toBigInt(input.satoshis),
                    txid: input.txid,
                    vout: input.vout
                }))
            }))

        return { 
            cumulativeValue, 
            groupedUtxos: groupedBchFundingInputs, 
            changeAddress
        };
    }

    async mutate () {}
    async sweep () {}
    async burn () {}

    estimateFee({ numContractInputs = 0, numP2pkhInputs = 0, numOutputs = 2, feeRate = 2n } = {}) {
        // CashScript contract inputs are larger due to unlocking script (redeem script + args)
        // Approximate: ~300 bytes per contract input, ~148 bytes per P2PKH input
        const CONTRACT_INPUT_SIZE = 300
        const P2PKH_INPUT_SIZE = 148
        const OUTPUT_SIZE = 34
        const TX_OVERHEAD = 10

        const estimatedSize = TX_OVERHEAD
            + (numContractInputs * CONTRACT_INPUT_SIZE)
            + (numP2pkhInputs * P2PKH_INPUT_SIZE)
            + (numOutputs * OUTPUT_SIZE)

        return BigInt(estimatedSize) * feeRate
    }

    /**
     * Broadcasts a raw transaction hex via Watchtower.
     * @param {string} txHex
     * @returns {Promise<Object>}
     */
    async broadcastTransaction(txHex) {
        console.log('[broadcastTransaction] Broadcasting transaction...')
        return await (new Watchtower().broadcastTx(txHex))
    }
}

export class TapToPayV1 extends TapToPay {
    constructor (contractId, params = null) {
        super(contractId)

        if (contractId) {
            const contract = MainnetContract.fromId(contractId);
            const parameters = [];
            contract.parameters.forEach((param) => {
                parameters.push(Buffer(param).toString('hex'));
            })

            this.params = {
                ownerPkh: parameters[0],
                backendPkh: parameters[1],
                category: parameters[2]
            };
        } else if (params) {
            this.params = {
                ownerPkh: params.ownerPkh,
                backendPkh: params.backendPkh,
                category: params.category
            };
        }
    }

    /**
     * Contract creation parameters extracted from the on-chain contract.
     * @returns {{ ownerPkh: string, backendPkh: string, category: string }}
     */
    get contractCreationParams () {
        return {
            ownerPkh: this.params.ownerPkh,
            backendPkh: this.params.backendPkh,
            category: this.params.category,
        };
    }

    /**
     * Builds and returns a CashScript contract instance.
     * @returns {Contract}
     */
    getContract () {
        const contractCreationParams = this.contractCreationParams
        const contractParams = [
            contractCreationParams.ownerPkh,
            contractCreationParams.backendPkh,
            contractCreationParams.category
        ];

        const contract = new Contract(artifact, contractParams)
        return contract;
    } 

    /**
     * Mutates authorization NFTs held by this contract.
     *
     * Rewrites NFT commitments for the provided merchant mutations and
     * re-emits the NFTs back to the contract token address. Only the owner
     * (matching `ownerPkh`) may perform this action.
     *
     * @param {Object} params
     * @param {string} params.senderWif - Owner WIF used to sign the mutation.
     * @param {Array<Object>} params.mutations - Mutation objects with merchant/authorization data.
     * @param {string} params.mutations[].merchant.id - Merchant ID for the mutation.
     * @param {string} params.mutations[].merchant.pubkey - Merchant public key for the mutation.
     * @param {boolean} params.mutations[].authorized - Authorization status for the mutation.
     * @param {number} params.mutations[].spendLimitSats - Optional spend limit in satoshis for the mutation.
     * @param {boolean} [params.broadcast=true] - Broadcast the transaction when true, else return tx hex.
     * @returns {Promise<Object>} Transaction result or `{ success: true, txHex }` when not broadcasting.
     */
    async mutate ({ senderWif, mutations, broadcast = true }) {

        const contract = this.getContract()
        const senderSig = new SignatureTemplate(senderWif)
        const senderPk = binToHex(senderSig.getPublicKey())
        const senderPkh = pubkeyToPkHash(senderPk)

        if (senderPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Sender public key hash does not match the owner public key hash');
        }

        const tokenId = reverseHex(this.contractCreationParams.category)
        const tokenUtxos = await this.getTokenUtxos(tokenId, contract.tokenAddress)

        // Get the merchant hashes from the mutations
        const merchantHashes = mutations.map(e => { 
            const { hex } = encodeMerchantHash({ 
                merchantId: e.merchant?.id, 
                merchantPk: e.merchant?.pubkey 
            })
            return hex;
        })

        // Filter UTXOs to only those matching the token category and merchant hashes
        const utxosToMutate = tokenUtxos.filter(utxo => {
            if (utxo.token?.nft?.commitment) {
                const commitment = utxo.token?.nft?.commitment
                const { hash } = decodeCommitment(commitment)
                return (
                    utxo.token.category === tokenId && 
                    merchantHashes.includes(hash)
                )
            } else {
                return false
            }
        })

        // Prepare the token inputs for mutation,
        // normalizing the input UTXOs to expected format
        const tokenInputs = utxosToMutate.map((input) => {

            const normalized = { 
                ...input, 
                satoshis: toBigInt(input.satoshis),
                txid: input.txid,
                vout: input.vout
            }
            
            const category = input.token.category || input.token.tokenId
            const amount = toBigInt(input.token.amount ?? 0)
            const capability = input.token.capability || input.token.nft?.capability
            const commitment = input.token.commitment || input.token.nft?.commitment
            
            normalized.token = { 
                category: String(category), 
                amount
            }

            if (capability || commitment) {
                normalized.token.nft = { 
                    capability: String(capability), 
                    commitment: String(commitment) 
                }
            }
            return normalized
        })

        // Prepare the outputs for the mutations
        const outputs = []
        for (let i = 0; i < mutations.length; i++) {
            const mutation = mutations[i]
            const { hex: merchantHash } = encodeMerchantHash({ 
                merchantId: mutation.merchant?.id, 
                merchantPk: mutation.merchant?.pubkey
            })
            
            // Find the utxos to mutate (matching the merchant hash)
            const mutxo = utxosToMutate.find(utxo => {
                const commitment = utxo.token?.nft?.commitment
                const { hash } = decodeCommitment(commitment)
                
                return merchantHash === hash
            })

            if (!mutxo) {
                console.warn(`No matching UTXO found for mutation with merchant hash ${merchantHash}. Skipping this mutation.`)
                continue
            }

            const currCommitment = decodeCommitment(mutxo.token.nft.commitment)
            const newCommitmentData = {
                authorized: mutation.authorized,
                spendLimitSats: mutation.spendLimitSats || currCommitment.spendLimitSats,
                merchant: mutation.merchant
            }

            // Encode the new commitment
            const newCommitment = encodeCommitment(newCommitmentData)

            if (newCommitment === mutxo.token.nft.commitment) {
                console.warn(`New commitment is the same as the current commitment for merchant hash ${merchantHash}. Skipping this mutation.`)
                continue
            }

            // Prepare the output rewriting the commitment
            const output = {
                to: contract.tokenAddress,
                amount: toBigInt(mutxo.satoshis),
                token: {
                    amount: toBigInt(mutxo.token?.amount ?? 0), // NFTs: 0n
                    category: String(mutxo.token?.category),
                    nft: {
                        capability: String(mutxo.token?.nft?.capability),
                        commitment: String(newCommitment)
                    }
                }
            }

            // Add the output to the outputs array
            outputs.push(output)
        }

        if (outputs.length === 0) {
            throw new Error('No valid mutations to process. No outputs were generated.')
        }

        // Estimate the fee based on the number of inputs and outputs, and get funding UTXOs to cover it
        const estimatedFee = this.estimateFee({ 
            numContractInputs: tokenInputs.length, 
            numP2pkhInputs: 1, // Assume at least 1 P2PKH input for funding
            numOutputs: outputs.length + 1 // Mutation outputs + potential change output
        })
        
        const { 
            cumulativeValue, 
            groupedUtxos: groupedBchFundingInputs, 
            changeAddress
        } = await this.getFundingInputs(estimatedFee)
        
        const changeAmount = cumulativeValue - BigInt(estimatedFee)

        // Add change output if there's leftover BCH after covering the fee
        if (changeAmount > P2PKH_DUST) {
            outputs.push({
                to: changeAddress,
                amount: toBigInt(changeAmount)
            })
        }

        // Prepare the contract transaction from the combined inputs and outputs
        const provider = new ElectrumNetworkProvider(Network.MAINNET)
        const tx = new TransactionBuilder({provider})

        tx.addInputs(tokenInputs, contract.unlock.mutate(senderPk, senderSig))
        groupedBchFundingInputs.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs(outputs)
        
        let result

        try {
            // Build the transaction
            const txHex = tx.build()
            console.log('[mutate] Built transaction hex:', txHex)

            if (broadcast) {
                result = await this.broadcastTransaction(txHex)
            } else {
                result = { success: true, txHex }
            }
        } catch (error) {
            throw error
        }

        console.log('[mutate] Transaction result:', result)
        return result
    }

    /**
     * Sweeps all contract-held tokens and BCH to the provided address.
     *
     * @param {Object} params
     * @param {string} params.ownerWif - Owner WIF used to authorize the sweep.
     * @param {string} params.toAddress - Destination cash address for BCH.
     * @param {boolean} [params.broadcast=false] - Broadcast transactions when true.
     * @returns {Promise<Object>} Sweep results for tokens and BCH.
     */
    async sweep ({ ownerWif, toAddress, broadcast = false }) {

        const contract = this.getContract()
        const ownerSig = new SignatureTemplate(ownerWif)
        const ownerPk = binToHex(ownerSig.getPublicKey())
        const ownerPkh = pubkeyToPkHash(ownerPk)

        if (ownerPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Owner public key hash does not match the contract\'s owner public key hash')
        }

        const sweepResult = {}
        const { 
            cumulativeValue: sweepAmount, 
            utxos: bchUtxos
        } = await this.getBchUtxos()

        
        // Prepare inputs
        const bchInputs = bchUtxos.map(utxo => {
            const normalized = { 
                satoshis: toBigInt(utxo.satoshis),
                txid: utxo.txid,
                vout: utxo.vout
            }
            return normalized
        })

        // Prepare outputs
        const outputs = [
            { to: toAddress, amount: sweepAmount }
        ]

        // Estimate fee
        const estimatedFee = this.estimateFee({ 
            numContractInputs: bchInputs.length, 
            numP2pkhInputs: 1, 
            numOutputs: 2 
        })

        const { 
            cumulativeValue: fundingAmount, 
            groupedUtxos: groupedBchFundingInputs, 
            changeAddress 
        } = await this.getFundingInputs(estimatedFee)
        
        const changeAmount = fundingAmount - BigInt(estimatedFee)
        
        if (fundingAmount < BigInt(estimatedFee)) {
            sweepResult = { success: false, message: 'Insufficient BCH balance to cover sweep fee.' }
            return sweepResult
        }

        if (changeAmount > P2PKH_DUST) {
            outputs.push({ to: changeAddress, amount: changeAmount })
        }

        const provider = new ElectrumNetworkProvider(Network.MAINNET)
        const tx = new TransactionBuilder({provider})

        tx.addInputs(bchInputs, contract.unlock.sweep(ownerPk, ownerSig))
        groupedBchFundingInputs.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs(outputs)

        let result
        try {
            // Build the transaction
            const txHex = tx.build()
            console.log('[sweep] Built transaction hex:', txHex)

            if (broadcast) {
                result = await this.broadcastTransaction(txHex)
            } else {
                result = { success: true, txHex }
            }

        } catch (error) {
            throw error
        }

        console.log('[sweep] Sweep result:', result)
        return result
    }

    /**
     * Burns a specific authorization NFT held by the contract for a 
     * given merchant and token ID.
     **/
    async burn ({ ownerWif, merchant, broadcast = true }) {
        const contract = this.getContract()
        const ownerSig = new SignatureTemplate(ownerWif)
        const ownerPk = binToHex(ownerSig.getPublicKey())
        const ownerPkh = pubkeyToPkHash(ownerPk)

        if (ownerPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Owner public key hash does not match the contract\'s owner public key hash')
        }

        const tokenId = reverseHex(this.contractCreationParams.category)
        const tokenUtxos = await this.getTokenUtxos(tokenId, contract.tokenAddress)
        const utxoToBurn = tokenUtxos.find(utxo => {
            const matchingTokenId = utxo.token.category === tokenId
            if (!matchingTokenId) return false

            const commitment = utxo.token.nft.commitment
            const decodedCommitment = decodeCommitment(commitment)
            
            let merchantHash = ""
            if (merchant) {
                merchantHash = encodeMerchantHash({ 
                    merchantId: merchant?.id, 
                    merchantPk: merchant?.pubkey 
                }).hex
            }

            return decodedCommitment.hash === merchantHash
        })

        if (!utxoToBurn) {
            throw new Error('No matching token UTXO found to burn for the specified merchant and token ID')
        }

        const outputs = [
            { to: contract.address, amount: 1000n }
        ]

        // get funding utxos to cover the burn fee
        const estimatedFee = this.estimateFee({ 
            numContractInputs: utxoToBurn.length, // The token UTXO being burned
            numP2pkhInputs: 1, // Assume at least 1 P2PKH input for funding
            numOutputs: outputs.length + 1 // Burn output + potential change output
        })

        const { 
            cumulativeValue: fundingAmount, 
            groupedUtxos: fundingUtxos, 
            changeAddress 
        } = await this.getFundingInputs(estimatedFee)
        const changeAmount = fundingAmount - estimatedFee

        if (changeAmount > P2PKH_DUST) {
            outputs.push({ to: changeAddress, amount: changeAmount })
        }

        const provider = new ElectrumNetworkProvider(Network.MAINNET)
        const tx = new TransactionBuilder({provider})

        tx.addInput(utxoToBurn, contract.unlock.burn(ownerPk, ownerSig))
        fundingUtxos.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs(outputs)
        
        let result
        try {
            // Build the transaction
            console.log('[burn] Building transaction...')
            const txHex = tx.build()
            
            if (broadcast) {
                result = await this.broadcastTransaction(txHex)
            } else {
                result = { success: true, txHex }
            }
        } catch (error) {
            throw error
        }

        return result
    }

}

export class TapToPayV2 extends TapToPay {
    constructor (contractId, params = null) {
        super(contractId)

        if (contractId) {
            const contract = MainnetContract.fromId(contractId);
            const parameters = [];
            contract.parameters.forEach((param) => {
                parameters.push(Buffer(param).toString('hex'));
            })

            this.params = {
                backendPkh: parameters[0],
                category: parameters[1]
            };
        } else if (params) {
            this.params = {
                backendPkh: params.backendPkh,
                category: params.category
            };
        }
    }

    /**
     * Contract creation parameters extracted from the on-chain contract.
     * @returns {{ backendPkh: string, category: string }}
     */
    get contractCreationParams () {
        return {
            backendPkh: this.params.backendPkh,
            category: this.params.category,
        };
    }

    /**
     * Builds and returns a CashScript contract instance.
     * @returns {Contract}
     */
    getContract () {
        const contractCreationParams = this.contractCreationParams
        const contractParams = [
            contractCreationParams.backendPkh,
            reverseHex(contractCreationParams.category)
        ];

        const contract = new Contract(artifactV2, contractParams)
        return contract;
    }

    async setOwnership (ownerWif, authCategory) {
        const contract = this.getContract()
        const ownerSig = new SignatureTemplate(ownerWif)
        const ownerPk = binToHex(ownerSig.getPublicKey())
        const ownerPkh = pubkeyToPkHash(ownerPk)
        console.log('-----ownerPkh:', ownerPkh)

        // get contract token utxos
        const tokenId = this.contractCreationParams.category
        const ownershipTokens = await this.getTokenUtxos(tokenId, contract.tokenAddress)
        console.log('ownershipTokens:', ownershipTokens)  

        if (ownershipTokens.length === 0 || ownershipTokens.length !== 2) {
            throw new Error('Expected exactly 2 token UTXOs for setOwnership, but found ' + ownershipTokens.length)
        }

        // Construct the ownership token inputs
        const sortedOwnershipTokens = []
        // index[0] = pkh token
        // index[1] = cat token

        let pkhCategory, catCategory = ""
        for (let i = 0; i < ownershipTokens.length; i++) {
            const utxo = ownershipTokens[i]
            // Get the linking token
            const commitment = utxo.token.nft?.commitment
            const decodedCommitment = decodeOwnershipCommitment(commitment)
            console.log('decodedCommitment:', decodedCommitment)
            if (decodedCommitment?.type === 'pkh') {
                sortedOwnershipTokens[0] = utxo
                pkhCategory = decodedCommitment.category
            } else if (decodedCommitment?.type === 'cat') {
                sortedOwnershipTokens[1] = utxo
                catCategory = decodedCommitment.category
            }
        }

        console.log('pkhCategory:', pkhCategory)
        console.log('catCategory:', catCategory)

        if (pkhCategory !==  catCategory) {
            throw new Error('Ownership token categories do not match: pkhCategory=' + pkhCategory + ', catCategory=' + catCategory)
        }

        console.log('sortedOwnershipTokens:', sortedOwnershipTokens)
        const linkingCategory = reverseHex(pkhCategory)

        const wallet = await loadWallet()
        const linkingTokens = await wallet.getTokenUtxos(linkingCategory, wallet.tokenAddress())
        console.log('linkingTokens:', linkingTokens)

        if (linkingTokens.length !== 1) {
            throw new Error('Expected exactly 1 linking token UTXO for setOwnership, but found ' + linkingTokens.length)
        }

        const normalizedOwnershipTokens = sortedOwnershipTokens.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            satoshis: toBigInt(utxo.satoshis || utxo.value),
            token: utxo.token
        }))

        const normalizedLinkingToken = {
            txid: linkingTokens[0].txid,
            vout: linkingTokens[0].vout,
            satoshis: toBigInt(linkingTokens[0].satoshis || linkingTokens[0].value),
            token: linkingTokens[0].token
        }

        console.log('normalizedOwnershipTokens:', normalizedOwnershipTokens)
        console.log('normalizedLinkingToken:', normalizedLinkingToken)

        const estimatedFee = this.estimateFee({ 
            numContractInputs: normalizedOwnershipTokens.length + 1, 
            numP2pkhInputs: 1, 
            numOutputs: 2 
        })
        const fundingUtxosResult = await this.getFundingInputs(estimatedFee)
        const { 
            cumulativeValue: fundingAmount, 
            groupedUtxos: fundingUtxos, 
            changeAddress 
        } = fundingUtxosResult
        const changeAmount = fundingAmount - estimatedFee

        if (fundingAmount < BigInt(estimatedFee)) {
            throw new Error('Insufficient BCH balance to cover fee for setOwnership')
        }

        console.log('fundingAmount:', fundingAmount)
        console.log('fundingUtxos:', fundingUtxos)
        console.log('changeAddress:', changeAddress)
        console.log('changeAmount:', changeAmount)

        const outputs = []

        for (let i = 0; i < normalizedOwnershipTokens.length; i++) {
            const utxo = normalizedOwnershipTokens[i]
            const decodedOwnershipCommitment = decodeOwnershipCommitment(utxo.token.nft.commitment)
            const holderType = decodedOwnershipCommitment.type
            const valueHex = holderType === 'pkh' ? ownerPkh : reverseHex(authCategory)
            console.log('---->>>>holderType:', holderType)
            console.log('---->>>>valueHex:', valueHex)
            const encodedCommitment = encodeLinkingCommitment({
                holderType: holderType,
                valueHex: valueHex
            })
            console.log('---->>>>encodedCommitment:', encodedCommitment)
            const output = {
                to: contract.tokenAddress,
                amount: utxo.satoshis,
                token: {
                    amount: utxo.token.amount,
                    category: utxo.token.category,
                    nft: {
                        capability: utxo.token.nft.capability,
                        commitment: encodedCommitment
                    }
                }
            }
            outputs.push(output)
        }

        if (changeAmount > 0n) {
            outputs.push({ to: changeAddress, amount: changeAmount });
        }

        const provider = new ElectrumNetworkProvider(Network.MAINNET)
        const tx = new TransactionBuilder({provider})

        tx.addInputs(normalizedOwnershipTokens, contract.unlock.setOwner(reverseHex(authCategory), ownerPk, ownerSig))
        tx.addInput(normalizedLinkingToken, ownerSig.unlockP2PKH())
        fundingUtxos.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs(outputs)

        console.log('---------inputs:', tx.inputs)
        console.log('---------outputs:', tx.outputs)

        const txHex = tx.build()
        console.log('txHex:', txHex)
        // const result = await this.broadcastTransaction(txHex)
        const result = await tx.send()
        console.log('result:', result)
    }
}
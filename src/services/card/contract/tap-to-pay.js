

import { Contract as MainnetContract } from '@mainnet-cash/contract';
import { SignatureTemplate, Contract, TransactionBuilder, Network, ElectrumNetworkProvider } from 'cashscript';
import { TX_FEE } from '../constants.js';
import { binToHex } from '@bitauth/libauth';
import { pubkeyToPkHash } from '../utils.js';
import { decodeCommitment, encodeCommitment, encodeMerchantHash } from '../auth-nft.js';
import artifact from './TapToPay.json';
import Watchtower from 'src/lib/watchtower/index.js';
import { loadWallet } from 'src/services/wallet.js';
import { isTokenAddress } from 'src/utils/address-utils.js';

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
export class TapToPay {
    constructor (contractId) {
        this.contractId = contractId;
        const contract = MainnetContract.fromId(contractId);

        const parameters = [];
        contract.parameters.forEach((param) => {
            parameters.push(Buffer(param).toString('hex'));
        })

        this.params = {
            ownerPkh: parameters[0],
            backendPkh: parameters[1],
            authCategory: parameters[2]
        };
    }

    /**
     * Contract creation parameters extracted from the on-chain contract.
     * @returns {{ ownerPkh: string, backendPkh: string, authCategory: string }}
     */
    get contractCreationParams () {
        return {
            ownerPkh: this.params.ownerPkh,
            backendPkh: this.params.backendPkh,
            authCategory: this.params.authCategory,
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
            contractCreationParams.authCategory
        ];

        const contract = new Contract(artifact, contractParams)
        return contract;
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
        console.log(`Fetching token UTXOs with tokenId: ${tokenId} and tokenAddress: ${tokenAddress}`)      
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
        const walletCashAddress = wallet.address()
        const changeAddress = wallet.changeAddress()
        const { cumulativeValue, utxos } = await wallet.getBchUtxos(walletCashAddress, parseInt(amount))

        // Watchtower returns utxos from both cashAddress and its changeAddress.
        // But we need to use the correct keypair for signing based on which address the UTXO belongs to
        // So we group the UTXOs by address_path
        let utxosByAddressPath = {}
        if (utxos.length > 0) {
            utxosByAddressPath = utxos.reduce((acc, utxo) => {
                const path = utxo.address_path || 'unknown'
                if (path === 'unknown') return acc
                if (!acc[path]) {
                    const privkey = wallet.privkey(path)
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

        const tokenId = reverseHex(this.contractCreationParams.authCategory)
        const tokenUtxos = await this.getTokenUtxos(tokenId, contract.tokenAddress)

        const fee = TX_FEE
        const { 
            cumulativeValue, 
            groupedUtxos: groupedBchFundingInputs, 
            changeAddress
        } = await this.getFundingInputs(fee)
        
        const changeAmount = cumulativeValue - BigInt(fee)

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

        outputs.push({
            to: changeAddress,
            amount: toBigInt(changeAmount)
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
        
        if (outputs.length === 0) {
            throw new Error('No valid mutations to process. No outputs were generated.')
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
        const hardcodedFee = TX_FEE
        
        const { 
            cumulativeValue: sweepAmount, 
            utxos: bchUtxos
        } = await this.getBchUtxos()

        const { 
            cumulativeValue: fundingAmount, 
            groupedUtxos: groupedBchFundingInputs, 
            changeAddress 
        } = await this.getFundingInputs(hardcodedFee)

        const changeAmount = fundingAmount - BigInt(hardcodedFee)
        
        if (fundingAmount < BigInt(hardcodedFee)) {
            sweepResult = { success: false, message: 'Insufficient BCH balance to cover sweep fee.' }
            return sweepResult
        }

        // Helper to safely convert numbers/strings to BigInt
        const toBigInt = (v) => (typeof v === 'bigint' ? v : BigInt(v ?? 0))

        const bchInputs = bchUtxos.map(utxo => {
            const normalized = { 
                satoshis: toBigInt(utxo.satoshis),
                txid: utxo.txid,
                vout: utxo.vout
            }
            return normalized
        })

        const provider = new ElectrumNetworkProvider(Network.MAINNET)
        const tx = new TransactionBuilder({provider})

        tx.addInputs(bchInputs, contract.unlock.sweep(ownerPk, ownerSig))
        groupedBchFundingInputs.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs([
            { to: toAddress, amount: sweepAmount },
            { to: changeAddress, amount: changeAmount }
        ])

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
     * WIP:
     * Burns a specific authorization NFT held by the contract for a 
     * given merchant and token ID.
     **/
    async burn ({ ownerWif, merchantId, broadcast = true }) {
        const contract = this.getContract()
        const ownerSig = new SignatureTemplate(ownerWif)
        const ownerPk = binToHex(ownerSig.getPublicKey())
        const ownerPkh = pubkeyToPkHash(ownerPk)

        if (ownerPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Owner public key hash does not match the contract\'s owner public key hash')
        }

        const tokenId = reverseHex(this.contractCreationParams.authCategory)
        const tokenUtxos = await this.getTokenUtxos(tokenId, contract.tokenAddress)
        console.log('--------Token UTXOs:', tokenUtxos)
        const utxoToBurn = tokenUtxos.find(utxo => {
            const commitment = utxo.token.nft.commitment
            const { merchant: utxoMerchant } = decodeCommitment(commitment)
            const matchingTokenId = utxo.token.category === tokenId
            if (!merchantId) return matchingTokenId
            const matchingMerchant = utxoMerchant?.id === merchantId
            return matchingTokenId && matchingMerchant
        })

        console.log('--------Token UTXO to burn:', utxoToBurn)

        if (!utxoToBurn) {
            throw new Error('No matching token UTXO found to burn for the specified merchant and token ID')
        }

        // get funding utxos to cover the burn fee
        const hardcodedFee = TX_FEE
        const { 
            cumulativeValue: fundingAmount, 
            groupedUtxos: fundingUtxos, 
            changeAddress 
        } = await this.getFundingInputs(hardcodedFee)
        const changeAmount = fundingAmount - hardcodedFee

        console.log('--------Change amount after fee:', changeAmount)
        console.log('--------Funding UTXOs:', fundingUtxos)

        // let tx = contract.functions.burn(ownerPk, ownerSig)
        //     .fromP2PKH(fundingUtxos, ownerSig)
        //     .from(utxoToBurn)
        //     .to(walletCashAddress, changeAmount)
        //     .to(contract.address, 1000n)

        const provider = new ElectrumNetworkProvider(Network.MAINNET)
        const tx = new TransactionBuilder({provider})

        tx.addInput(utxoToBurn, contract.unlock.burn(ownerPk, ownerSig))
        console.log('--------Added burn input:', tx.inputs)
        fundingUtxos.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs([
            // Sending a tiny amount to self to ensure the burn is processed on-chain
            { to: contract.address, amount: 1000n },
            { to: changeAddress, amount: changeAmount }
        ])

        console.log('------->inputs:', tx.inputs)
        console.log('------->outputs:', tx.outputs)
        
        
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
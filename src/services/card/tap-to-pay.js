

import { Contract as MainnetContract } from '@mainnet-cash/contract';
import { SignatureTemplate, Contract } from 'cashscript';
import { defaultNetwork, TX_FEE } from './constants.js';
import { binToHex } from '@bitauth/libauth';
import { convertCashAddressToTokenAddress, pubkeyToPkHash } from './utils.js';
import { decodeCommitment, encodeCommitment, encodeMerchantHash } from './auth-nft.js';
import artifact from './contract/TapToPay.json';
import Watchtower from 'src/lib/watchtower/index.js';


/**
 * Reverses a hex string by byte (2-char) pairs.
 *
 * Used to flip the on-chain token category endianness when matching
 * authorization NFT UTXOs in `mutate()`.
 *
 * @param {string} [hex=''] - Hex string to reverse.
 * @returns {string} Reversed hex string; returns input when empty or invalid.
 */
function reverseHex(hex = '') {
  if (!hex) return hex;
  const pairs = hex.match(/.{1,2}/g);
  return pairs ? pairs.reverse().join('') : hex;
}

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
     * @returns {Promise<Array>}
     */
    async getTokenUtxos () {
        const utxos = await this.getUtxos();
        return utxos.filter(utxo => utxo.token !== undefined);
    }

    /**
     * Fetches BCH-only UTXOs for the contract address.
     * @returns {Promise<Array>}
     */
    async getBchUtxos () {
        const utxos = await this.getUtxos();
        return utxos.filter(utxo => utxo.token === undefined);
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
        const senderPk = senderSig.getPublicKey()
        const senderPkh = pubkeyToPkHash(senderPk)

        if (senderPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Sender public key hash does not match the owner public key hash');
        }

        const utxos = await contract.getUtxos()
        const bchUtxos = utxos.filter(utxo => utxo.token == undefined)

        // Helper to safely convert numbers/strings to BigInt
        const toBigInt = (v) => (typeof v === 'bigint' ? v : BigInt(v ?? 0))

        // Get the merchant hashes from the mutations
        const merchantHashes = mutations.map(e => { 
            const { hex } = encodeMerchantHash({ 
                merchantId: e.merchant?.id, 
                merchantPk: e.merchant?.pubkey 
            })
            return hex;
        })

        // Filter UTXOs to only those matching the token category and merchant hashes
        const tokenCategory = reverseHex(this.contractCreationParams.authCategory)
        const utxosToMutate = utxos.filter(utxo => {
            if (utxo.token?.nft?.commitment) {
                const commitment = utxo.token?.nft?.commitment
                const { hash } = decodeCommitment(commitment)
                return utxo.token.category === tokenCategory && merchantHashes.includes(hash)
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

        // Prepare the BCH inputs
        const bchInputs = bchUtxos.map((input) => {
            const normalized = { 
                ...input, 
                satoshis: toBigInt(input.satoshis),
                txid: input.txid,
                vout: input.vout
            }
            return normalized
        })

        // Combine token and BCH inputs
        const combinedInputs = [...tokenInputs, ...bchInputs]

        if (outputs.length === 0) {
            throw new Error('No valid mutations to process. No outputs were generated.')
        }

        // Prepare the contract transaction from the combined inputs and outputs
        const tx = contract.functions.mutate(senderPk, senderSig)
            .from(combinedInputs)
            .to(outputs)
        
        let result

        try {
            // Build the transaction
            console.log('[mutate] Building transaction...')
            const txHex = await tx.build()
            
            if (broadcast) {
                result = await tx.send()
            } else {
                result = { success: true, txHex }
            }
        } catch (error) {
            throw error
        }

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
        const tokenAddr = convertCashAddressToTokenAddress(toAddress)

        const ownerSig = new SignatureTemplate(ownerWif)
        const ownerPk = binToHex(ownerSig.getPublicKey())
        const ownerPkh = pubkeyToPkHash(ownerPk)

        if (ownerPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Owner public key hash does not match the contract\'s owner public key hash')
        }

        const sweepResult = {}
        let utxos = await contract.getUtxos()
        let bchUtxos = utxos.filter(utxo => utxo.token == undefined)
        const tokenUtxos = utxos.filter(utxo => utxo.token !== undefined)

        if (tokenUtxos.length > 0) {
            const tokenOutputs = tokenUtxos.map(utxo => {
                return {
                    to: tokenAddr,
                    amount: utxo.satoshis,
                    token: utxo.token
                }
            })
            const inputs = [...tokenUtxos, ...bchUtxos]

            const tokenSweepTx = contract.functions.sweep(ownerPk, ownerSig)
                .from(inputs)
                .to(tokenOutputs)
            
            let tokenSweepResult
            if (broadcast) {
                console.log('[sweep] Broadcasting transaction')
                tokenSweepResult = await tokenSweepTx.send()
            } else {
                console.log('[sweep] Building transaction')
                tokenSweepResult = await tokenSweepTx.build()
            }

            sweepResult.cashtokens = tokenSweepResult
        }
        
        const hardcodedFee = TX_FEE

        // Refresh UTXOs after token sweep
        utxos = await contract.getUtxos()
        bchUtxos = utxos.filter(utxo => utxo.token == undefined)

        const balance = bchUtxos.reduce((acc, utxo) => acc + utxo.satoshis, 0n)
        if (balance <= BigInt(hardcodedFee)) {
            sweepResult.bch = { success: false, message: 'Insufficient BCH balance to sweep after fee.' }
            return sweepResult
        }

        const amountToSend = balance - BigInt(hardcodedFee)

        const outputs = [
            {
                to: toAddress,
                amount: amountToSend
            }
        ]

        const bchSweepTx = contract.functions
            .sweep(ownerPk, ownerSig)
            .withHardcodedFee(hardcodedFee)
            .from(bchUtxos)
            .to(outputs)        
        
        let bchSweepResult
        if (broadcast) {
            console.log('[sweep] Broadcasting transaction')
            bchSweepResult = await bchSweepTx.send()
        } else {
            console.log('[sweep] Building transaction')
            bchSweepResult = await bchSweepTx.build()
        }

        sweepResult.bch = bchSweepResult
        return sweepResult

    }

    /**
     * Broadcasts a raw transaction hex via Watchtower.
     * @param {string} txHex
     * @returns {Promise<Object>}
     */
    async broadcastTransaction(txHex) {
        console.log('[broadcastTransaction] Broadcasting transaction')
        const tx = await (new Watchtower().broadcastTx(txHex))
        return tx
    }
}
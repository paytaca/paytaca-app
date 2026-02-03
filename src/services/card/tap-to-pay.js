

import { Contract as MainnetContract } from '@mainnet-cash/contract';
import { SignatureTemplate, Contract } from 'cashscript0.11.x';
import { defaultNetwork, TX_FEE } from './constants.js';
import { binToHex } from '@bitauth/libauth';
import { convertCashAddressToTokenAddress, pubkeyToPkHash } from './utils.js';
import { decodeCommitment, encodeCommitment, encodeMerchantHash } from './auth-nft.js';

// import artifact from './contract/TapToPay.json';
import { compileString } from 'cashc0.11.x';
import source from './contract/TapToPay.cash';
const artifact = compileString(source);

import Watchtower from 'src/lib/watchtower/index.js';
import { Wallet } from 'mainnet-js';

function reverseHex(hex = '') {
  if (!hex) return hex;
  const pairs = hex.match(/.{1,2}/g);
  return pairs ? pairs.reverse().join('') : hex;
}

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

    get contractCreationParams () {
        return {
            ownerPkh: this.params.ownerPkh,
            backendPkh: this.params.backendPkh,
            authCategory: this.params.authCategory,
        };
    }

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

    async getUtxos () {
        const contract = this.getContract()
        return await contract.getUtxos();
    }

    async getTokenUtxos () {
        const utxos = await this.getUtxos();
        return utxos.filter(utxo => utxo.token !== undefined);
    }

    async getBchUtxos () {
        const utxos = await this.getUtxos();
        return utxos.filter(utxo => utxo.token === undefined);
    }

    /**
     * Mutates authorization NFTs held by this contract.
     *
     * Rewrites NFT commitments for the provided terminal mutations and
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

        console.log('utxosToMutate:', utxosToMutate)

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
            console.error('[mutate] Transaction error:', error.message)
            throw error
        }

        console.log('[mutate] Result:', result)
        return result
    }

    async sweep ({ ownerWif, toAddress, broadcast = false }) {
        console.log('[sweep] Sweeping to address:', toAddress)
        const contract = this.getContract()
        const tokenAddr = convertCashAddressToTokenAddress(toAddress)
        console.log('[sweep] Token address:', tokenAddr)
        
        const ownerSig = new SignatureTemplate(ownerWif)
        const ownerPk = binToHex(ownerSig.getPublicKey())
        const ownerPkh = pubkeyToPkHash(ownerPk)
        console.log('[sweep] Owner PKH:', ownerPkh)
        console.log('[sweep] ownerPk:', ownerPk)
        console.log('[sweep] ownerSig:', ownerSig)

        if (ownerPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Owner public key hash does not match the contract\'s owner public key hash')
        }

        const sweepResult = {}
        const utxos = await contract.getUtxos()

        console.log('[sweep] utxos:', utxos)

        const bchUtxos = utxos.filter(utxo => utxo.token == undefined)
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

            console.log('[sweep] Token inputs:', inputs)
            console.log('[sweep] Token outputs:', tokenOutputs)
            console.log('[sweep] contract:', contract)

            const tokenSweepTx = contract.functions.sweep(ownerPk, ownerSig)
                .from(inputs)
                .to(tokenOutputs)
            
            console.log('[sweep] tokenSweepTx:', tokenSweepTx)

            let tokenSweepResult
            if (broadcast) {
                console.log('[sweep] Broadcasting transaction')
                tokenSweepResult = await tokenSweepTx.send()
            } else {
                console.log('[sweep] Building transaction')
                tokenSweepResult = await tokenSweepTx.build()
            }

            console.log('[sweep] Token sweep result:', tokenSweepResult)
            sweepResult.cashtokens = tokenSweepResult
        }
        
        const hardcodedFee = TX_FEE
        const balance = bchUtxos.reduce((acc, utxo) => acc + utxo.satoshis, 0n)
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

        console.log('[sweep] BCH sweep result:', bchSweepResult)
        sweepResult.bch = bchSweepResult

        console.log('[sweep] Sweep result:', sweepResult)
        return sweepResult

    }

    async broadcastTransaction(txHex) {
        console.log('[broadcastTransaction] Broadcasting transaction')
        const tx = await (new Watchtower().broadcastTx(txHex))
        return tx
    }
}
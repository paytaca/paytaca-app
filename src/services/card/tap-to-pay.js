

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

export class TapToPay {
    constructor (contractId) {
        this.contractId = contractId;
        const contract = MainnetContract.fromId(contractId);
        console.log('Loaded contract:', contract);
        console.log('Contract parameters raw:', contract.parameters);
        const parameters = [];
        contract.parameters.forEach((param) => {
            parameters.push(Buffer(param).toString('hex'));
        })

        console.log('Contract parameters:', parameters);
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

    // - this function is used by the backend
    // - assumes that we have the terminal's signer details, but in prod 
    // we'd obtain the terminal signature through multisig means
    async spend ({ signers, recipient, broadcast = true }) {

        /** TODO: obtain through multisig */
        
        const terminalWif = signers?.terminalWif;
        const terminalSig = new SignatureTemplate(terminalWif)
        const terminalPk = binToHex(terminalSig.getPublicKey())

        /******** */
    
        const backendWif = signers?.backendWif
        const backendSig = new SignatureTemplate(backendWif)
        const backendPk = binToHex(backendSig.getPublicKey())
        const backendPkh = pubkeyToPkHash(backendPk)

        if (backendPkh !== this.contractCreationParams.backendPkh) {
            throw new Error('Invalid backend public key hash')
        }

        const contract = this.getContract();

        // find the auth token based on the terminal id
        const utxos = await contract.getUtxos()
        const bchUtxos = utxos.filter(utxo => utxo.token === undefined)
        console.log('utxos:', utxos)
        console.log('authCategory:', this.contractCreationParams.authCategory)

        const terminalHash = encodeMerchantHash({
            terminalId: recipient.terminalId,
            terminalPk: terminalPk
        })
        console.log('terminalHash:', terminalHash)

        const authNft = utxos.find(utxo => {
            if (utxo.token?.nft) {
                const commitment = utxo.token.nft.commitment
                const decodedCommitment = commitment ? decodeCommitment(commitment) : undefined
                console.log('decodedCommitment:', decodedCommitment)
                return utxo.token !== undefined &&
                    utxo.token.nft !== undefined &&
                    utxo.token.category === tokenCategory &&
                    terminalHash === decodedCommitment.hash
            } else {
                return false
            }
        })

        const encodedTerminalId = Buffer.from(recipient.terminalId.toString(), 'utf8');
        const unlocker = contract.unlock.spend(
            encodedTerminalId, 
            terminalSig, 
            terminalPk, 
            backendSig,
            backendPk
        )

        const outputs = [
            {
                to: convertCashAddressToTokenAddress(contract.address),
                amount: authNft.satoshis,
                token: authNft.token // auth token mustn't be mutated
            },
            {
                to: recipient.address,
                amount: recipient.amount
            }
            // change handled automatically
        ]

        const tx = contract.functions
            .spend(
                encodedTerminalId,
                terminalSig, 
                terminalPk, 
                backendSig, 
                backendPk
            )
            .from(authNft, unlocker) // present the NFT to use as authentication
            .from(bchUtxos, unlocker)
            .to(outputs)

        let result
        try {
            if (broadcast) {
                console.log('[spend] Broadcasting transaction')
                result = await tx.send()
            } else {
                result = await tx.build()
            }
            console.log(result)
        } catch (error) {
            console.error(error)
        }
        
        return result
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
        const tokenCategory = this.params.authCategory
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
        const merchantHashes = mutations.map(e => encodeMerchantHash({ 
            merchantId: e.merchant?.id, 
            merchantPk: e.merchant?.pubkey 
        }))

        // Filter UTXOs to only those matching the token category and merchant hashes
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
            const merchantHash = encodeMerchantHash({ 
                merchantId: mutation.merchant?.id, 
                merchantPk: mutation.merchant?.pubkey
            })
            
            // Find the utxos to mutate (matching the merchant hash)
            const mutxo = utxosToMutate.find(utxo => {
                const commitment = utxo.token?.nft?.commitment
                const { hash } = decodeCommitment(commitment)
                return merchantHash === hash
            })

            // Encode the new commitment
            const newCommitment = encodeCommitment({
                authorized: mutation.authorized,
                expirationBlock: mutation.expirationBlock,
                spendLimitSats: mutation.spendLimitSats,
                merchant: mutation.merchant
            })
            
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

    async sweep ({ senderWif, toAddress, broadcast = false }) {
        const contract = this.getContract()
        const tokenAddr = convertCashAddressToTokenAddress(toAddress, false)
        
        const senderSig = new SignatureTemplate(senderWif)
        const senderPk = binToHex(senderSig.getPublicKey())
        const senderPkh = pubkeyToPkHash(senderPk)

        if (senderPkh !== this.contractCreationParams.ownerPkh) {
            throw new Error('Sender public key hash does not mathc the owner public key hash')
        }

        const sweepResult = {}
        const utxos = await contract.getUtxos()

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
            const tokenSweepTx = contract.functions
                .sweep(senderPk, senderSig)
                .from(inputs, contract.unlock.sweep(senderPk, senderSig))
                .to(tokenOutputs)        
            
            let tokenSweepResult
            if (broadcast) {
                console.log('[sweep] Broadcasting transaction')
                tokenSweepResult = await tokenSweepTx.send()
            } else {
                tokenSweepResult = await tokenSweepTx.build()
            }

            console.log(tokenSweepResult)
            sweepResult.cashtokens = tokenSweepResult
        }
        
        const hardcodedFee = TX_FEE
        const balance = await contract.getBalance()
        const outputs = [
            {
                to: toAddress,
                amount: balance - hardcodedFee
            }
        ]

        const bchSweepTx = contract.functions
            .sweep(senderPk, senderSig)
            .withHardcodedFee(hardcodedFee)
            .to(outputs)        
        
        let bchSweepResult
        if (broadcast) {
            console.log('[sweep] Broadcasting transaction')
            bchSweepResult = await bchSweepTx.send()
        } else {
            bchSweepResult = await bchSweepTx.build()
        }

        console.log(bchSweepResult)
        sweepResult.bch = bchSweepResult
        return sweepResult

    }

    async broadcastTransaction(txHex) {
        console.log('[broadcastTransaction] Broadcasting transaction')
        const tx = await (new Watchtower().broadcastTx(txHex))
        return tx
    }
}
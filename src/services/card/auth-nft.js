

/**
 * Authentication Token Manager for Card Services
 * 
 * This module manages the creation, minting, issuance, mutation, and burning of authentication tokens
 * in the Paytaca card system. It provides functionality to:
 * - Generate genesis tokens with minting capabilities
 * - Mint NFT tokens with terminal-specific commitments (authorization, expiration, spend limits)
 * - Issue tokens to recipients with specific capabilities
 * - Mutate token commitments (update authorization, expiration, spend limits)
 * - Burn tokens associated with specific terminals
 * 
 * The module uses mainnet-js Wallet to interact with the Bitcoin Cash blockchain and employs
 * commitment encoding/decoding to embed terminal metadata (ID, public key, authorization state,
 * expiration block, and spend limit) into token commitments for validation and access control.
 * 
 */

import { createHash } from 'crypto';
import { NFTCapability, TokenMintRequest, TokenSendRequest, Wallet } from 'mainnet-js';
import { defaultSpendLimitSats, minTokenValue } from './constants';

class AuthNftService {
    constructor(wif) {
        this.wif = wif;
        this.wallet = null;
    }

    async initWallet() {
        this.wallet = await Wallet.fromWIF(this.wif);
    }

    async getTokenUtxos(tokenId) {
        if (!this.wallet) {
            await this.initWallet();
        }

        const utxos = await this.wallet.getTokenUtxos(tokenId);
        return utxos;
    }

    async getMutableTokens(tokenId) {
        if (!this.wallet) {
            await this.initWallet();
        }

        const utxos = await this.wallet.getTokenUtxos(tokenId);
        return utxos.filter(utxo => utxo.token.capability === 'mutable')
    }

    async getBalance() {
        if (!this.wallet) {
            await this.initWallet();
        }

        const balance = await this.wallet.getBalance();
        return balance;
    }

    /**
     * Mint a token with minting capability
     * @returns {Promise} API response with created genesis token
     */
    async genesis() {
        if (!this.wallet) {
            await this.initWallet();
        }

        // Create a genesis token
        const response = await this.wallet.tokenGenesis({
            amount: 0n,
            commitment: '',
            capability: NFTCapability.minting,
            value: minTokenValue,
        });
        console.log(response);
        return response;
    }

    async mint({ tokenId, merchants }) {
        if (!this.wallet) {
            await this.initWallet();
        }

        const tokenMintRequests = [];
        for (let i = 0; i < merchants.length; i++) {
            const merchant = merchants[i]
            const commitmentData = {
                authorized: merchant.authorized !== undefined ? merchant.authorized : true,
                spendLimitSats: merchant.spendLimitSats || defaultSpendLimitSats,
            }

            if (merchant.id && merchant.pubkey) {
                commitmentData.merchant = {
                    id: merchant.id,
                    pubkey: merchant.pubkey
                }
            }

            const commitment = encodeCommitment(commitmentData)
            tokenMintRequests.push(new TokenMintRequest({
                cashaddr: this.wallet.cashaddr,
                capability: NFTCapability.mutable,
                commitment: commitment,
                value: minTokenValue
            }));
        }
        const response = await this.wallet.tokenMint(
            tokenId,
            tokenMintRequests,
            false
        );
        console.log(response);
        return response;
    }

    async issue({ recipients }) {
        if (!this.wallet) {
            await this.initWallet();
        }

        const sendRequests = [];
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];

            const data = {
                cashaddr: recipient.address,
                tokenId: recipient.tokenId,
                capability: recipient.capability,
                commitment: recipient.commitment,
                amount: recipient.amount
            };

            sendRequests.push(new TokenSendRequest(data));
        }
        const result = await this.wallet.send(sendRequests);
        console.log(result);
        return result;
    }

    // async mutate({ tokenId, mutations }) {
    //     if (!this.wallet) {
    //         await this.initWallet();
    //     }

    //     const recipients = mutations.map(m => {
    //         const newCommitment = encodeCommitment({
    //             authorized: m.authorized,
    //             expirationBlock: m.expirationBlock,
    //             spendLimitSats: m.spendLimitSats,
    //             terminal: {
    //                 id: m.id,
    //                 pk: m.pubkey
    //             }
    //         })
    //         console.log('newCommitment:', newCommitment)
    //         return {
    //             address: this.wallet.cashaddr,
    //             tokenId: tokenId,
    //             capability: NFTCapability.mutable,
    //             commitment: newCommitment
    //         }
    //     })
    //     console.log('mutating: ', recipients)
    //     await this.issue({ recipients })
    // }

    // async burn ({ tokenId, terminals }) {
    //     if (!this.wallet) {
    //         await this.initWallet();
    //     }

    //     if (terminals.length === 0) return
    //     const merchantHashes = terminals.map(terminal => 
    //         encodeMerchantHash({
    //             merchantId: terminal.id,
    //             merchantPk: terminal.pubkey
    //         })
    //     )
    //     console.log('merchantHashes:', merchantHashes)
    //     const utxos = await this.wallet.getTokenUtxos(tokenId)
    //     console.log(utxos)
    //     const utxosToBurn = utxos.filter(utxo => {
    //         const commitment = decodeCommitment(utxo.token.commitment)
    //         return utxo.token.capability === NFTCapability.mutable &&
    //                 merchantHashes.includes(commitment.hash)
    //     })
    //     console.log('utxosToBurn:', utxosToBurn)
    //     for(let i = 0; i < utxosToBurn.length; i++) {
    //         const element = utxosToBurn[i]
    //         const burnResponse = await this.wallet.tokenBurn({
    //             tokenId: tokenId, 
    //             amount: element.amount,
    //             capability: element.token.capability,
    //             commitment: element.token.commitment
    //         }, "burn")
    //         console.log(burnResponse)
    //     }
    // }
    
}

function encodeMerchantHash({ merchantId, merchantPk }) {
    if (!merchantId || !merchantPk) {
        throw new Error('missing required merchantId or merchantPk')
    }
    
    const merchantIdBuf = Buffer.from(merchantId.toString(), 'utf-8')
    const merchantPkBuf = Buffer.from(merchantPk, 'hex')
    const concat = Buffer.concat([merchantIdBuf, merchantPkBuf])

    const fullHash = createHash('sha256').update(concat).digest(); // Buffer(32)
    const truncatedHash = fullHash.subarray(0, 27)
    const truncatedHashHex = truncatedHash.toString('hex')
    return truncatedHashHex
}

function encodeCommitment({ authorized, merchant, spendLimitSats }) {
    if (!spendLimitSats) throw new Error ('missing required spend limit')

    // authorized
    const authorizedBuf = Buffer.from([authorized ? 0x01 : 0x00]); // 1 byte

    // spend limit
    const spendLimitBuf = Buffer.alloc(8);
    spendLimitBuf.writeBigInt64LE(BigInt(spendLimitSats)); // 8 bytes

    let commitmentData = [authorizedBuf, spendLimitBuf]

    // terminal hash
    if (merchant) {
        const terminalIdBuf = Buffer.from((merchant.id).toString(), 'utf-8')
        const terminalPkBuf = Buffer.from(merchant.pubkey, 'hex')
        const concat = Buffer.concat([terminalIdBuf, terminalPkBuf])
        const fullHash = createHash('sha256').update(concat).digest(); // Buffer(32)
        const truncatedHash = fullHash.subarray(0, 27)
        commitmentData.push(truncatedHash);
    }

    // structure: authorized + spendLimit + hash
    const commitment = Buffer.concat(commitmentData);

    return commitment.toString('hex'); 
}

function decodeCommitment(hex) {
    const buf = Buffer.from(hex, 'hex');
    return {
        authorized: buf[0] === 1,
        spendLimitSats: buf.readBigUInt64LE(5),
        hash: buf.subarray(13, buf.length).toString('hex')
    };
}

export { encodeMerchantHash, encodeCommitment, decodeCommitment };

export default AuthNftService;
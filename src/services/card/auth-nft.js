

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

    static async initializeWithWallet(wif) {
        const service = new AuthNftService(wif);
        service.wallet = await Wallet.fromWIF(wif);
        return service;
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

    async mint({ tokenId, merchants, options }) {
        if (!this.wallet) {
            await this.initWallet();
        }

        console.log(this.wallet.cashaddr)
        const walletUtxos = await this.wallet.getUtxos()
        const filteredUtxos = walletUtxos.filter(u => !u.token)
        console.log('filteredUtxos:', filteredUtxos);

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
            false,
            options
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

    async mutate({ tokenId, mutations }) {
        if (!this.wallet) {
            await this.initWallet();
        }

        const recipients = mutations.map(m => {
            const newCommitment = encodeCommitment({
                authorized: m.authorized,
                expirationBlock: m.expirationBlock,
                spendLimitSats: m.spendLimitSats,
                terminal: {
                    id: m.id,
                    pk: m.pubkey
                }
            })
            console.log('newCommitment:', newCommitment)
            return {
                address: this.wallet.cashaddr,
                tokenId: tokenId,
                capability: NFTCapability.mutable,
                commitment: newCommitment
            }
        })
        console.log('mutating: ', recipients)
        await this.issue({ recipients })
    }

    async burn ({ tokenId, merchants, options = { all: false } }) {
        console.log('burn called with tokenId:', tokenId, 'merchants:', merchants);
        if (!this.wallet) {
            await this.initWallet();
        }

        let merchantHashes = [];
        if (merchants.length > 0) {
            merchantHashes = merchants.map(merchant => {
                
                const { hex: merchantHash } = encodeMerchantHash({
                    merchantId: merchant.id,
                    merchantPk: merchant.pubkey
                });
                console.log('hex;', merchantHash);
                return merchantHash;
            })
        } 
        
        if (merchantHashes.length === 0 || options.all) {
            merchantHashes.push(undefined); // Burns global auth tokens without merchant hash
        }

        console.log('merchantHashes:', merchantHashes)
        const utxos = await this.wallet.getTokenUtxos(tokenId)
        const mutableUtxos = utxos.filter(utxo => utxo.token.capability === NFTCapability.mutable);
        console.log('mutableUtxos:', mutableUtxos)

        const utxosToBurn = mutableUtxos.filter(utxo => {
            console.log('Checking utxo:', utxo)
            const commitment = decodeCommitment(utxo.token.commitment)
            console.log('Decoded commitment:', commitment)
            return utxo.token.capability === NFTCapability.mutable &&
                    merchantHashes.includes(commitment.hash)
        })
        
        console.log('utxosToBurn:', utxosToBurn)
        const burnResponses = [];
        for(let i = 0; i < utxosToBurn.length; i++) {
            const element = utxosToBurn[i]
            const burnResponse = await this.wallet.tokenBurn({
                tokenId: tokenId, 
                amount: element.amount,
                capability: element.token.capability,
                commitment: element.token.commitment
            }, "burn")
            console.log(burnResponse)
            burnResponses.push(burnResponse);
        }
        return burnResponses;
    }
    
}

function encodeMerchantHash({ merchantId, merchantPk }) {
    if (!merchantId || !merchantPk) {
        return { buf: null, hex: '' };
    }
    
    const merchantIdBuf = Buffer.from(merchantId.toString(), 'utf-8')
    const merchantPkBuf = Buffer.from(merchantPk, 'hex')
    const concat = Buffer.concat([merchantIdBuf, merchantPkBuf])

    const fullHash = createHash('sha256').update(concat).digest(); // Buffer(32)
    const truncatedHashBuf = fullHash.subarray(0, 31) // 31 bytes
    const truncatedHashHex = truncatedHashBuf.toString('hex')
    return { buf: truncatedHashBuf, hex: truncatedHashHex };
}

function encodeCommitment({ authorized, merchant, spendLimitSats }) {
    if (!spendLimitSats) throw new Error ('missing required spend limit')

    // authorized
    const authorizedBuf = Buffer.from([authorized ? 0x01 : 0x00]); // 1 byte

    // spend limit
    const spendLimitBuf = Buffer.alloc(8);
    spendLimitBuf.writeBigInt64LE(BigInt(spendLimitSats)); // 8 bytes

    let commitmentData = [authorizedBuf, spendLimitBuf]

    // merchant hash
    if (merchant) {
        const { buf: truncatedHashBuf } = encodeMerchantHash({ merchantId: merchant.id, merchantPk: merchant.pubkey }); // 31 bytes
        commitmentData.push(truncatedHashBuf);
    }

    // commitment (40 bytes): authorized (1 byte) + spendLimit (8 bytes) + merchantHash (31 bytes)
    const commitment = Buffer.concat(commitmentData);

    return commitment.toString('hex'); 
}

function decodeCommitment(hex) {
    if (hex.length === 0) return null;
    const buf = Buffer.from(hex, 'hex');
    return {
        authorized: buf[0] === 1,
        spendLimitSats: buf.readBigUInt64LE(1),
        hash: buf.length > 9 ? buf.subarray(9, buf.length).toString('hex') : ''
    };
}

export { encodeMerchantHash, encodeCommitment, decodeCommitment };

export default AuthNftService;
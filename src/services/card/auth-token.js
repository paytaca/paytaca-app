

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
 * @requires crypto - For SHA256 hashing of terminal data
 * @requires mainnet-js - For blockchain wallet operations and token management
 */

import { createHash } from 'crypto';
import { NFTCapability, TokenMintRequest, TokenSendRequest, Wallet } from 'mainnet-js';
import { defaultExpirationDeltaMinutes, defaultSpendLimitSats, minTokenValue } from './constants';
import { convertTimeToBlock } from './utils';

class AuthTokenManager {
    constructor(wif) {
        this.wif = wif;
        this.wallet = null;
    }

    async defaultExpirationBlock() {
        const expirationDate = Math.floor(Date.now()/1000) + (defaultExpirationDeltaMinutes * 60); // 30 days from now
        const expirationBlock = await convertTimeToBlock(expirationDate)
        return expirationBlock
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

    async getBalance() {
        if (!this.wallet) {
            await this.initWallet();
        }

        const balance = await this.wallet.getBalance();
        return balance;
    }

    /**
     * Mint a genesis token with minting capability
     * @returns {Promise} API response with created genesis token
     */
    async genesis() {
        if (!this.wallet) {
            await this.initWallet();
        }

        // Create a genesis token with minting capability
        const response = await this.wallet.tokenGenesis({
            amount: 0n,
            commitment: '',
            capability: NFTCapability.minting,
            value: minTokenValue,
        });
        console.log(response);
        return response;
    }

    async mint({ tokenId, terminals }) {
        if (!this.wallet) {
            await this.initWallet();
        }

        // TODO: prevent minting tokens with same terminal id?
        const tokenMintRequests = [];
        for (let i = 0; i < terminals.length; i++) {
            const terminal = terminals[i]
            const commitmentData = {
                authorized: terminal.authorized || true,
                expirationBlock: terminal.expirationBlock || await this.defaultExpirationBlock(),
                spendLimitSats: terminal.spendLimitSats || defaultSpendLimitSats,
                terminal: {
                    id: terminal.id,
                    pk: terminal.pubkey
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
            console.log('>>>recipient:', recipient)
            const data = {
                cashaddr: recipient.address,
                tokenId: recipient.tokenId,
                capability: recipient.capability,
                commitment: recipient.commitment,
                amount: recipient.amount
            };

            console.log('>>>data:', data)
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

    async burn ({ tokenId, terminals }) {
        if (!this.wallet) {
            await this.initWallet();
        }

        if (terminals.length === 0) return
        const terminalHashes = terminals.map(terminal => 
            encodeTerminalHash({
                terminalId: terminal.id,
                terminalPk: terminal.pubkey
            })
        )
        console.log('terminalHashes:', terminalHashes)
        const utxos = await this.wallet.getTokenUtxos(tokenId)
        console.log(utxos)
        const utxosToBurn = utxos.filter(utxo => {
            const commitment = decodeCommitment(utxo.token.commitment)
            return utxo.token.capability === NFTCapability.mutable &&
                    terminalHashes.includes(commitment.hash)
        })
        console.log('utxosToBurn:', utxosToBurn)
        for(let i = 0; i < utxosToBurn.length; i++) {
            const element = utxosToBurn[i]
            const burnResponse = await this.wallet.tokenBurn({
                tokenId: tokenId, 
                amount: element.amount,
                capability: element.token.capability,
                commitment: element.token.commitment
            }, "burn")
            console.log(burnResponse)
        }
    }
}

function encodeTerminalHash({ terminalId, terminalPk }) {
    const terminalIdBuf = Buffer.from(terminalId, 'utf-8')
    const terminalPkBuf = Buffer.from(terminalPk, 'hex')
    const concat = Buffer.concat([terminalIdBuf, terminalPkBuf])

    const fullHash = createHash('sha256').update(concat).digest(); // Buffer(32)
    const truncatedHash = fullHash.subarray(0, 27)
    const truncatedHashHex = truncatedHash.toString('hex')
    return truncatedHashHex
}

function encodeCommitment({ authorized, terminal, expirationBlock, spendLimitSats }) {
    if (!terminal) throw new Error('missing required terminal')
    if (!expirationBlock) throw new Error('missing required expiration block')
    if (!spendLimitSats) throw new Error ('missing required spend limit')

    // authorized
    const authorizedBuf = Buffer.from([authorized ? 0x01 : 0x00]);

    // expiration
    const expirationBuf = Buffer.alloc(4);
    expirationBuf.writeUInt32LE(expirationBlock);

    // spend limit
    const spendLimitBuf = Buffer.alloc(8);
    spendLimitBuf.writeBigInt64LE(BigInt(spendLimitSats)); // 8 bytes

    // terminal hash
    const terminalIdBuf = Buffer.from(terminal.id, 'utf-8')
    const terminalPkBuf = Buffer.from(terminal.pk, 'hex')
    const concat = Buffer.concat([terminalIdBuf, terminalPkBuf])
    const fullHash = createHash('sha256').update(concat).digest(); // Buffer(32)
    const truncatedHash = fullHash.subarray(0, 27)

    // structure: authorized + expirationBlock + spendLimit + hash
    const commitment = Buffer.concat([authorizedBuf, expirationBuf, spendLimitBuf, truncatedHash]);
    return commitment.toString('hex'); 
}

function decodeCommitment(hex) {
    const buf = Buffer.from(hex, 'hex');
    return {
        authorized: buf[0] === 1,
        expirationBlock: buf.readUInt32LE(1),
        spendLimitSats: buf.readBigUInt64LE(5),
        hash: buf.subarray(13, buf.length).toString('hex')
    };
}

export { encodeTerminalHash, encodeCommitment, decodeCommitment };

export default AuthTokenManager;
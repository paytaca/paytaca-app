
import { createHash } from 'crypto';
import { NFTCapability, TokenMintRequest, TokenSendRequest, Wallet } from 'mainnet-js';
import { defaultSpendLimitSats, minTokenValue } from './constants';

/**
 * Service wrapper for issuing and managing authorization NFTs using mainnet-js.
 *
 * Provides helpers to initialize a wallet, mint/issue/mutate/burn NFTs, and
 * query balances and token UTXOs for a given token category.
 */
class AuthNftService {

    /**
     * Creates a service instance and initializes a wallet from WIF.
     * @param {string} wif
     * @returns {Promise<AuthNftService>}
     */
    static async initializeWithWallet(wif) {
        const service = new AuthNftService(wif);
        service.wallet = await Wallet.fromWIF(wif);
        return service;
    }

    /**
     * Ensures a wallet instance is available.
     * @private
     * @throws {Error} When wallet is not initialized.
     */
    _assertWallet() {
        if (!this.wallet) {
            throw new Error('Wallet not initialized. Call initWallet() first.');
        }
    }

    /**
     * Fetches token UTXOs for a token category.
     * @param {string} tokenId
     * @returns {Promise<Array>}
     */
    async getTokenUtxos(tokenId) {
        this._assertWallet();
        const utxos = await this.wallet.getTokenUtxos(tokenId);
        return utxos;
    }

    /**
     * Fetches mutable token UTXOs for a token category.
     * @param {string} tokenId
     * @returns {Promise<Array>}
     */
    async getMutableTokens(tokenId) {
        this._assertWallet();
        const utxos = await this.wallet.getTokenUtxos(tokenId);
        return utxos.filter(utxo => utxo.token.capability === 'mutable')
    }

    /**
     * Returns the wallet BCH balance.
     * @returns {Promise<Object>}
     */
    async getBalance() {
        this._assertWallet();
        const balance = await this.wallet.getBalance();
        return balance;
    }

    /**
     * Mints a genesis token with minting capability.
     * @returns {Promise<Object>} API response with created genesis token
     */
    async genesis() {
        this._assertWallet();

        // Create a genesis token
        const response = await this.wallet.tokenGenesis({
            amount: 0n,
            commitment: '',
            capability: NFTCapability.minting,
            value: minTokenValue,
        });

        return response;
    }

    /**
     * Mints mutable authorization NFTs for the provided merchants.
     * @param {Object} params
     * @param {string} params.tokenId
     * @param {Array<Object>} params.merchants
     * @param {Object} [params.options]
     * @returns {Promise<Object>}
     */
    async mint({ tokenId, merchants, options }) {
        this._assertWallet();

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

    /**
     * Issues token send requests to recipients.
     * @param {Object} params
     * @param {Array<Object>} params.recipients
     * @returns {Promise<Object>}
     */
    async issue({ recipients }) {
        this._assertWallet();

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

    /**
     * Rewrites commitments for mutable NFTs by re-issuing them to the wallet.
     * @param {Object} params
     * @param {string} params.tokenId
     * @param {Array<Object>} params.mutations
     * @returns {Promise<void>}
     */
    async mutate({ tokenId, mutations }) {
        this._assertWallet();

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
            return {
                address: this.wallet.cashaddr,
                tokenId: tokenId,
                capability: NFTCapability.mutable,
                commitment: newCommitment
            }
        })
        await this.issue({ recipients })
    }

    /**
     * Burns mutable authorization NFTs for global auth, specific merchants, or all.
     *
     * If `merchants` is empty or `options.all` is true, a blank merchant hash
     * (`""`) is added to target the global auth token.
     *
     * @param {Object} params
     * @param {string} params.tokenId
     * @param {Array<Object>} params.merchants
     * @param {{ all?: boolean }} [params.options]
     * @returns {Promise<Array>}
     */
    async burn ({ tokenId, merchants, options = { all: false } }) {
        this._assertWallet();

        let merchantHashes = [];
        if (merchants.length > 0) {
            merchantHashes = merchants.map(merchant => {
                
                const { hex: merchantHash } = encodeMerchantHash({
                    merchantId: merchant.id,
                    merchantPk: merchant.pubkey
                });
                return merchantHash;
            })
        } 
        
        if (merchantHashes.length === 0 || options.all) {
            merchantHashes.push(""); // Burns global auth tokens without merchant hash
        }

        const utxos = await this.wallet.getTokenUtxos(tokenId)
        const mutableUtxos = utxos.filter(utxo => utxo.token.capability === NFTCapability.mutable);

        const utxosToBurn = mutableUtxos.filter(utxo => {
            const commitment = decodeCommitment(utxo.token.commitment)
            return utxo.token.capability === NFTCapability.mutable &&
                    merchantHashes.includes(commitment.hash)
        })
        
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

/**
 * Encodes a merchant identifier into a truncated SHA-256 hash.
 * @param {Object} params
 * @param {string|number} params.merchantId
 * @param {string} params.merchantPk - Merchant public key (hex).
 * @returns {{ buf: Buffer|null, hex: string }}
 */
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

/**
 * Encodes authorization data into an NFT commitment (hex).
 * @param {Object} params
 * @param {boolean} params.authorized
 * @param {{ id: string|number, pubkey: string }} [params.merchant]
 * @param {string|number|bigint} params.spendLimitSats
 * @returns {string} Hex commitment.
 */
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

/**
 * Decodes an NFT commitment hex into its fields.
 * @param {string} hex
 * @returns {{ authorized: boolean, spendLimitSats: bigint, hash: string }|null}
 */
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
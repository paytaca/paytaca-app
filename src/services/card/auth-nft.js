
import { cardLogger } from 'src/utils/debug-logger.js'
import { createHash } from 'crypto';
import { NFTCapability, TokenMintRequest, TokenSendRequest, Wallet } from 'mainnet-js';
import { defaultSpendLimitSats, minTokenValue, DUST_LIMIT } from './constants';
import { loadWallet } from 'src/services/wallet.js';
import Watchtower from 'watchtower-cash-js'
import { ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } from 'cashscript';

const watchtower = new Watchtower()
const MINT_VALUE = 1000n;

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
        service.ctWallet = await Wallet.fromWIF(wif);
        service.wallet = await loadWallet();
        return service;
    }

    /**
     * Ensures a wallet instance is available.
     * @private
     * @throws {Error} When wallet is not initialized.
     */
    _assertWallet() {
        if (!this.wallet) {
            throw new Error('Wallet not initialized. Call initializeWithWallet() first.');
        }
    }

    /**
     * Fetches token UTXOs for a token category.
     * @param {string} tokenId
     * @returns {Promise<Array>}
     */
    async getTokenUtxos(tokenId, tokenAddress) {
        if (!tokenAddress) tokenAddress = this.wallet.tokenAddress();
        const utxos = await this.wallet.getTokenUtxos(tokenId, tokenAddress);
        return utxos;
    }

    /**
     * Fetches mutable token UTXOs for a token category.
     * @param {string} tokenId
     * @returns {Promise<Array>}
     */
    async getMutableTokens(tokenId, tokenAddress) {
        const utxos = await this.getTokenUtxos(tokenId, tokenAddress);
        return utxos.filter(utxo => utxo.token?.nft?.capability === 'mutable')
    }

    /**
     * Returns the wallet BCH balance.
     * @returns {Promise<Object>}
     */
    async getBalance() {
        this._assertWallet();
        const balance = await this.ctWallet.getBalance();
        return balance;
    }

    async genesis(opts = {broadcast: true}) {
        cardLogger.log('====== Minting Token ======')
    
        const genesisUtxo = await this.wallet.getOrCreateGenesisUtxo()
        const categoryId = genesisUtxo.txid
        const nftValue = 1000n // 10000 satoshis for each NFT output

        cardLogger.log('genesisUtxo:', genesisUtxo)
        
        const changeAddress = this.wallet.address()
        const estimatedFee = this.wallet.estimateFee({ numP2pkhInputs: 1, numOutputs: 1, feeRate: 2n })
        const change = genesisUtxo.satoshis - estimatedFee - nftValue
        const tokenAddress = this.wallet.tokenAddress()

        const outputs = []

        if (change > DUST_LIMIT) {
            outputs.push({
                to: changeAddress,
                amount: change,
            })
        }

        outputs.push({
            to: tokenAddress,
            amount: nftValue,
            token: {
                category: categoryId,
                amount: 0n,
                nft: {
                    capability: 'minting',
                    commitment: ''
                }
            }
        })

        const privateKey = this.wallet.privkey(genesisUtxo.address_path)
        const provider = new ElectrumNetworkProvider('mainnet')
        const sigTemplate = new SignatureTemplate(privateKey)

        const tx = new TransactionBuilder({ provider })
            .addInput(genesisUtxo, sigTemplate.unlockP2PKH())
            .addOutputs(outputs)
            
        let result
        try {
            // Build the transaction
            const txHex = tx.build()
            cardLogger.log('Built transaction hex:', txHex)

            if (opts?.broadcast) {
                const txResult = await watchtower.BCH.broadcastTransaction(txHex)
                cardLogger.log('Transaction broadcast result:', txResult.data)
                result = { 
                    success: txResult.data.success, 
                    txid: txResult.data.txid, 
                    category: categoryId 
                }
            } else {
                result = { success: true, txHex }
            }
        } catch (error) {
            throw error
        }

        return result
    }

    /**
     * Mints mutable authorization NFTs for the provided merchants.
     * @param {Object} params
     * @param {string} params.tokenId
     * @param {Array<Object>} params.merchants
     * @param {Object} [params.opts]
     * @returns {Promise<Object>}
     */
    async mint({ tokenId, merchants, opts = { broadcast: true } }) {
        this._assertWallet();

        const mintingTokenUtxoRespose = await this.wallet.getTokenUtxos(tokenId, null, { capability: NFTCapability.minting })
        if (!mintingTokenUtxoRespose || mintingTokenUtxoRespose.length === 0) {
            throw new Error(`No minting UTXO found for tokenId: ${tokenId}`);
        }

        const mintingTokenUtxo = mintingTokenUtxoRespose.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            satoshis: utxo.satoshis || utxo.value,
            token: {
                category: utxo.token.category,
                amount: 0n,
                nft: {
                    capability: utxo.token.nft.capability,
                    commitment: utxo.token.nft.commitment
                }
            }
        }));

        const txFee = this.wallet.estimateFee({ numP2pkhInputs: 2, numOutputs: merchants.length })
        const mintFee = (BigInt(merchants.length) * MINT_VALUE)
        const totalFee = txFee + mintFee
        const { cumulativeValue, groupedUtxos: groupedBchFundingInputs, changeAddress } = await this.wallet.getFundingUtxos(totalFee)

        cardLogger.log('cumulativeValue:', cumulativeValue)
        if (cumulativeValue < totalFee) {
            throw new Error(`Insufficient BCH funds to cover minting fee. Required: ${totalFee}, Available: ${cumulativeValue}`);
        }

        const change = cumulativeValue - totalFee

        // Only re-emit the first minting UTXO as output since only it is consumed as input.
        // Consuming multiple minting UTXOs in one transaction is not supported by this flow.
        const consumedMintingUtxo = mintingTokenUtxo[0]
        const outputs = [{
            to: this.wallet.tokenAddress(),
            amount: consumedMintingUtxo.satoshis || consumedMintingUtxo.value,
            token: {
                category: consumedMintingUtxo.token.category,
                amount: 0n,
                nft: {
                    capability: consumedMintingUtxo.token.nft.capability,
                    commitment: consumedMintingUtxo.token.nft.commitment
                }
            }
        }];

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
            outputs.push({
                to: this.wallet.tokenAddress(),
                amount: MINT_VALUE,
                token: {
                    category: tokenId,
                    amount: 0n,
                    nft: {
                        capability: NFTCapability.mutable,
                        commitment: commitment,
                    }
                }
            });
        }

        if (change > DUST_LIMIT) {
            outputs.push({
                to: changeAddress,
                amount: change,
            });
        }

        const provider = new ElectrumNetworkProvider('mainnet')
        const sigTemplate = new SignatureTemplate(this.wallet.privkey())
        const tx = new TransactionBuilder({ provider })
        
        tx.addInput(mintingTokenUtxo[0], sigTemplate.unlockP2PKH())
        groupedBchFundingInputs.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs(outputs)

        cardLogger.log('-------->>>>>>outputs:', outputs)

        const txHex = tx.build()
        cardLogger.log('Built mint transaction hex:', txHex)

        if (opts?.broadcast) {
            const txResult = await watchtower.BCH.broadcastTransaction(txHex)
            cardLogger.log('Mint transaction broadcast result:', txResult.data)
            return { 
                success: txResult.data.success, 
                txid: txResult.data.txid
            }
        } 
        return { success: true, txHex }
    }

    /**
     * Issues token send requests to recipients.
     * @param {Object} params
     * @param {Array<Object>} params.recipients
     * @returns {Promise<Object>}
     */
    async issue(tokenUtxos, toTokenAddress, opts = { broadcast: true }) {
        cardLogger.log('====== Sending Token ======')

        this._assertWallet();

        const estimatedFee = this.wallet.estimateFee({ numP2pkhInputs: 1, numOutputs: 1 + tokenUtxos.length, feeRate: 2n })
        const { cumulativeValue, groupedUtxos: groupedBchFundingInputs, changeAddress } = await this.wallet.getFundingUtxos(estimatedFee)

        if (cumulativeValue < estimatedFee) {
            throw new Error(`Insufficient BCH funds to cover transaction fee. Required: ${estimatedFee}, Available: ${cumulativeValue}`);
        }
        
        const change = cumulativeValue - estimatedFee 
        
        const inputTokenUtxos = tokenUtxos.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            satoshis: utxo.satoshis || utxo.value,
            token: {
                category: utxo.token.category,
                amount: utxo.token.amount,
                nft: {
                    capability: utxo.token.nft.capability,
                    commitment: utxo.token.nft.commitment
                }
            }
        }))

        const outputs = []
        for (const utxo of tokenUtxos) {
            outputs.push({
                to: toTokenAddress,
                amount: utxo.satoshis || utxo.value,
                token: {
                    category: utxo.token.category,
                    amount: utxo.token.amount,
                    nft: {
                        capability: utxo.token.nft.capability,
                        commitment: utxo.token.nft.commitment
                    }
                }
            })
        }

        if (change > DUST_LIMIT) {
            outputs.push({
                to: changeAddress,
                amount: change,
            })
        }

        const provider = new ElectrumNetworkProvider('mainnet')
        const sigTemplate = new SignatureTemplate(this.wallet.privkey())
        const tx = new TransactionBuilder({ provider })
        
        tx.addInputs(inputTokenUtxos, sigTemplate.unlockP2PKH())
        groupedBchFundingInputs.forEach(({ inputs, signatureTemplate }) => {
            tx.addInputs(inputs, signatureTemplate.unlockP2PKH())
        })
        tx.addOutputs(outputs)
            
        // Build the transaction
        const txHex = tx.build()
        cardLogger.log('Built transaction hex:', txHex)
        cardLogger.log('Broadcasting transaction...')

        if (opts?.broadcast) {
            const txResult = await watchtower.BCH.broadcastTransaction(txHex)
            cardLogger.log('Transaction broadcast result:', txResult.data)
            return { success: txResult.data.success, txid: txResult.data.txid }
        }

        return { success: true, txHex }
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
                address: this.ctWallet.cashaddr,
                tokenId: tokenId,
                capability: NFTCapability.mutable,
                commitment: newCommitment
            }
        })
        // await this.issue({ recipients })
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
            const burnResponse = await this.ctWallet.tokenBurn({
                tokenId: tokenId, 
                amount: element.amount,
                capability: element.token.capability,
                commitment: element.token.commitment
            }, "burn")
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
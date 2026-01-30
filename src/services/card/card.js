import AuthNftService, { encodeMerchantHash } from './auth-nft';
import { defaultSpendLimitSats, minTokenValue } from './constants';
import { TapToPay } from './tap-to-pay';
import { backend } from './backend';
import { backend as watchtowerBackend } from 'src/exchange/backend';
import { loadWallet } from '../wallet';
import { loadCardUser } from './auth';

export class Card {
  constructor(data) {
    this.raw = data;
  }

  set raw(data) {
    this._rawData = data;
  }

  get raw() {
    return this._rawData;
  }

  // ==================== FACTORIES ====================

  /**
   * Factory that ensures wallet is loaded before use
   * @param {Object} [data]
   * @returns {Promise<Card>}
   */
  static async createWithWallet(data) {
    const card = new Card(data);
    card.wallet = await loadWallet();
    return card;
  }

  /**
   * Factory that ensures wallet, AuthNftService, and TapToPay are initialized
   * @param {Object} [data]
   * @returns {Promise<Card>}
   */
  static async createInitialized(data) {
    const card = await Card.createWithWallet(data);
    card._initializeAuthNftService();
    card._initializeContract();
    return card;
  }

  // ==================== ASSERTIONS ====================

  /**
   * Throws if wallet is not initialized
   * @private
   * @returns {void}
   */
  _assertWallet() {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Use Card.createWithWallet() or set card.wallet before calling this method.');
    }
  }

  /**
   * Throws if TapToPay is not initialized
   * @private
   * @returns {void}
   */
  _assertContract() {
    if (!this.contract) {
      throw new Error('TapToPay not initialized. Ensure card has contract_id and call initializeContract() first.');
    }
  }

  /**
   * Throws if AuthNftService is not initialized
   * @private
   * @returns {void}
   */
  _assertAuthNftService() {
    if (!this.authNftService) {
      throw new Error('AuthNftService not initialized. Call initializeAuthNftService() first.');
    }
  }

  // ==================== INITIALIZERS ====================

  /**
   * Initializes AuthNftService instance
   * @private
   * @returns {void}
   */
  _initializeAuthNftService() {
    this._assertWallet();
    this.authNftService = new AuthNftService(this.wallet.privkey());
  }

  /**
   * Initializes TapToPay contract instance
   * @private
   * @returns {void}
   */
  _initializeContract() {
    if (!this.raw?.contract_id) return;
    this.contract = new TapToPay(this.raw.contract_id);
  }

  /**
   * Ensures the card user is authenticated
   * @private
   * @returns {Promise<void>}
   */
  async _ensureCardUserAuthenticated() {
    const user = await loadCardUser();
    console.log('Loaded Card User for authentication:', user);
  }

  // ==================== WORKFLOWS ====================

  /**
   * Complete card creation workflow
   * @returns {Promise<Card>}
   */
  async create() {
    console.log('Starting complete card creation workflow...');
    
    try {
      const genesisResult = await this._mintGenesisToken();
      const cardData = await this._createCardEntry();
      await this._ensureCardUserAuthenticated();

      this.raw = await this._saveGenesis(cardData.id, genesisResult);

      // Reinitialize contract now that we have contract_id
      this._initializeContract();

      await this._issueGlobalAuthToken();

      console.log('Card creation completed successfully');
      return this;
    } catch (error) {
      console.error('Error:', error);
      console.error('Card creation workflow failed:', error.response || error.message);
      throw error;
    }
  }

  // ==================== SERVER API ====================

  /**
   * Creates card entry on server
   * @private
   * @returns {Promise<Object>}
   */
  async _createCardEntry() {
    console.log('Creating card entry...');
    this._assertWallet();

    const data = {
      wallet_hash: this.wallet.walletHash,
      public_key: this.wallet.pubkey(),
      address_path: this.wallet.addressPath()
    };
    
    const response = await backend.post('/cards/', data);
    console.log('Card entry created:', response.data);
    return response.data;
  }

  /**
   * Saves genesis token id (category) to server
   * @private
   * @param {number} cardId
   * @param {Object} genesisResult
   * @returns {Promise<Object>}
   */
  async _saveGenesis(cardId, genesisResult) {
    if (!genesisResult.utxos || genesisResult.utxos.length === 0) {
      throw new Error('No UTXOs available from genesis result');
    }
    
    const nftData = genesisResult.utxos[0];
    const payload = {
      category: nftData.token?.tokenId,
    };

    const response = await backend.patch(`/cards/${cardId}/`, payload);
    return response.data;
  }

  /**
   * Gets auth NFTs associated with the card
   * @returns {Promise<Object>}
   */
  async getAuthNfts() {
    const response = await backend.get(`/auth-nfts/${this.raw.token_address}`);
    return response.data
  }

  /**
   * Gets the card's global auth NFT
   * @returns {Promise<Object>}
   */
  async getGlobalAuthNft() {
    const { global_auth_nft } = await this.getAuthNfts()
    return global_auth_nft
  }

  /**
   * Gets the card's merchant auth NFTs
   * @returns {Promise<Object>}
   */
  async getMerchantAuthNft() {
    const { merchant_auth_nft } = await this.getAuthNfts()
    return merchant_auth_nft
  }

  async getMerchantList() {
    const response = await watchtowerBackend.get('/paytacapos/merchants/');
    return response.data;
  } 

  async spend({ amountSats, merchantId }) {
    const response = await backend.post(`/cards/${this.raw.cash_address}/spend/`, {
      amount_sats: amountSats,
      merchant_id: merchantId
    });
    console.log('Payment response:', response.data);
    return response.data;
  }

  // ==================== AUTH NFT OPERATIONS ====================

  /**
   * Mints genesis token, creates vout=0 UTXO if needed
   * @private
   * @returns {Promise<{tokenId: string, utxos: Array}>}
   */
  async _mintGenesisToken() {
    console.log('Starting genesis token minting...');
    this._assertAuthNftService();
    
    // Check existing vout=0 UTXOs and calculate needed amount
    const requiredSats = this.estimateGenesisSatsRequirement();
    const existingSats = await this._checkForVoutZeroUtxos();
    
    if (existingSats < requiredSats) {
      const neededSats = requiredSats - existingSats;
      console.log(`Need ${neededSats} more sats (have ${existingSats}, need ${requiredSats})`);
      await this._createVoutZeroTransaction(neededSats);
      await this._waitForTransaction();
    } else {
      console.log(`Sufficient vout=0 UTXOs available: ${existingSats} sats`);
    }

    try {
      const result = await this.authNftService.genesis();
      console.log('Genesis result:', result);
      
      if (result && result.tokenIds && result.tokenIds[0]) {
        const tokenId = result.tokenIds[0];
        const utxos = await this.authNftService.getTokenUtxos(tokenId);
        
        return { tokenId, utxos };
      }
      
      throw new Error('No token ID returned from genesis');
      
    } catch (error) {
      if (this._isVoutZeroError(error)) {
        console.error('Still getting vout=0 error after ensuring UTXO exists');
        console.error('Possible causes: UTXO not confirmed, wallet sync issues');
      }
      throw error;
    }
  }

  /** 
   * Complete workflow to issue global and merchant auth tokens
   * @private
   * @returns {Promise<void>}
   */
  async _issueGlobalAuthToken() {
    await this._mintGlobalAuthToken();
    await this._issueAuthTokens();
  }

  /**
   * Mints global auth token for card
   * @private
   * @returns {Promise<Object>}
   */
  async _mintGlobalAuthToken({ authorized = true, spendLimitSats } = {}) {
    console.log('Minting global auth token...');
    this._assertAuthNftService();

    const result = await this.authNftService.mint({ 
        tokenId: this.raw?.category, 
        merchants: [{
          authorized: authorized,
          spendLimitSats: spendLimitSats || defaultSpendLimitSats,
        }]
    });
    console.log('Global auth token minted:', result);
    return result;
  }

  /**
   * Mints and issues merchant auth token for specific merchant
   * @param {Object} options
   * @param {boolean} [options.authorized=true] - Whether to authorize the merchant
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis (Optional, defaults to 1 BCH)
   * @param {Object} options.merchant - Merchant info
   * @param {string} options.merchant.id - Merchant ID
   * @param {string} options.merchant.pubkey - Merchant public key
   * @returns {Promise<{mintResult: Object, issueResult: Object}>}
   */
  async issueMerchantAuthToken({ authorized = true, spendLimitSats, merchant } = {}) {
    
    if (!merchant?.id || !merchant?.pubkey) {
      throw new Error('Merchant id and pubkey are required to issue merchant auth token');
    }

    // Guard against minting a duplicate auth token for the same merchant.
    const { merchant_auth_nfts: merchantAuthNfts = [] } = await this.getAuthNfts();
    const merchantHash = encodeMerchantHash({ merchantId: merchant.id, merchantPk: merchant.pubkey });
    const hasExistingToken = merchantAuthNfts.some(
      token => token?.commitment?.decoded?.hash === merchantHash
    );

    if (hasExistingToken) {
      throw new Error('Merchant auth token with matching commitment already exists.');
    }

    const mintResult = await this._mintMerchantAuthToken({ authorized, spendLimitSats, merchant });
    const issueResult = await this._issueAuthTokens();
    return { mintResult, issueResult };
  }

  /**
   *  Mints merchant auth token for specific merchant
   * @private
   * @param {Object} options
   * @param {boolean} [options.authorized=true] - Whether to authorize the merchant
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis (Optional, defaults to 1 BCH)
   * @param {Object} options.merchant - Merchant info
   * @param {string} options.merchant.id - Merchant ID
   * @param {string} options.merchant.pubkey - Merchant public key
   * @returns {Promise<Object>}
   * TODO: Needs testing!
   */
  async _mintMerchantAuthToken({ authorized = true, spendLimitSats, merchant } = {}) {
    console.log('Minting merchant auth token...');
    this._assertAuthNftService();

    if (!merchant || !merchant.id || !merchant.pubkey) {
      throw new Error('Merchant id and pubkey are required to mint merchant auth token');
    }

    const result = await this.authNftService.mint({ 
        tokenId: this.raw?.category, 
        merchants: [{
          id: merchant.id,
          pubkey: merchant.pubkey,
          authorized: authorized,
          spendLimitSats: spendLimitSats || defaultSpendLimitSats,
        }]
    });
    console.log('Merchant auth token minted:', result);
    return result;
  }

  /**
   * Issues all auth tokens to card's token address
   * @returns {Promise<Object>}
   */
  async _issueAuthTokens() {
    this._assertAuthNftService();

    const toAddress = this.raw.token_address;
    console.log('Issuing global auth token to address:', toAddress);
    const tokenId = this.raw.category;
    const authNfts = await this.authNftService.getMutableTokens(tokenId);
    console.log('Auth NFTs to be issued:', authNfts);

    const recipients = []
    authNfts.forEach(nft => {
      recipients.push({
        address: toAddress,
        tokenId: tokenId,
        capability: nft.token.capability,
        commitment: nft.token.commitment,
        amount: nft.token.amount,
        value: nft.satoshis
      });
    }); 
    console.log('Issuing to recipients:', recipients);
    const result = await this.authNftService.issue({recipients});
    console.log('Auth tokens issued:', result);
    return result;
  }

  // ==================== CONTRACT OPERATIONS ====================

  /**
   * Gets token UTXOs for card token address
   * @returns {Promise<Array>}
   */
  async getTokenUtxos() {
    this._assertContract();
    return await this.contract.getTokenUtxos();
  }

  /**
   * Gets BCH UTXOs for card address
   * @returns {Promise<Object>}
   */
  async getBchUtxos() {
    this._assertContract();
    return await this.contract.getBchUtxos();
  }

  /**
   * Gets the TapToPay contract instance
   * @returns {Promise<Object>}
   */
  async getContract(){
    this._assertContract();
    const contract = this.contract.getContract()
    return contract
  }

  /**
   * Mutates the global auth token commitment
   * @param {Object} options
   * @param {boolean} [options.authorize=true] - Whether to authorize the terminal
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async mutateGlobalAuthToken({ authorize = true, spendLimitSats, broadcast = true }) {
    this._assertContract();
    this._assertWallet();

    try {

      // Prepare mutation data, leaving out merchant info so mutate function knows 
      // that we are mutating the global auth token
      const mutations = [{
        authorized: authorize,
        spendLimitSats: spendLimitSats, // (Optional, can omit if not changing)
      }]

      console.log('Mutating global auth token commitment:', mutations);
      
      const privateKey = this.wallet.privkey();
      const mutateResponse = await this.contract.mutate({
        senderWif: privateKey,
        mutations,
        broadcast
      });

      return  mutateResponse;
    } catch (error) { 
      console.error('Mutation failed:', error);
      throw error;
    }
  }

  /**
   * Mutates the merchant auth token commitment
   * @param {Object} options
   * @param {boolean} [options.authorize=true] - Whether to authorize the merchant
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis
   * @param {Object} options.merchant - Merchant info
   * @param {string} options.merchant.id - Merchant ID
   * @param {string} options.merchant.pubkey - Merchant public key
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async mutateMerchantAuthToken({ authorize = true, spendLimitSats, merchant, broadcast = true }) {
    this._assertContract();
    this._assertWallet();

    if (!merchant || !merchant.id || !merchant.pubkey) {
      throw new Error('Merchant id and pubkey are required to mutate merchant auth token');
    }

    try {

      // Prepare mutation data including merchant info
      const mutations = [{
        merchant: {
          id: merchant.id,
          pubkey: merchant.pubkey
        },
        authorized: authorize,
        spendLimitSats: spendLimitSats,
      }]

      console.log('Mutating merchant auth token commitment:', mutations);
      
      const privateKey = this.wallet.privkey();
      const mutateResponse = await this.contract.mutate({
        senderWif: privateKey,
        mutations,
        broadcast
      });

      return  mutateResponse;
    } catch (error) { 
      console.error('Mutation failed:', error);
      throw error;
    }
  }

  // ==================== UTXO MANAGEMENT ====================

  /**
   * Checks for available vout=0 UTXOs and returns total satoshis
   * @returns {Promise<number>} Total satoshis available in vout=0 UTXOs
   */
  async _checkForVoutZeroUtxos() {
    try {
      console.log('Checking for existing vout=0 UTXOs...');
      this._assertWallet();
      
      const resp = await this.wallet.getBchUtxos()
      console.log('UTXO response:', resp);
      const utxos = resp.utxos || [];
      const voutZeroUtxos = utxos.filter(utxo => utxo.tx_pos === 0);
      
      const totalSats = voutZeroUtxos.reduce((sum, utxo) => sum + utxo.value, 0n);
      console.log(`Found ${voutZeroUtxos.length} existing vout=0 UTXOs with total ${totalSats} sats`);
      return totalSats;
      
    } catch (error) {
      console.warn('Could not check existing UTXOs:', error.message);
      return 0;
    }
  }

  /**
   * Creates vout=0 UTXO by sending BCH to self
   * @param {number} [amount] - Amount in satoshis to send (defaults to full estimated requirement)
   * @returns {Promise<Object>}
   */
  async _createVoutZeroTransaction(amount) {
    this._assertWallet();
    console.log('Creating vout=0 transaction...');
    console.log('Genesis tokens require a UTXO with output index 0 (vout=0)');
    
    const wallet = await this.wallet.getRawWallet();
    const receivingAddress = (await wallet.getAddressSetAt(0)).receiving;
    
    // Use provided amount or estimate full requirement
    const satsToSend = amount || this.estimateGenesisSatsRequirement();
    const bchAmount = Number(satsToSend) / 1e8;
    
    console.log(`Sending ${satsToSend} sats (${bchAmount} BCH) to address:`, receivingAddress);
    
    const sendResult = await wallet.sendBch(bchAmount, receivingAddress);
    console.log('Transaction sent:', sendResult);

    if (sendResult.success == false) {
      throw new Error(`Failed to create vout=0 UTXO: ${sendResult.error}`);
    }
    
    return sendResult;
  }

  /**
   * Estimates satoshis needed for token genesis operation
   * Based on actual mainnet-js transaction requirements
   * @returns {bigint} Estimated satoshis needed
   */
  estimateGenesisSatsRequirement() {
    const tokenOutputValue = minTokenValue; // 1000 sats from constants
    const estimatedTxSize = 500; // More realistic: includes change outputs, token data
    const feeRate = 1.2; // sats/byte
    const estimatedFee = BigInt(Math.ceil(estimatedTxSize * feeRate));
    const dustLimit = 546n;
    const buffer = 20000n; // Larger buffer based on actual requirements (~20k sats observed)
    
    const total = tokenOutputValue + estimatedFee + dustLimit + buffer;
    
    console.log('Estimated genesis sats requirement:', {
      tokenOutputValue,
      estimatedFee,
      dustLimit,
      buffer,
      total: Number(total)
    });

    return total;
  }

  /**
   * Waits for transaction confirmation
   * @private
   * @param {number} [delayMs=6000]
   * @returns {Promise<void>}
   */
  async _waitForTransaction(delayMs = 6000) {
    console.log('Waiting for transaction confirmation for ', delayMs / 1000, 'seconds...');
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // ==================== UTILITIES ====================

  /**
   * Checks if error is vout=0 related
   * @private
   * @param {Error} error
   * @returns {boolean}
   */
  _isVoutZeroError(error) {
    return error.message?.includes('No suitable inputs with vout=0 available for new token genesis');
  }
}

export default Card;

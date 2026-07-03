import AuthNftService, { encodeMerchantHash } from './auth-nft';
import { defaultSpendLimitSats } from './constants';
import { TapToPay } from './contract/tap-to-pay';
import { backend } from './backend';
import { loadWallet } from '../wallet';
import { loadCardUser } from './user';
import { 
  saveCreateCardAttempt, 
  updateCreateCardAttempt, 
  getCreateCardAttempt,
  clearCreateCardAttempt,
  CardCreateAttemptStatus 
} from './storage';
import bus from 'src/services/event-bus';

export class Card {
  constructor(data) {
    this.raw = data;
    // Normalize default lock status to unlocked (false)
    if (this.raw && this.raw.is_locked === undefined) {
      this.raw.is_locked = false;
    }
  }

  set raw(data) {
    this._rawData = data;
  }

  get raw() {
    return this._rawData;
  }

  get alias() {
    return this.raw?.alias;
  }

  get id() {
    return this.raw?.id;
  }

  get uid() {
    return this.raw?.uid;
  }

  get cashAddress() {
    return this.raw?.cash_address;
  }

  get tokenAddress() {
    return this.raw?.token_address;
  }

  get bchBalance () {
    return this.raw?.bch_balance || 0;
  }

  get isLocked() {
    return !!this.raw?.is_locked;
  }

  get isAlertsEnabled() {
    return this.raw?.is_alerts_enabled;
  }

  get isSubscribed() {
    return this.raw?.subscribed_to_transactions;
  }

  get category() {
    return this.raw?.category
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
    await card._initializeAuthNftService();
    card._initializeContract();
    return card;
  }

  /**
   * Deletes a card creation attempt
   * @param {string} idempotencyKey 
   */
  static async deleteCardAttempt(idempotencyKey) {
    if (!idempotencyKey) {
      throw new Error('Idempotency key is required to delete card creation attempt');
    }
    await backend.delete(`cards/create-attempts/${idempotencyKey}/`);
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
  async _initializeAuthNftService() {
    this._assertWallet();
    this.authNftService = await AuthNftService.initializeWithWallet(this.wallet.privkey());
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
    await loadCardUser();
  }

  // ==================== WORKFLOWS ====================

  /**
   * Complete card creation workflow
   * @returns {Promise<Card>}
   */
  async create(newCard, callbackOnProgress=null, lastAttempt = null) {
    this._notifyCallbackFn(callbackOnProgress, 'Starting card creation workflow');

    const alias = newCard?.name

    try {

      let currentStatus = lastAttempt ? lastAttempt.status : CardCreateAttemptStatus.CARD_INITIATED;
      let cardId = lastAttempt?.cardId || null;

      if (currentStatus < CardCreateAttemptStatus.CARD_SAVED) {
        const { id: newCardId } = await this._createCardEntry(alias);
        cardId = newCardId;

        this._notifyCallbackFn(callbackOnProgress, 'Card entry created on server');
        
        currentStatus = CardCreateAttemptStatus.CARD_SAVED;
        updateCreateCardAttempt(this.wallet.walletHash, { cardId, status: currentStatus });
      } else {
        console.log('Resuming card creation with:', lastAttempt);
        
        this._notifyCallbackFn(callbackOnProgress, 'Resuming card creation workflow');
      }
      
      // Mints the genesis token for the card
      let category
      if (currentStatus <= CardCreateAttemptStatus.CARD_SAVED) {
        console.log('Minting genesis token for card ID:', cardId);
        
        this._notifyCallbackFn(callbackOnProgress, 'Minting genesis token. This may take a minute...');
        
        const genesisResult = await this._mintGenesisToken();
        category = genesisResult.tokenId
        
        this._notifyCallbackFn(callbackOnProgress, 'Genesis token minted');
        
        currentStatus = CardCreateAttemptStatus.GENESIS_MINTED;
        updateCreateCardAttempt(this.wallet.walletHash, { category: category, status: currentStatus });
      }

      await this._ensureCardUserAuthenticated();      
      this._notifyCallbackFn(callbackOnProgress, 'Card user authenticated');

      if (currentStatus <= CardCreateAttemptStatus.GENESIS_MINTED) {
        let savedAttempt = lastAttempt
        
        if (!category) {
          savedAttempt = await getCreateCardAttempt(this.wallet.walletHash);
          console.log('Re-fetching last attempt for category:', savedAttempt);
          category = savedAttempt?.category;
        }

        // Save the auth token category to the server
        this.raw = await this._saveGenesis(cardId, category);
        this._notifyCallbackFn(callbackOnProgress, 'Genesis token saved to server');
        currentStatus = CardCreateAttemptStatus.GENESIS_SAVED;
        updateCreateCardAttempt(this.wallet.walletHash, { status: currentStatus });      
      } 

      // Create the contract
      if (currentStatus <= CardCreateAttemptStatus.GENESIS_SAVED) {
        if (!lastAttempt) {
          lastAttempt = await getCreateCardAttempt(this.wallet.walletHash);
        }
        await this._generateContract(lastAttempt?.idempotencyKey);
        currentStatus = CardCreateAttemptStatus.CONTRACT_CREATED;
        updateCreateCardAttempt(this.wallet.walletHash, { status: currentStatus });
      }
      
      this.raw = (await backend.get(`/cards/${cardId}/`)).data;

      this._initializeContract();
      this._notifyCallbackFn(callbackOnProgress, 'Contract initialized locally');

      // if (currentStatus <= CardCreateAttemptStatus.CONTRACT_CREATED) {
      //   await this._issueGlobalAuthToken(currentStatus, callbackOnProgress);
      // }

      if (currentStatus <= CardCreateAttemptStatus.AUTH_MINTED) {
        await this._mintGlobalAuthToken();
        currentStatus = CardCreateAttemptStatus.AUTH_MINTED;
        updateCreateCardAttempt(this.wallet.walletHash, { status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Global auth token minted');
      }

      if (currentStatus <= CardCreateAttemptStatus.AUTH_MINTED) {
        await this._issueAuthTokens();
        currentStatus = CardCreateAttemptStatus.AUTH_ISSUED;
        updateCreateCardAttempt(this.wallet.walletHash, { status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Global auth token issued');
      }

      if (currentStatus <= CardCreateAttemptStatus.AUTH_ISSUED) {
        console.log('Card creation completed successfully');
        // Clear the create card attempt from local storage since workflow is complete
        await clearCreateCardAttempt(this.wallet.walletHash);
        this._notifyCallbackFn(callbackOnProgress, 'Card created successfully!');
      }
      return this;
    } catch (error) {
      console.error('Error:', error);
      console.error('Card creation workflow failed:', error.response || error.message);
      throw error;
    }
  }

  /**
   * Helper to call progress callback if provided
   * @private
   * @param {Function} callback
   * @param {string} message
   */
  _notifyCallbackFn(callback, message) {
    if (callback && typeof callback === 'function') {
      callback(message);
    }
  }

  // ==================== SERVER API ====================

  /**
   * Creates card entry on server
   * @private
   * @returns {Promise<Object>}
   */
  async _createCardEntry(alias) {
    console.log('Creating card entry...');
    this._assertWallet();
    const idempotencyKey = `create-card-${this.wallet.pubkey()}-${crypto.randomUUID()}`;

    const data = {
      alias: alias || "",
      wallet_hash: this.wallet.walletHash,
      public_key: this.wallet.pubkey(),
      address_path: this.wallet.addressPath()
    };

    saveCreateCardAttempt(this.wallet.walletHash, {
      idempotencyKey,
      alias: alias || "",
      walletHash: this.wallet.walletHash,
      createdAt: Date.now(),
    });
    
    const response = await backend.post('/cards/', data,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    ).catch(error => {
      console.error('Error creating card entry:', error.response || error.message);
      if (error.response && error.response.status === 403) {
        bus.emit('sessionExpired') // Emit sessionExpired event for testing
      }
    });
    
    const cardEntry = response.data;
    console.log('Card entry created:', cardEntry);
    updateCreateCardAttempt(this.wallet.walletHash, { cardId: cardEntry.id, status: CardCreateAttemptStatus.CARD_SAVED });

    return cardEntry;
  }

  /**
   * Saves genesis token id (category) to server
   * @private
   * @param {number} cardId
   * @param {String} category
   * @returns {Promise<Object>}
   */
  async _saveGenesis(cardId, category) {
    console.log('Saving genesis token to server:', { cardId, category });
    const data = { category };
    const response = await backend.patch(`/cards/${cardId}/`, data)
      .catch(error => {
        console.error('Error saving genesis token ID to server:', error.response || error.message);
        if (error.response && error.response.status === 403) {
          bus.emit('session-expired') // Emit sessionExpired event for testing
        }
        throw error;
      });

    return response.data;
  }

  /**
   * Generates a contract for the given card
   * @private
   * @param {string} idempotencyKey 
   * @returns {Promise<Object>}
   */
  async _generateContract(idempotencyKey) {
    const response = await backend.post(`/cards/generate-contract/`, null, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }).catch(error => {
      console.error('Error generating contract:', error.response || error.message);
      if (error.response && error.response.status === 403) {
        bus.emit('sessionExpired') // Emit sessionExpired event for testing
      }
      throw error;
    });

    return response.data;
  }

  /**
   * Checks if given UID exists in the server
   * @param {string} uid - The UID to validate
   * @returns {Promise<boolean>}
   */
  static async validateUid(uid) {
    const response = await backend.get(`/cards/validate-uid/${uid}/`);
    return { valid: response.data?.valid, message: response.data?.message };
  }

  /**
   * Gets transactions associated with the card
   * @returns {Promise<Array>}
   */
  async getTransactions() {
    const response = await backend.get(`/cards/${this.id}/transactions/`)
      .catch(error => {
        console.error('Error fetching transactions:', error.response || error.message);
        if (error.response && error.response.status === 401) {
          bus.emit('sessionExpired') // Emit sessionExpired event for testing
        }
        throw error;
      });
    return response.data?.results || [];
  }
  
  /**
   * Gets auth NFTs associated with the card
   * @returns {Promise<Object>}
   */
  async getAuthNfts() {
    const response = await backend.get(`/auth-nfts/${this.raw.token_address}`)
      .catch(error => {
        console.error('Error fetching auth NFTs:', error.response || error.message);
        if (error.response && error.response.status === 401) {
          bus.emit('sessionExpired') // Emit sessionExpired event for testing
        }
        throw error;
      });
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

  /**
   * Updates the card's alias
   * @param {Object} data - The new alias for the card
   * @returns {Promise<Object>} - The updated card data
   */
  async update(data = {}) {
    console.log('Updating card with data:', data);
    const response = await backend.patch(`/cards/${this.id}/`, data);
    return response.data;
  }

  async subscribeToTransactions() {
    if (this.isSubscribed) return;
    console.log('Subscribing to transactions for card ID:', this.id)
    await backend.post(`/cards/${this.id}/subscribe-transactions/`, null).then(() => {
      console.log('Successfully subscribed to card transactions')
    }).catch(err => {
      console.error('Error subscribing to card transactions:', err.response || err)
    })
  }

  async activate() {
    return await backend.post(`/cards/${this.id}/activate/`, null)
  }

  // ==================== AUTH NFT OPERATIONS ====================

  /**
   * Mints genesis token, creates vout=0 UTXO if needed
   * @private
   * @returns {Promise<{tokenId: string, utxos: Array}>}
   */
  async _mintGenesisToken(retryOnFailure = true) {
    console.log('Starting genesis token minting...');
    this._assertAuthNftService();

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
      console.error('Error during genesis minting:', error.message || error);
      const satsNeeded = this.parseSatoshisNeeded(error.message) * 2 || this.estimateCreateCardSatsRequirement(); // Default to estimated requirement if parsing fails
      if (satsNeeded) {
        console.log(`Creating vout=0 UTXO with ${satsNeeded} sats...`);
        await this._createFundingUtxo(BigInt(satsNeeded));
        await this._waitForTransaction();
        if (retryOnFailure) {
          console.log('Retrying genesis minting after creating UTXO...');
          return this._mintGenesisToken(false);
        }
      }
      
      if (this._isVoutZeroError(error)) {
        console.error('Still getting vout=0 error after ensuring UTXO exists');
        console.error('Possible causes: UTXO not confirmed, wallet sync issues');
      }
      throw error;
    }
  }

  parseSatoshisNeeded(message) {
    const patterns = [
      /(\d+)\s+satoshis\s+needed/i,
      /needed\s*\((\d+)\)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return Number(match[1]);
    }

    return null;
  }

  // /** 
  //  * Complete workflow to issue global and merchant auth tokens
  //  * @private
  //  * @returns {Promise<void>}
  //  */
  // async _issueGlobalAuthToken(currentStatus = null, callbackOnProgress = null) {
    
  //   if (currentStatus <= CardCreateAttemptStatus.AUTH_MINTED) {
  //     await this._mintGlobalAuthToken();
  //     currentStatus = CardCreateAttemptStatus.AUTH_MINTED;
  //     updateCreateCardAttempt(this.wallet.walletHash, { status: currentStatus });
  //     this._notifyCallbackFn(callbackOnProgress, 'Global auth token minted');
  //   }
    
  //   if (currentStatus <= CardCreateAttemptStatus.AUTH_MINTED) {
  //     await this._issueAuthTokens();
  //     currentStatus = CardCreateAttemptStatus.AUTH_ISSUED;
  //     updateCreateCardAttempt(this.wallet.walletHash, { status: currentStatus });
  //     this._notifyCallbackFn(callbackOnProgress, 'Global auth token issued');
  //   }
  // }

  /**
   * Mints global auth token for card
   * @private
   * @returns {Promise<Object>}
   */
  async _mintGlobalAuthToken({ authorized = true, spendLimitSats } = {}, retryOnFailure = true) {
    console.log('Minting global auth token...');
    this._assertAuthNftService();

    try {
      const result = await this.authNftService.mint({ 
          tokenId: this.raw?.category, 
          merchants: [{
            authorized: authorized,
            spendLimitSats: spendLimitSats || defaultSpendLimitSats,
          }]
      });
      
      console.log('Global auth token minted:', result);

      return result;
    } catch (error) {
      console.error('Error during global auth token minting:', error.message || error);
      const satsNeeded = this.parseSatoshisNeeded(error.message) * 2 || this.estimateCreateCardSatsRequirement(); // Default to estimated requirement if parsing fails
      if (satsNeeded) {
        console.log(`Creating vout=0 UTXO with ${satsNeeded} sats...`);
        await this._createFundingUtxo(BigInt(satsNeeded));
        await this._waitForTransaction();
        console.log('Retrying global auth token minting after creating UTXO...');
        if (retryOnFailure) {
          return this._mintGlobalAuthToken({ authorized, spendLimitSats }, false);
        }
      }
      throw error;
    }
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
  async issueMerchantAuthToken({ authorized = true, spendLimitSats = defaultSpendLimitSats, merchant } = {}, retryOnFailure = true) {
    console.log('Issuing merchant auth token...');
    if (!merchant?.id || !merchant?.pubkey) {
      throw new Error('Merchant id and pubkey are required to issue merchant auth token');
    }

    // Guard against minting a duplicate auth token for the same merchant.
    const { merchant_auth_nfts: merchantAuthNfts = [] } = await this.getAuthNfts();
    const { hex: merchantHash } = encodeMerchantHash({ merchantId: merchant.id, merchantPk: merchant.pubkey });
    const hasExistingToken = merchantAuthNfts.some(
      token => token?.commitment?.decoded?.hash === merchantHash
    );

    if (hasExistingToken) {
      throw new Error('Merchant auth token with matching commitment already exists.');
    }

    try {
      const mintResult = await this._mintMerchantAuthToken({ authorized, spendLimitSats, merchant }, retryOnFailure);
      const issueResult = await this._issueAuthTokens();
      return { mintResult, issueResult };
    } catch (error) {
      console.error('Error during merchant auth token issuance:', error.message || error);
      const satsNeeded = this.parseSatoshisNeeded(error.message) * 2 || this.estimateCreateCardSatsRequirement(); // Default to estimated requirement if parsing fails
      if (satsNeeded) {
        console.log(`Creating vout=0 UTXO with ${satsNeeded} sats...`);
        await this._createFundingUtxo(BigInt(satsNeeded));
        await this._waitForTransaction();
        console.log('Retrying merchant auth token issuance after creating UTXO...');
        if (retryOnFailure) {
          console.log('retryOnFailure:', retryOnFailure)
          return this.issueMerchantAuthToken({ authorized, spendLimitSats, merchant }, false);
        }
      }
      throw error;
    }
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
   */
  async _mintMerchantAuthToken({ authorized = true, spendLimitSats, merchant } = {}, retryOnFailure = true) {
    console.log('Minting merchant auth token...');
    this._assertWallet();
    this._assertAuthNftService();

    if (!merchant || !merchant.id || !merchant.pubkey) {
      throw new Error('Merchant id and pubkey are required to mint merchant auth token');
    }

    // // TODO: Prevent minting a duplicate auth token for the same merchant.
    // // Encode the merchant hash and check first if a token with 
    // // matching commitment already exists in the contract
    // const merchantHash = encodeMerchantHash({ merchantId: merchant.id, merchantPk: merchant.pubkey }).hex;
    // console.log('Encoded merchant hash:', merchantHash);
    // const cardTokenUtxos = await this.getTokenUtxos()

    const { cumulativeValue } = await this.wallet.getBchUtxos();
    const availableSats = cumulativeValue;
    const mintSatsRequired = this.estimateTokenOpSatsRequirement();

    // If utxos are enough, use them to mint the auth token
    if (availableSats < mintSatsRequired) {
      // Otherwise, create a UTXO by sending the required satoshi to the current wallet's cashaddress
      console.warn('Insufficient BCH UTXOs available in wallet for minting. Creating UTXO...');
      await this._createFundingUtxo(mintSatsRequired - availableSats + 10000n); // Adding buffer
      await this._waitForTransaction();
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
   * @private
   * @returns {Promise<Object>}
   */
  async _issueAuthTokens() {
    this._assertAuthNftService();

    const toAddress = this.tokenAddress;
    console.log('Issuing auth token to address:', toAddress);
    const tokenId = this.category;
    const fromAddress = this.wallet.tokenAddress();

    let authNfts = await this.authNftService.getMutableTokens(tokenId, fromAddress);

    if (authNfts.length === 0) {
      authNfts = await this.authNftService.ctWallet.getTokenUtxos(tokenId);
      console.log('ctWallet authNFTs:', authNfts);
      authNfts = authNfts.filter(utxo => utxo.token?.capability === 'mutable');
    }
    console.log('Auth NFTs to be issued:', authNfts);

    const recipients = []
    authNfts.forEach(utxo => {
      recipients.push({
        address: toAddress,
        tokenId: utxo.token?.category || utxo.token?.tokenId,
        capability: utxo.token?.nft?.capability || utxo.token?.capability,
        commitment: utxo.token?.nft?.commitment || utxo.token?.commitment,
        amount: utxo.token.amount,
        value: utxo.value || utxo.satoshis || 0,
      });
    }); 
    console.log('Issuing to recipients:', recipients);
    const result = await this.authNftService.issue({recipients});
    console.log('Auth tokens issued:', result);
    if (result.txId) {
      this.processTransaction(result.txId)
    }

    return result;
  }

  // ==================== CONTRACT OPERATIONS ====================
  /**
   * Returns BCH balance for card address. 
   * Fetches from server data, server queries blockchain.
   * @returns {number}
   */
  async getBchBalance() {
    const response = await backend.get(`/cards/${this.id}/bch-balance/`)
    .catch(error => {
      console.error('Error fetching BCH balance:', error.response || error.message);
      if (error.response && error.response.status === 401) {
        bus.emit('sessionExpired') // Emit sessionExpired event for testing
      }
      throw error;
    });
    return response.data?.bch_balance || 0;
  }

  /**
   * Returns token balance for card token address
   * @returns {number}
   */
  getTokenBalance() {
    return this.raw?.ct_balance.length || 0;
  }

  /**
   * Gets the TapToPay contract balance. 
   * Fetches directly from blockchain, may be more up-to-date than server data.
   * @returns {Promise<number>}
   */
  async getContractBalance() {
    this._initializeContract()
    return await this.contract.getContract().getBalance();
  }
  
  /**
   * Gets UTXOs for card address
   * @returns {Promise<Array>}
   */
  async getUtxos() {
    this._assertContract();
    // const temp = await this.wallet.getUtxos()
    // console.log('Wallet UTXOs:', temp);
    const contractUtxos = await this.contract.getUtxos();
    console.log('>>>>>> contractUtxos:', contractUtxos)
    return contractUtxos;
  }

  /**
   * Gets token UTXOs for card token address
   * @returns {Promise<Array>}
   */
  async getTokenUtxos() {
    this._assertWallet();
    const tokenId = this.category;
    const tokenAddress = this.tokenAddress
    return await this.wallet.getTokenUtxos(tokenId, tokenAddress);
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
    return this._mutateAuthToken({ authorize, spendLimitSats, broadcast });
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
    return this._mutateAuthToken({ authorize, spendLimitSats, merchant, broadcast });
  }

  /**
   * Mutates auth token commitment (global or merchant).
   * @private
   * @param {Object} options
   * @param {boolean} [options.authorize=true] - Whether to authorize
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis
   * @param {Object} [options.merchant] - Merchant info (omit for global)
   * @param {string} [options.merchant.id] - Merchant ID
   * @param {string} [options.merchant.pubkey] - Merchant public key
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async _mutateAuthToken({ authorize = true, spendLimitSats, merchant, broadcast = true } = {}) {
    this._assertContract();
    this._assertWallet();

    if (merchant && (!merchant.id || !merchant.pubkey)) {
      throw new Error('Merchant id and pubkey are required to mutate merchant auth token');
    }

    try {
      const mutation = {
        authorized: authorize,
        spendLimitSats: spendLimitSats,
      };

      if (merchant) {
        mutation.merchant = {
          id: merchant.id,
          pubkey: merchant.pubkey
        };
      }

      const mutations = [mutation];
      const mutationTarget = merchant ? 'merchant' : 'global';

      console.log(`Mutating ${mutationTarget} auth token commitment:`, mutations);

      const privateKey = this.wallet.privkey();
      const mutateResponse = await this.contract.mutate({
        senderWif: privateKey,
        mutations,
        broadcast
      });

      console.log('>>>>>>mutateResponse:', mutateResponse);
      return mutateResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sweeps the card's BCH balance to an external address
   * @param {Object} options - Sweep options
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async sweep(opts = { broadcast: true }) {
    this._assertContract();
    this._assertWallet();

    const privateKey = this.wallet.privkey();
    const sweepResponse = await this.contract.sweep({
      ownerWif: privateKey,
      toAddress: this.wallet.address(),
      broadcast: opts.broadcast
    });

    if (sweepResponse.txid) {
      this.processTransaction(sweepResponse.txid);
    }

    return sweepResponse;
  }

  /**
   * Burns a merchant auth token
   * @param {Object} options
   * @param {Object} options.merchant - Merchant info
   * @param {string} options.merchant.id - Merchant ID
   * @param {string} options.merchant.pubkey - Merchant public key
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async burnMerchantAuthToken({ merchant, broadcast = true } = {}) {
    this._assertContract();
    this._assertWallet();

    const privateKey = this.wallet.privkey();
    const tokenId = this.category;
    const params = {
      ownerWif: privateKey,
      tokenId,
      merchant,
      broadcast
    }
    console.log('Burning auth token with params:', params);
    const burnResponse = await this.contract.burn(params);
    
    if (burnResponse.txid) {
      this.processTransaction(burnResponse.txid);
    }

    return burnResponse;
  }

  // ==================== UTXO MANAGEMENT ====================

  /**
   * Checks for available vout=0 UTXOs and returns total satoshis
   * @returns {Promise<number>} Total satoshis available in vout=0 UTXOs
   */
  async _checkForFundingUtxos() {
    try {
      console.log('Checking for existing vout=0 UTXOs...');
      this._assertWallet();
      
      const resp = await this.wallet.getBchUtxos()
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
  async _createFundingUtxo(amount) {
    console.log('Creating vout=0 transaction...');
    this._assertWallet();
    return await this.wallet.createFundingUtxo(amount);
    // return await this.wallet.consolidateUtxos(amount)
  }

  /**
   * Estimates total satoshis needed for both genesis and global auth token minting
   * @returns {bigint} Estimated total satoshis needed
   */
  estimateCreateCardSatsRequirement() {
    this._assertWallet();
    return this.estimateTokenOpSatsRequirement() * 3n; // Multiplying by 3 because we are minting 2 tokens: genesis and global auth token + buffer
  }

  /**
   * Estimates satoshis needed for minting a token
   * @returns {Promise<bigint>} Estimated satoshis needed for minting auth token
   */
  estimateTokenOpSatsRequirement() {
    this._assertWallet();
    return this.wallet.estimateTokenOpSatsRequirement();
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

  async processTransaction(txid) {
    // Process the transaction and update card state as needed
    console.log('Processing transaction:', txid);
    await backend.post(`/cards/${this.id}/process-transaction/`, { txid }).then(response => {
      console.log('Transaction processed successfully:', response.data);
      // Optionally update card state based on response
    }).catch(error => {
      console.error('Error processing transaction:', error.response || error.message);
    });
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

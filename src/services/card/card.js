import AuthNftService, { encodeMerchantHash } from './auth-nft';
import { defaultSpendLimitSats } from './constants';
import { TapToPayV2 as TapToPay } from './contract/tap-to-pay';
import { backend } from './backend';
import { loadWallet } from '../wallet';
import { loadCardUser } from './user';
import { 
  createCardActivationAttempt,
  saveCardActivationAttempt, 
  updateCardActivationAttempt, 
  getCardActivationAttempt,
  clearCardActivationAttempt,
  CardActivationStatus
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
    return this.raw?.contract?.cash_address;
  }

  get tokenAddress() {
    return this.raw?.contract?.token_address;
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

  get authCategory() {
    return this.raw?.contract?.auth_token;
  }

  get ownershipCategory() {
    return this.raw?.contract?.ownership_token;
  }

  get isActivated() {
    return this.raw?.is_activated
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
    console.log('created with wallet:', card)
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
    console.log('this.contract:', this.contract)
    if (!this.contract) {
      console.log('contract is null or undefined')
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
    if (!this.raw?.contract?.contract_id) return;
    this.contract = new TapToPay(this.raw?.contract?.contract_id);
  }

  // ==================== WORKFLOWS ====================
  /**
   * Complete card creation workflow
   * @returns {Promise<Card>}
   */
  async activate(callbackOnProgress=null, lastAttempt = null) {
    console.log('Starting card activation...',);

    try {

      // - Step1: Check if contract[category].card on server is not yet linked to a user wallet (i.e. authToken is null)
      // - Step2: Mint genesis token
      // - Step3: Use the linking token to set contract owner and authToken.category = genesisToken.category
      // - Step4: Submit the txid of Step2 to the server for validation and processing
      //     From the transaction data, the server can validate:
      //        - Input[0] must be the pkh ownership token (holds the owner pkh)
      //        - Input[1] must be the cat ownership token (holds the auth category)
      //        - Input[2] must be the linking token
      //        - Output[0] must be the pkh ownership token (commitment = 0x00 + pkh)
      //        - Output[1] must be the cat ownership token (commitment = 0x01 + category)
      //        - If all of above is valid:
      //            - Get the contract: from parsing the destination address of the ownership tokens
      //            - Get the UserWallet: from parsing the commitment of the pkh ownership token
      //            - Get the authToken.category: from parsing the commitment of the cat ownership token
      //            - Save the authToken
      //            - Set contract.card.auth_token = authToken
      //            - Set contract.card.user = UserWallet

      if (!lastAttempt) {
        lastAttempt = await this.saveActivationAttempt();
      }
      console.log('[Card.activate] lastAttempt:', lastAttempt)

      let currentStatus = lastAttempt ? lastAttempt.status : CardActivationStatus.NONE;
      console.log('[Card.activate] currentStatus:', currentStatus)

      // Obtain the linking token from the backend
      let linkingCategory = lastAttempt.linkingCategory ? lastAttempt.linkingCategory : null;
      if (currentStatus < CardActivationStatus.LINKING_TOKEN_REQUESTED) {
        console.log('[Card.activate] Obtaining linking token from backend...');

        this._notifyCallbackFn(callbackOnProgress, 'Obtaining linking token...');
        const result = await this.requestLinkingToken();

        if (!result || !result.success) {
          throw new Error('Failed to obtain linking token from backend');
        }

        linkingCategory = result.category
        currentStatus = CardActivationStatus.LINKING_TOKEN_REQUESTED;
        await updateCardActivationAttempt(this.wallet.walletHash, { linkingCategory, status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Linking token obtained');
      }

      if (linkingCategory === null) {
        throw new Error('Linking category is not set.');
      }

      let authCategory = lastAttempt.authCategory ? lastAttempt.authCategory : null;
      if (currentStatus < CardActivationStatus.LINKING_TOKEN_OBTAINED) {
        console.log('[Card.activate] Polling for linking token in wallet...');

        const { authCategory: _authCategory } = await this.contract.getMerchantAuthCategory();

        // Check if the ownership tokens are already set in the contract which indicates that the linking token has been obtained 
        // and consumed. If not, poll for the linking token in the wallet.
        const ownershipTokensNotSet = _authCategory !== this.ownershipCategory
        console.log('[Card.activate] ownershipTokensNotSet:', ownershipTokensNotSet)
        
        if (ownershipTokensNotSet) {
          await this.pollForLinkingToken(linkingCategory, 1000, 10);
        } else if (!authCategory) {
          authCategory = _authCategory;
        }

        currentStatus = CardActivationStatus.LINKING_TOKEN_OBTAINED;
        await updateCardActivationAttempt(this.wallet.walletHash, { status: currentStatus });
      }

      // Mint the genesis token if not yet minted
      if (!authCategory && currentStatus < CardActivationStatus.GENESIS_MINTED) {
        console.log('[Card.activate] Minting genesis token');

        this._notifyCallbackFn(callbackOnProgress, 'Minting genesis token. This may take a minute...');
            
        ({ category: authCategory } = await this._mintGenesisAuthToken());
        console.log('[Card.activate] Genesis token minted with category:', authCategory);
        this._notifyCallbackFn(callbackOnProgress, 'Genesis token minted');

        if (!authCategory) {
          throw new Error('Failed to mint genesis token');
        }

        currentStatus = CardActivationStatus.GENESIS_MINTED;
        await updateCardActivationAttempt(this.wallet.walletHash, { authCategory, status: currentStatus });
      }

      // Set contract ownership
      let linkingTxid = lastAttempt?.linkingTxid ? lastAttempt.linkingTxid : null;
      if (currentStatus < CardActivationStatus.OWNERSHIP_UPDATED) {
        console.log('[Card.activate] Setting contract ownership with linking token...');

        const privateKey = this.wallet.privkey();
        const result = await this.contract.setOwner(privateKey, authCategory);
        
        if (!result || !result.success) {
          throw new Error('Failed to set contract ownership');
        }

        linkingTxid = result.txid
        if (result.success && !linkingTxid) {
          currentStatus = CardActivationStatus.VALIDATION_REQUESTED;
          await updateCardActivationAttempt(this.wallet.walletHash, { status: currentStatus });
        } else {
          this._notifyCallbackFn(callbackOnProgress, 'Contract ownership updated. Waiting for confirmation...');
          currentStatus = CardActivationStatus.OWNERSHIP_UPDATED;
          await updateCardActivationAttempt(this.wallet.walletHash, { linkingTxid, status: currentStatus });
        }
      }
      
      // Mint global auth token
      if (currentStatus < CardActivationStatus.GLOBAL_AUTH_MINTED) {
        console.log('[Card.activate] Minting global auth token...');
        await this._mintGlobalAuthToken(authCategory);
        currentStatus = CardActivationStatus.GLOBAL_AUTH_MINTED;
        await updateCardActivationAttempt(this.wallet.walletHash, { status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Global auth token minted');
      }

      // Send the global auth token to the contract
      if (currentStatus < CardActivationStatus.GLOBAL_AUTH_ISSUED) {
        console.log('[Card.activate] Issuing global auth token to contract...');
        await this._issueAuthTokens(authCategory);
        currentStatus = CardActivationStatus.GLOBAL_AUTH_ISSUED;
        await updateCardActivationAttempt(this.wallet.walletHash, { status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Global auth token issued');
      }

      if (currentStatus < CardActivationStatus.VALIDATION_REQUESTED) {
        console.log('[Card.activate] Requesting server to process linking transaction with txid:', linkingTxid);
        if (!linkingTxid) linkingTxid = lastAttempt?.linkingTxid;

        const result = await this.processLinkingTx(linkingTxid);
        if (!result || !result.success) {
          throw new Error('Failed to process linking transaction');
        }

        currentStatus = CardActivationStatus.VALIDATION_REQUESTED;
        await updateCardActivationAttempt(this.wallet.walletHash, { status: currentStatus });
      }

      if (currentStatus === CardActivationStatus.GLOBAL_AUTH_ISSUED) {
        console.log('[Card.activate] Card creation completed successfully');
        // Clear the card activation attempt from local storage since workflow is complete
        await clearCardActivationAttempt(this.wallet.walletHash);
        this._notifyCallbackFn(callbackOnProgress, 'Card created successfully!');
      }

      return this;
    } catch (error) {
      console.error('Error:', error);
      console.error('Card creation workflow failed:', error.response || error.message);
      throw error;
    }
  }

  async processLinkingTx(linkingTxid) {
    console.log('Processing linking transaction with txid:', linkingTxid);
    return await backend.post(`/cards/process-linking-tx/`, { linking_txid: linkingTxid })
      .then(response => {
        console.log('Linking transaction processed successfully:', response.data);
        return response.data;
      })
      .catch(error => {
        console.error('Error processing linking transaction:', error.response || error.message);
        if (error.response && error.response.status === 403) {
          bus.emit('sessionExpired') // Emit sessionExpired event for testing
        }
      });
  }

  async pollForLinkingToken(tokenId, interval = 1000, maxAttempts = 10) {
    console.log(`Polling for linking token with tokenId: ${tokenId}`);
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const tokenUtxos = await this.wallet.getTokenUtxos(tokenId);
        if (tokenUtxos.length > 0) {
          console.log('Linking token found in wallet:', tokenUtxos);
          return tokenUtxos;
        } else {
          console.log(`Attempt ${attempts + 1}/${maxAttempts}: Linking token not found yet. Retrying in ${interval}ms...`);
        }
      } catch (error) {
        console.error('Error polling for linking token:', error.response || error.message);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Max attempts reached while polling for linking token');
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
  async saveActivationAttempt() {
    console.log('Creating card entry...');
    this._assertWallet();
    const idempotencyKey = `create-card-${this.wallet.pubkey()}-${crypto.randomUUID()}`;

    await saveCardActivationAttempt(this.wallet.walletHash, {
      idempotencyKey,
      ownershipCategory: this.ownershipCategory,
      walletHash: this.wallet.walletHash,
      createdAt: Date.now(),
    });
    
    console.log('Card activation attempt created with idempotencyKey:', idempotencyKey);
    await updateCardActivationAttempt(this.wallet.walletHash, { idempotencyKey, status: CardActivationStatus.NONE });

    const attempt = await getCardActivationAttempt(this.wallet.walletHash)
    return attempt;
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

  async requestLinkingToken() {
    const data = {
      to_address: this.wallet.tokenAddress(),
    }
    console.log('Requesting linking token with data:', data)
    const response = await backend.post(`/cards/${this.id}/linking-token/`, data)
      .catch(error => {
        console.error('Error requesting linking token:', error.response || error.message);
        if (error.response && error.response.status === 401) {
          bus.emit('sessionExpired') // Emit sessionExpired event for testing
        }
        throw error;
      });
    console.log('response:', response.data)
    return response.data || null;
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

  // ==================== AUTH NFT OPERATIONS ====================

  /**
   * Mints genesis auth token for minting, creates vout=0 UTXO if needed
   * @private
   * @returns {Promise<{tokenId: string, utxos: Array}>}
   */
  // this function should poll as well as mempool conflict happens
  async _mintGenesisAuthToken(interval = 1000, maxAttempts = 10) {
    console.log('Starting genesis token minting...');
    this._assertAuthNftService();

    while (maxAttempts > 0) {
      try {
        const result = await this.authNftService.genesis();
        console.log('Genesis result:', result);
        
        if (result) {
          if (result.success) {
            const category = result.category
            const utxos = await this.authNftService.getTokenUtxos(category);
            
            return { success: true, category, utxos };
          } else {
            console.error(result.error)
            throw new Error('Genesis minting failed: ' + (result.error || 'Unknown error'));
          }
        } else {
          throw new Error('Failed to mint genesis auth token');
        }
        
      } catch (error) {
        console.error('Error during genesis minting:', error.message || error);
        maxAttempts--;
        if (maxAttempts === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
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

  /**
   * Mints global auth token for card
   * @private
   * @returns {Promise<Object>}
   */
  async _mintGlobalAuthToken(tokenId, interval = 1000, maxAttempts = 10) {
    console.log('Minting global auth token...');
    this._assertAuthNftService();
    console.log('tokenId:', tokenId)
    while (maxAttempts > 0) {
      try {
        const result = await this.authNftService.mint({ 
            tokenId: tokenId,
            merchants: [{
              authorized: true,
              spendLimitSats: defaultSpendLimitSats,
            }]
        });
        
        console.log('Global auth token minted:', result);

        return result;
      } catch (error) {
        console.error('Error during global auth token minting:', error.message || error);
      }
      maxAttempts--;
      if (maxAttempts > 0) {
        console.log(`Retrying in ${interval}ms... (${maxAttempts} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, interval));
      } else {
        throw new Error('Max attempts reached while minting global auth token');
      }
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
  // this function should poll a few retries
  async _issueAuthTokens(tokenId, interval = 1000, maxAttempts = 5) {
    this._assertAuthNftService();
    let lastError = null;
    while (maxAttempts > 0) {
      try {
        const result = await this._attemptIssueAuthTokens(tokenId);
        return result;
      } catch (error) {
        lastError = error;
        console.error('Error issuing auth tokens:', error.message || error);
        maxAttempts--;
        if (maxAttempts > 0) {
          console.log(`Retrying in ${interval}ms... (${maxAttempts} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, interval));
        } else {
          throw new Error(`Error: ${lastError?.message || lastError}`);
        }
      }
    }
  }

  async _attemptIssueAuthTokens(tokenId) {
    this._assertAuthNftService();
    const tokenUtxos = await this.wallet.getTokenUtxos(tokenId)
    const mutableTokens = tokenUtxos.filter(utxo => utxo?.token?.nft?.capability === 'mutable');
    console.log('Token UTXOs before issuing auth tokens:', tokenUtxos);
    console.log('mutableTokens:', mutableTokens);
    
    if (mutableTokens.length === 0) {
      throw new Error('No mutable auth tokens available to issue.');
    }

    const toAddress = this.tokenAddress
    console.log('>>>>>>>>>>>>>toAddress:', toAddress)
    const result = await this.authNftService.issue(mutableTokens, toAddress);
    console.log('Auth tokens issued:', result);
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
    return await this.contract.getRawContract().getBalance();
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
    const tokenId = this.authCategory;
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
  getContract(){
    return this.contract
  }

  /**
   * Returns Cashscript contract instance of TapToPay
   * @returns {Object} Cashscript contract instance
   */
  getRawContract() {
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
    console.log('[card.sweep] Sweeping card BCH balance to external address...');
    this._assertContract();
    console.log('[card.sweep] Contract initialized:', this.contract);
    this._assertWallet();
    

    console.log('Sweeping card BCH balance to external address...');

    const privateKey = this.wallet.privkey();
    const sweepResponse = await this.contract.sweep({
      ownerWif: privateKey,
      toAddress: this.wallet.address(),
      broadcast: opts.broadcast
    });

    console.log('Sweep response:', sweepResponse);

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

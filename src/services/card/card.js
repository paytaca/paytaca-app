import { cardLogger } from 'src/utils/debug-logger.js'
import AuthNftService, { decodeCommitment, encodeMerchantHash } from './auth-nft';
import { defaultSpendLimitSats } from './constants';
import { createTapToPay } from './contract/tap-to-pay';
import { backend } from './backend';
import { loadWallet, INSUFFICIENT_BALANCE_CODE } from '../wallet';
import { loadCardUser } from './user';
import { 
  createCardActivationAttempt,
  saveCardActivationAttempt, 
  updateCardActivationAttempt, 
  getCardActivationAttempt,
  clearCardActivationAttempt,
  CardActivationStatus
} from './storage';

import { sha256, utf8ToBin, secp256k1, decodePrivateKeyWif, binToHex } from '@bitauth/libauth';

const SWEEP_MERCHANT_CACHE_TTL_MS = 5 * 60 * 1000;
let _sweepMerchantCache = null;
let _sweepMerchantCacheTime = 0;

/**
 * Fetches the server's sweep merchant pubkey.
 * GET /sweep-merchant/ — public endpoint; result is cached briefly.
 * @param {Object} [opts]
 * @param {number} [opts.maxAgeMs=300000]
 * @returns {Promise<{id: string, pubkey: string}>}
 */
export async function fetchSweepMerchant({ maxAgeMs = SWEEP_MERCHANT_CACHE_TTL_MS } = {}) {
  const now = Date.now();
  if (_sweepMerchantCache && (now - _sweepMerchantCacheTime) < maxAgeMs) {
    return _sweepMerchantCache;
  }
  const response = await backend.get('/sweep-merchant/', { authorize: false }).catch(error => {
    cardLogger.error('Error fetching sweep merchant:', error.response || error.message);
    throw error;
  });
  const data = response?.data;
  if (!data?.pubkey) {
    throw new Error('Invalid sweep merchant response');
  }
  _sweepMerchantCache = {
    id: String(data.id ?? '0'),
    pubkey: data.pubkey,
  };
  _sweepMerchantCacheTime = now;
  return _sweepMerchantCache;
}

export function clearSweepMerchantCache() {
  _sweepMerchantCache = null;
  _sweepMerchantCacheTime = 0;
}

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

  get contracts() {
    return this.raw?.contracts || []
  }

  get activeContractVersion() {
    const active = this.contracts.find(c => c.is_active)
    return active?.version || null
  }

  get hasV2Contract() {
    return this.contracts.some(c => c.version === 'v2')
  }

  get v2Contract() {
    return this.contracts.find(c => c.version === 'v2') || null
  }

  get isV2Active() {
    return this.activeContractVersion === 'v2'
  }

  /**
   * Checks whether a contract version already has on-chain ownership set up.
   * Used to distinguish "already upgraded" from "currently active version".
   * @param {string} version - 'v1' or 'v2'
   * @returns {Promise<boolean>}
   */
  async isVersionOwnershipSet(version) {
    const entry = this.contracts.find(c => c.version === version)
    const contractId = entry?.contract_id || entry?.id
    if (!contractId) return false
    try {
      const contract = createTapToPay(contractId, version)
      return await contract.isOwnershipSet()
    } catch (error) {
      cardLogger.error(`[Card.isVersionOwnershipSet] Failed to check ${version} ownership:`, error.message || error)
      return false
    }
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
    cardLogger.log('created with wallet:', card)
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
      cardLogger.log('contract is null or undefined')
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
    const contractId = this.raw?.contract?.contract_id
      || this.raw?.contract?.id
      || this.activeContractEntry?.id
      || this.activeContractEntry?.contract_id
    if (!contractId) return;
    const version = this.raw?.contract?.version || this.activeContractEntry?.version
    this.contract = createTapToPay(contractId, version);
  }

  get activeContractEntry() {
    return this.contracts.find(c => c.is_active) || null
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
      cardLogger.error('Error fetching BCH balance:', error.message);
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
   * Gets fungible CashToken balances for the card via the server's
   * Watchtower proxy. Defaults to Watchtower truth.
   * @param {Object} [opts]
   * @param {Array<string>} [opts.tokenIds] - only return these categories
   * @param {boolean} [opts.includeUtxos] - include UTXOs per token
   * @param {boolean} [opts.useLocal] - opt in to experimental server DB instead of Watchtower
   * @returns {Promise<Array<{category: string, balance: string, decimals: number, utxoCount: number}>>}
   */
  async getFungibleTokenBalances({ tokenIds = [], includeUtxos = false, useLocal = false } = {}) {
    const address = this.tokenAddress || this.cashAddress
    if (!address) throw new Error('Card has no token or cash address')
    const params = {}
    if (tokenIds?.length) params.tokenIds = tokenIds.join(',')
    if (includeUtxos) params.include_utxos = true
    if (useLocal) params.use_local = true
    const response = await backend.get(`/admin/utils/contracts/${address}/ft/balances`, { params })
      .catch(error => {
        cardLogger.error('Error fetching fungible token balances:', error.response || error.message);
        throw error;
      });
    return response.data?.balances || [];
  }

  /**
   * Lists sweepable FT balances via `GET /contracts/{address}/ft/balances/` (no auth).
   * @param {Object} [opts]
   * @param {Array<string>} [opts.tokenIds]
   * @param {boolean} [opts.includeUtxos]
   * @returns {Promise<Array<{tokenId: string, category: string, amount: number}>>}
   */
  async fetchFtBalances({ tokenIds = [], includeUtxos = false } = {}) {
    const address = this.tokenAddress || this.cashAddress
    return fetchFtBalances(address, { tokenIds, includeUtxos })
  }

  /**
   * Sweeps one FT category via `POST /cards/{id}/sweep_fungible_tokens/` (auth required).
   * Backend consolidates all UTXOs for the tokenId in one tx.
   * Signs the canonical message with the owner's key; backend verifies
   * the signature against `card.owner.public_key` before broadcasting.
   * @param {string} tokenId - FT category hex
   * @param {string} tokenAddress - destination token-aware address
   * @returns {Promise<{success: boolean|'unknown', txid: string|null}>}
   */
  async sweepFungibleTokens(tokenId, tokenAddress) {
    this._assertWallet();
    const message = buildSweepMessage(this.raw, tokenId, tokenAddress)
    const signature = signSweepMessage(this.wallet.privkey(), message)
    return sweepFungibleTokens(this.id || this.uid, tokenId, tokenAddress, signature)
  }

  /**
   * True when the active contract can sweep fungible tokens on-chain via
   * the contract's `sweep` function (v2 contracts only).
   * @returns {boolean}
   */
  get supportsOnchainTokenSweep() {
    return this.isV2Active && !!this.contract?.supportsTokenSweep
  }

  /**
   * Sweeps one FT category from the active contract to the wallet's token
   * address using the contract's on-chain `sweep` function.
   * Only supported on v2 contracts.
   * @param {string} tokenId - FT category hex
   * @param {Object} [opts]
   * @param {boolean} [opts.broadcast=true]
   * @returns {Promise<Object>}
   */
  async sweepFungibleToken(tokenId, opts = { broadcast: true }) {
    cardLogger.log('[card.sweepFungibleToken] Sweeping FT category to wallet token address...');
    this._assertContract();
    this._assertWallet();

    const tokenAddress = this.wallet.tokenAddress();
    const toAddress = this.wallet.address();
    const privateKey = this.wallet.privkey();
    const built = await this.contract.sweepFungibleToken({
      ownerWif: privateKey, tokenId, tokenAddress, toAddress, broadcast: false,
    });
    if (built?.success === false) return built;
    const txHex = built?.txHex;
    if (!txHex) throw new Error('Failed to build token sweep transaction');
    if (!opts.broadcast) return { success: true, txHex, tokenAddress, toAddress, tokenId };

    const result = await broadcastCardTransaction(txHex, 'sweep', { cardIdOrUid: this.id || this.uid });
    cardLogger.log('[card.sweepFungibleToken] Sweep response:', result);
    return { ...result, txHex, tokenAddress, toAddress, tokenId };
  }

  /**
   * Sweeps one FT category to the wallet's token address.
   * Uses the on-chain `sweep` for v2 contracts; falls back to the backend
   * spend-based sweep for v1 contracts.
   * @param {string} tokenId - FT category hex
   * @param {Object} [opts]
   * @param {boolean} [opts.broadcast=true]
   * @returns {Promise<{success: boolean|'unknown', txid: string|null}>}
   */
  async sweepToken(tokenId, opts = { broadcast: true }) {
    if (this.supportsOnchainTokenSweep) {
      return this.sweepFungibleToken(tokenId, opts);
    }
    this._assertWallet();
    return this.sweepFungibleTokens(tokenId, this.wallet.tokenAddress());
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
   * Gets token UTXOs for card token address
   * @returns {Promise<Array>}
   */
  async getAuthTokenUtxos() {
    this._assertContract();
    const tokenId = this.authCategory
    return await this.contract.getTokenUtxos(tokenId);
  }

  /**
   * Fetches the server sweep merchant and finds the matching sweep auth NFT
   * on this card. Returns the UTXO only if it is authorized.
   * @returns {Promise<Object|null>}
   */
  async findSweepAuthNft() {
    this._assertContract();
    const merchant = await fetchSweepMerchant();
    const { hex: merchantHash } = encodeMerchantHash({
      merchantId: merchant.id,
      merchantPk: merchant.pubkey,
    });
    const authTokenUtxos = await this.getAuthTokenUtxos();
    return authTokenUtxos.find(utxo => {
      const commitment = utxo?.token?.nft?.commitment;
      if (!commitment) return false;
      const decoded = decodeCommitment(commitment);
      return decoded?.hash === merchantHash && decoded?.authorized === true;
    }) || null;
  }

  /**
   * Returns true when the card has an authorized sweep-merchant auth NFT.
   * @returns {Promise<boolean>}
   */
  async hasSweepAuth() {
    const nft = await this.findSweepAuthNft();
    return !!nft;
  }

  /**
   * Mints or updates the sweep-merchant auth NFT for this card.
   * If the NFT already exists, mutates it to authorized=1 with a 5000-sat limit.
   * Otherwise mints a new merchant auth NFT and issues it to the card.
   * @returns {Promise<Object>}
   */
  async mintSweepAuthToken() {
    this._assertWallet();
    this._assertAuthNftService();
    this._assertContract();

    const merchant = await fetchSweepMerchant();
    const spendLimitSats = 5000;
    const { hex: merchantHash } = encodeMerchantHash({
      merchantId: merchant.id,
      merchantPk: merchant.pubkey,
    });

    const authTokenUtxos = await this.getAuthTokenUtxos();
    const existingUtxo = authTokenUtxos.find(utxo => {
      const commitment = utxo?.token?.nft?.commitment;
      if (!commitment) return false;
      const decoded = decodeCommitment(commitment);
      return decoded?.hash === merchantHash;
    });

    if (existingUtxo) {
      cardLogger.log('Updating existing sweep auth NFT');
      return this._mutateAuthToken({
        authorized: true,
        spendLimitSats,
        merchant,
        broadcast: true,
      });
    }

    cardLogger.log('Minting new sweep auth NFT');
    const mintResult = await this.authNftService.mint({
      tokenId: this.authCategory,
      merchants: [{
        id: merchant.id,
        pubkey: merchant.pubkey,
        authorized: true,
        spendLimitSats,
      }],
    });
    const issueResult = await this._issueAuthTokens(this.authCategory);
    return { mintResult, issueResult };
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

  // ==================== WORKFLOWS ====================
  /**
   * Complete card activation workflow
   * @param {Function} [callbackOnProgress] - Progress message callback
   * @param {Object} [lastAttempt] - Resume from a previous attempt
   * @param {Object} [opts]
   * @param {string} [opts.version] - Contract version being activated ('v1' or 'v2').
   *   Scopes the activation attempt storage and linking-token request to that
   *   version. Omit for the default V1 card activation behavior.
   * @returns {Promise<Card>}
   */
  async activate(callbackOnProgress=null, lastAttempt = null, opts = {}) {
    cardLogger.log('Starting card activation...',);
    const attemptKey = opts.version ? `${this.wallet.walletHash}:${opts.version}` : this.wallet.walletHash;

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
        lastAttempt = await this.saveActivationAttempt(attemptKey);
      }
      cardLogger.log('[Card.activate] lastAttempt:', lastAttempt)

      let currentStatus = lastAttempt ? lastAttempt.status : CardActivationStatus.NONE;
      cardLogger.log('[Card.activate] currentStatus:', currentStatus)

      // Obtain the linking token from the backend
      let linkingCategory = lastAttempt.linkingCategory ? lastAttempt.linkingCategory : null;
      if (currentStatus < CardActivationStatus.LINKING_TOKEN_REQUESTED) {
        cardLogger.log('[Card.activate] Obtaining linking token from backend...');

        this._notifyCallbackFn(callbackOnProgress, 'Obtaining linking token...');
        const result = await this.requestLinkingToken({ version: opts.version });

        if (!result || !result.success) {
          throw new Error('Failed to obtain linking token from backend');
        }

        linkingCategory = result.category
        currentStatus = CardActivationStatus.LINKING_TOKEN_REQUESTED;
        await updateCardActivationAttempt(attemptKey, { linkingCategory, status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Linking token obtained');
      }

      if (linkingCategory === null) {
        throw new Error('Linking category is not set.');
      }

      let authCategory = lastAttempt.authCategory ? lastAttempt.authCategory : null;
      if (currentStatus < CardActivationStatus.LINKING_TOKEN_OBTAINED) {
        cardLogger.log('[Card.activate] Polling for linking token in wallet...');

        const { authCategory: _authCategory } = await this.contract.getMerchantAuthCategory();

        // Check if the ownership tokens are already set in the contract which indicates that the linking token has been obtained 
        // and consumed. If not, poll for the linking token in the wallet.
        const ownershipTokensNotSet = _authCategory !== this.ownershipCategory
        cardLogger.log('[Card.activate] ownershipTokensNotSet:', ownershipTokensNotSet)
        
        if (ownershipTokensNotSet) {
          await this.pollForLinkingToken(linkingCategory, 1000, 10);
        } else if (!authCategory) {
          authCategory = _authCategory;
        }

        currentStatus = CardActivationStatus.LINKING_TOKEN_OBTAINED;
        await updateCardActivationAttempt(attemptKey, { status: currentStatus });
      }

      // Mint the genesis token if not yet minted
      if (!authCategory && currentStatus < CardActivationStatus.GENESIS_MINTED) {
        cardLogger.log('[Card.activate] Minting genesis token');

        this._notifyCallbackFn(callbackOnProgress, 'Minting genesis token. This may take a minute...');
            
        ({ category: authCategory } = await this._mintGenesisAuthToken());
        cardLogger.log('[Card.activate] Genesis token minted with category:', authCategory);
        this._notifyCallbackFn(callbackOnProgress, 'Genesis token minted');

        if (!authCategory) {
          throw new Error('Failed to mint genesis token');
        }

        currentStatus = CardActivationStatus.GENESIS_MINTED;
        await updateCardActivationAttempt(attemptKey, { authCategory, status: currentStatus });
      }

      // Set contract ownership
      let linkingTxid = lastAttempt?.linkingTxid ? lastAttempt.linkingTxid : null;
      if (currentStatus < CardActivationStatus.OWNERSHIP_UPDATED) {
        cardLogger.log('[Card.activate] Setting contract ownership with linking token...');

        const privateKey = this.wallet.privkey();
        const result = await this.contract.setOwner(privateKey, authCategory);
        
        if (!result || !result.success) {
          throw new Error('Failed to set contract ownership');
        }

        linkingTxid = result.txid
        if (result.success && !linkingTxid) {
          currentStatus = CardActivationStatus.VALIDATION_REQUESTED;
          await updateCardActivationAttempt(attemptKey, { status: currentStatus });
        } else {
          this._notifyCallbackFn(callbackOnProgress, 'Contract ownership updated. Waiting for confirmation...');
          currentStatus = CardActivationStatus.OWNERSHIP_UPDATED;
          await updateCardActivationAttempt(attemptKey, { linkingTxid, status: currentStatus });
        }
      }
      
      // Mint global auth token
      if (currentStatus < CardActivationStatus.GLOBAL_AUTH_MINTED) {
        cardLogger.log('[Card.activate] Minting global auth token...');
        await this._mintGlobalAuthToken(authCategory);
        currentStatus = CardActivationStatus.GLOBAL_AUTH_MINTED;
        await updateCardActivationAttempt(attemptKey, { status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Global auth token minted');
      }

      // Send the global auth token to the contract
      if (currentStatus < CardActivationStatus.GLOBAL_AUTH_ISSUED) {
        cardLogger.log('[Card.activate] Issuing global auth token to contract...');
        await this._issueAuthTokens(authCategory);
        currentStatus = CardActivationStatus.GLOBAL_AUTH_ISSUED;
        await updateCardActivationAttempt(attemptKey, { status: currentStatus });
        this._notifyCallbackFn(callbackOnProgress, 'Global auth token issued');
      }

      if (currentStatus < CardActivationStatus.VALIDATION_REQUESTED) {
        cardLogger.log('[Card.activate] Requesting server to process linking transaction with txid:', linkingTxid);
        if (!linkingTxid) linkingTxid = lastAttempt?.linkingTxid;

        const result = await this.processLinkingTx(linkingTxid);
        if (!result || !result.success) {
          throw new Error('Failed to process linking transaction');
        }

        currentStatus = CardActivationStatus.VALIDATION_REQUESTED;
        await updateCardActivationAttempt(attemptKey, { status: currentStatus });
      }

      if (currentStatus === CardActivationStatus.VALIDATION_REQUESTED) {
        cardLogger.log('[Card.activate] Card creation completed successfully');
        // Clear the card activation attempt from local storage since workflow is complete
        await clearCardActivationAttempt(attemptKey);
        this._notifyCallbackFn(callbackOnProgress, 'Card created successfully!');
      }

      return this;
    } catch (error) {
      cardLogger.error('Error:', error.message);
      cardLogger.error('Card creation workflow failed:', error.message);
      throw error;
    }
  }

  async processLinkingTx(linkingTxid) {
    cardLogger.log('Processing linking transaction with txid:', linkingTxid);
    return await backend.post(`/cards/process-linking-tx/`, { linking_txid: linkingTxid })
      .then(response => {
        cardLogger.log('Linking transaction processed successfully:', response.data);
        return response.data;
      })
      .catch(error => {
        cardLogger.error('Error processing linking transaction:', error.message);
        throw error;
      });
  }

  async pollForLinkingToken(tokenId, interval = 1000, maxAttempts = 10) {
    cardLogger.log(`Polling for linking token with tokenId: ${tokenId}`);
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const tokenUtxos = await this.wallet.getTokenUtxos(tokenId);
        if (tokenUtxos.length > 0) {
          cardLogger.log('Linking token found in wallet:', tokenUtxos);
          return tokenUtxos;
        } else {
          cardLogger.log(`Attempt ${attempts + 1}/${maxAttempts}: Linking token not found yet. Retrying in ${interval}ms...`);
        }
      } catch (error) {
        cardLogger.error('Error polling for linking token:', error.message);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Max attempts reached while polling for linking token');
  }

  // ==================== SERVER API ====================

  /**
   * Creates card entry on server
   * @param {string} [attemptKey] - Storage key for the attempt. Defaults to the wallet hash.
   * @private
   * @returns {Promise<Object>}
   */
  async saveActivationAttempt(attemptKey = null) {
    cardLogger.log('Creating card entry...');
    this._assertWallet();
    const key = attemptKey || this.wallet.walletHash;
    const idempotencyKey = `create-card-${this.wallet.pubkey()}-${crypto.randomUUID()}`;

    await saveCardActivationAttempt(key, {
      idempotencyKey,
      ownershipCategory: this.ownershipCategory,
      walletHash: this.wallet.walletHash,
      createdAt: Date.now(),
    });
    
    cardLogger.log('Card activation attempt created with idempotencyKey:', idempotencyKey);
    await updateCardActivationAttempt(key, { idempotencyKey, status: CardActivationStatus.NONE });

    const attempt = await getCardActivationAttempt(key)
    return attempt;
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
   * Requests a linking token from the backend for the card.
   * @param {Object} [opts]
   * @param {string} [opts.version] - Contract version the token is for ('v1' or 'v2').
   *   When set, the version, contract id, and ownership category are sent so
   *   the backend can issue the token for that version's own tokens.
   *   Omit for the default behavior used by V1 activation.
   */
  async requestLinkingToken({ version = null } = {}) {
    const data = {
      to_address: this.wallet.tokenAddress(),
    }
    if (version) {
      data.version = version
      const entry = this.contracts.find(c => c.version === version)
      const contractId = entry?.contract_id || null
      if (contractId) {
        data.contract_id = contractId
      }
      if (entry?.linking_token){
        data.category = entry.linking_token
      } 
    }
    cardLogger.log('Requesting linking token with data:', data)
    const response = await backend.post(`/cards/${this.id}/linking-token/`, data)
      .catch(error => {
        cardLogger.error('Error requesting linking token:', error.message);
        throw error;
      });
    cardLogger.log('response:', response.data)
    return response.data || null;
  }

  /**
   * Gets ContractHistory rows for the card.
   * GET /api/cards/{cardIdOrUid}/transactions/ (paginated, ordered -created_at).
   * @param {Object} [opts]
   * @param {number} [opts.page]
   * @param {number} [opts.page_size]
   * @returns {Promise<Array>}
   */
  async getTransactions({ page, page_size } = {}) {
    const cardIdOrUid = this.id || this.uid
    if (!cardIdOrUid) throw new Error('Card id or uid is required')
    const params = {}
    if (page) params.page = page
    if (page_size) params.page_size = page_size
    const response = await backend.get(`/cards/${cardIdOrUid}/transactions/`, { params })
      .catch(error => {
        cardLogger.error('Error fetching transactions:', error.message);
        throw error;
      });
    return response.data?.results || [];
  }

  /**
   * Gets the card's global auth NFT
   * @returns {Promise<Object>}
   */
  async getGlobalAuthNft() {
    const authTokenUtxos = await this.getAuthTokenUtxos();
    let decodedCommitment = null;
    const globalAuthNft = authTokenUtxos.find(utxo => {
      const mutableNft = utxo?.token?.nft?.capability === 'mutable'
      if (!mutableNft) return false

      const commitment = utxo?.token?.nft?.commitment
      if (!commitment) return false
      
      decodedCommitment = decodeCommitment(commitment)
      if (!decodedCommitment) return false

      const isGlobalMerchantHash = decodedCommitment.hash === ""
      return mutableNft && isGlobalMerchantHash
    });

    return { ...globalAuthNft, ...decodedCommitment}
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
    cardLogger.log('Updating card with data:', data);
    const response = await backend.patch(`/cards/${this.id}/`, data);
    return response.data;
  }

  /**
   * Switches the active contract version (v1 or 'v2')
   * @param {string} version - 'v1' or 'v2'
   * @returns {Promise<Object>} - Updated card data with new active version
   */
  async activateVersion(version) {
    cardLogger.log(`Activating contract version: ${version}`);
    if (!['v1', 'v2'].includes(version)) {
      throw new Error('Invalid version. Must be "v1" or "v2".');
    }
    const response = await backend.post(`/cards/${this.id}/activate-version/`, { version });
    return response.data;
  }

  /**
   * Sets up on-chain ownership for a contract version by running the standard
   * card-activation flow (linking token, genesis auth token, setOwner, global
   * auth token) against the version contract, then marks the version active.
   * Needed for V1→V2 migration since V2 has its own separate ownership tokens.
   * @param {string} version - 'v1' or 'v2'
   * @param {Function} [callbackOnProgress] - Progress message callback
   * @returns {Promise<Object>} - Updated card data with new active version
   */
  async activateContractVersion(version, callbackOnProgress = null) {
    cardLogger.log(`[Card.activateContractVersion] Setting up ${version} via standard activation...`);
    this._assertWallet();
    this._assertAuthNftService();

    const entry = this.contracts.find(c => c.version === version)
    if (!entry) throw new Error(`No ${version} contract found for this card`)

    // Present the version entry as the card's contract so the standard
    // activation flow operates on the version contract's own tokens.
    const versionCard = new Card({ ...this.raw, contract: { ...entry } });
    versionCard.wallet = this.wallet;
    versionCard.authNftService = this.authNftService;
    versionCard._initializeContract();
    versionCard._assertContract();

    // Guard against silently operating on the wrong contract when the entry
    // carries no usable contract id and initialization falls back elsewhere.
    const derivedAddress = versionCard.contract.getContract().address?.split(':').pop()
    const expectedAddress = entry.cash_address?.split(':').pop()
    if (!derivedAddress || derivedAddress !== expectedAddress) {
      throw new Error(`${version.toUpperCase()} contract address mismatch, cannot set up ownership safely.`)
    }

    // Resolve the linking token to poll for. The backend only broadcasts the
    // token UTXO when asked via the version-aware linking-token request, so
    // merely knowing the provisioned id is not enough: if the wallet does not
    // hold it yet, trigger the send first. The provisioned id on the version
    // contract entry stays authoritative over any stale stored value, and a
    // stored attempt already past the linking stage is resumed untouched.
    const attemptKey = `${this.wallet.walletHash}:${version}`;
    const provisioned = entry.linking_token || null;
    let lastAttempt = await getCardActivationAttempt(attemptKey).catch(() => null);
    const needsToken =
      !lastAttempt ||
      (lastAttempt.status ?? CardActivationStatus.NONE) < CardActivationStatus.LINKING_TOKEN_OBTAINED;
    if (needsToken) {
      let pollCategory = lastAttempt?.linkingCategory || provisioned || null;
      if (pollCategory) {
        const held = await this.wallet.getTokenUtxos(pollCategory).catch(() => []);
        if (!held?.length) pollCategory = null;
      }
      if (!pollCategory) {
        this._notifyCallbackFn(callbackOnProgress, `Requesting ${version.toUpperCase()} linking token...`);
        const trigger = await versionCard.requestLinkingToken({ version });
        if (!trigger || trigger.success === false) {
          throw new Error('Failed to obtain linking token from backend');
        }
        pollCategory = provisioned || trigger.category || null;
        if (!pollCategory) throw new Error('Failed to obtain linking token from backend');
      }
      if (!lastAttempt) {
        cardLogger.log(`[Card.activateContractVersion] Seeding attempt with ${version} linking token`);
        await saveCardActivationAttempt(attemptKey, {
          linkingCategory: pollCategory,
          walletHash: this.wallet.walletHash,
          status: CardActivationStatus.LINKING_TOKEN_REQUESTED,
          createdAt: Date.now(),
        });
        lastAttempt = await getCardActivationAttempt(attemptKey);
      } else if (lastAttempt.linkingCategory !== pollCategory) {
        cardLogger.log(`[Card.activateContractVersion] Refreshing stale ${version} linking token in stored attempt`);
        lastAttempt = await updateCardActivationAttempt(attemptKey, { linkingCategory: pollCategory });
      }
    }

    await versionCard.activate(callbackOnProgress, lastAttempt, { version });

    this._notifyCallbackFn(callbackOnProgress, `Activating ${version.toUpperCase()}...`);
    return this.activateVersion(version);
  }

  async subscribeToTransactions() {
    if (this.isSubscribed) return;
    cardLogger.log('Subscribing to transactions for card ID:', this.id)
    await backend.post(`/cards/${this.id}/subscribe-transactions/`, null).then(() => {
      cardLogger.log('Successfully subscribed to card transactions')
    }).catch(err => {
      cardLogger.error('Error subscribing to card transactions:', err.message || err)
    })
  }

  // ==================== AUTH NFT OPERATIONS ====================

  /**
   * Mints genesis auth token for minting, creates vout=0 UTXO if needed
   * @private
   * @returns {Promise<{tokenId: string, utxos: Array}>}
   */
  async _mintGenesisAuthToken(interval = 1000, maxAttempts = 10) {
    cardLogger.log('Starting genesis token minting...');
    this._assertAuthNftService();

    while (maxAttempts > 0) {
      try {
        const result = await this.authNftService.genesis();
        cardLogger.log('Genesis result:', result);
        
        if (result) {
          if (result.success) {
            const category = result.category
            const utxos = await this.authNftService.getTokenUtxos(category);
            
            return { success: true, category, utxos };
          } else {
            cardLogger.error(result.error?.message || result.error)
            throw new Error('Genesis minting failed: ' + (result.error || 'Unknown error'));
          }
        } else {
          throw new Error('Failed to mint genesis auth token');
        }
        
      } catch (error) {
        cardLogger.error('Error during genesis minting:', error.message || error);
        if (error?.code === INSUFFICIENT_BALANCE_CODE) {
          throw error;
        }
        maxAttempts--;
        if (maxAttempts === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }

  /**
   * Mints global auth token for card
   * @private
   * @returns {Promise<Object>}
   */
  async _mintGlobalAuthToken(tokenId, interval = 1000, maxAttempts = 10) {
    cardLogger.log('Minting global auth token...');
    this._assertAuthNftService();
    cardLogger.log('tokenId:', tokenId)
    while (maxAttempts > 0) {
      try {
        const result = await this.authNftService.mint({ 
            tokenId: tokenId,
            merchants: [{
              authorized: true,
              spendLimitSats: defaultSpendLimitSats,
            }]
        });
        
        cardLogger.log('Global auth token minted:', result);

        return result;
      } catch (error) {
        cardLogger.error('Error during global auth token minting:', error.message || error);
      }
      maxAttempts--;
      if (maxAttempts > 0) {
        cardLogger.log(`Retrying in ${interval}ms... (${maxAttempts} attempts left)`);
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
    cardLogger.log('Issuing merchant auth token...');

    if (!merchant?.id || !merchant?.pubkey) {
      throw new Error('Merchant id and pubkey are required to issue merchant auth token');
    }

    // Guard against minting a duplicate auth token for the same merchant.
    const merchantAuthNfts = await this.getAuthTokenUtxos();
    const { hex: merchantHash } = encodeMerchantHash({ merchantId: merchant.id, merchantPk: merchant.pubkey });
    const hasExistingToken = merchantAuthNfts.some(token => {
      const commitment = token?.token?.nft?.commitment;
      if (!commitment) return false;
      const decoded = decodeCommitment(commitment);
      return decoded?.hash === merchantHash;
    });

    if (hasExistingToken) {
      throw new Error('Merchant auth token with matching commitment already exists.');
    }

    try {
      const mintResult = await this._mintMerchantAuthToken({ authorized, spendLimitSats, merchant }, retryOnFailure);
      const issueResult = await this._issueAuthTokens(this.authCategory);
      return { mintResult, issueResult };
    } catch (error) {
      cardLogger.error('Error during merchant auth token issuance:', error.message || error);
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
    cardLogger.log('Minting merchant auth token...');
    this._assertWallet();
    this._assertAuthNftService();

    if (!merchant || !merchant.id || !merchant.pubkey) {
      throw new Error('Merchant id and pubkey are required to mint merchant auth token');
    }

    const result = await this.authNftService.mint({ 
        tokenId: this.authCategory, 
        merchants: [{
          id: merchant.id,
          pubkey: merchant.pubkey,
          authorized: authorized,
          spendLimitSats: spendLimitSats || defaultSpendLimitSats,
        }]
    });
    cardLogger.log('Merchant auth token minted:', result);
    return result;
  }

  /**
   * Issues all auth tokens to card's token address
   * @private
   * @returns {Promise<Object>}
   */
  async _issueAuthTokens(tokenId, interval = 1000, maxAttempts = 5, toAddress = null) {
    this._assertAuthNftService();
    let lastError = null;
    while (maxAttempts > 0) {
      try {
        const result = await this._attemptIssueAuthTokens(tokenId, toAddress);
        return result;
      } catch (error) {
        lastError = error;
        cardLogger.error('Error issuing auth tokens:', error.message || error);
        maxAttempts--;
        if (maxAttempts > 0) {
          cardLogger.log(`Retrying in ${interval}ms... (${maxAttempts} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, interval));
        } else {
          throw new Error(`Error: ${lastError?.message || lastError}`);
        }
      }
    }
  }

  async _attemptIssueAuthTokens(tokenId, toAddress = null) {
    this._assertAuthNftService();
    const tokenUtxos = await this.wallet.getTokenUtxos(tokenId)
    const mutableTokens = tokenUtxos.filter(utxo => utxo?.token?.nft?.capability === 'mutable');
    
    if (mutableTokens.length === 0) {
      throw new Error('No mutable auth tokens available to issue.');
    }

    const destAddress = toAddress || this.tokenAddress
    const result = await this.authNftService.issue(mutableTokens, destAddress);
    cardLogger.log('Auth tokens issued:', result);
    return result;
  }

  /**
   * Mutates the global auth token commitment
   * @param {Object} options
   * @param {boolean} [options.authorized=true] - Whether to authorize the terminal
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async mutateGlobalAuthToken({ authorized, spendLimitSats, broadcast = true }) {
    cardLogger.log('Mutating global auth token with options:', { authorized, spendLimitSats, broadcast });
    return this._mutateAuthToken({ authorized, spendLimitSats, broadcast });
  }

  /**
   * Mutates the merchant auth token commitment
   * @param {Object} options
   * @param {boolean} [options.authorized=true] - Whether to authorize the merchant
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis
   * @param {Object} options.merchant - Merchant info
   * @param {string} options.merchant.id - Merchant ID
   * @param {string} options.merchant.pubkey - Merchant public key
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async mutateMerchantAuthToken({ authorized = true, spendLimitSats, merchant, broadcast = true }) {
    return this._mutateAuthToken({ authorized, spendLimitSats, merchant, broadcast });
  }

  /**
   * Mutates auth token commitment (global or merchant).
   * @private
   * @param {Object} options
   * @param {boolean} [options.authorized=true] - Whether to authorize
   * @param {number} [options.spendLimitSats] - Spend limit in satoshis
   * @param {Object} [options.merchant] - Merchant info (omit for global)
   * @param {string} [options.merchant.id] - Merchant ID
   * @param {string} [options.merchant.pubkey] - Merchant public key
   * @param {boolean} [options.broadcast=true] - Whether to broadcast the transaction
   * @returns {Promise<Object>}
   */
  async _mutateAuthToken({ authorized, spendLimitSats, merchant, broadcast = true } = {}) {
    this._assertContract();
    this._assertWallet();

    if (merchant && (!merchant.id || !merchant.pubkey)) {
      throw new Error('Merchant id and pubkey are required to mutate merchant auth token');
    }

    try {
      const mutation = {
        authorized: authorized,
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
      cardLogger.log(`Mutating ${mutationTarget} auth token commitment:`, mutations);

      const privateKey = this.wallet.privkey();
      const mutateResponse = await this.contract.mutate({
        ownerWif: privateKey,
        mutations,
        broadcast
      });

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
    cardLogger.log('[card.sweep] Sweeping card BCH balance to external address...');
    this._assertContract();
    this._assertWallet();

    const privateKey = this.wallet.privkey();
    const toAddress = this.wallet.address();
    const built = await this.contract.sweep({ ownerWif: privateKey, toAddress, broadcast: false });
    const txHex = built?.txHex;
    if (!opts.broadcast) return { success: true, txHex, toAddress };
    if (!txHex) throw new Error('Failed to build sweep transaction');
    const result = await broadcastCardTransaction(txHex, 'sweep', { cardIdOrUid: this.id || this.uid });

    cardLogger.log('Sweep response:', result);
    return { ...result, txHex, toAddress };
  }

  /**
   * Sweeps BCH from this contract to another contract version's cash address.
   * Used during V1→V2 migration to move funds before activation.
   * @param {string} version - Target version ('v1' or 'v2')
   * @param {Object} [opts]
   * @param {boolean} [opts.broadcast=true]
   * @returns {Promise<Object>}
   */
  async sweepToVersion(version, opts = { broadcast: true }) {
    cardLogger.log(`[card.sweepToVersion] Sweeping BCH to ${version} address...`);
    this._assertContract();
    this._assertWallet();

    const target = this.contracts.find(c => c.version === version)
    if (!target) throw new Error(`No ${version} contract found for this card`)
    const toAddress = target.cash_address
    if (!toAddress) throw new Error(`${version} contract has no cash address`)

    const privateKey = this.wallet.privkey();
    const built = await this.contract.sweep({ ownerWif: privateKey, toAddress, broadcast: false });
    if (built?.success === false) return { success: false, message: built?.message || 'No BCH balance to sweep.' }
    const txHex = built?.txHex;
    if (!txHex) return { success: false, message: 'No BCH balance to sweep.' }
    if (!opts.broadcast) return { success: true, txHex, toAddress }

    const result = await broadcastCardTransaction(txHex, 'sweep', { cardIdOrUid: this.id || this.uid });
    cardLogger.log('[card.sweepToVersion] Sweep response:', result);
    return { ...result, txHex, toAddress };
  }

  /**
   * Sweeps BCH from one contract version to another. Defaults to the currently
   * active contract as the destination, but an explicit target version can be
   * given (e.g. always sweep V1 -> V2 during migration regardless of which
   * version is active).
   * @param {string} version - Source version ('v1' or 'v2')
   * @param {string} [toVersion] - Destination version; defaults to the active contract.
   * @param {Object} [opts]
   * @param {boolean} [opts.broadcast=true]
   * @returns {Promise<Object>}
   */
  async sweepFromVersion(version, toVersion = null, opts = { broadcast: true }) {
    cardLogger.log(`[card.sweepFromVersion] Sweeping BCH from ${version} to ${toVersion || 'active'} contract...`);
    this._assertWallet();

    const source = this.contracts.find(c => c.version === version)
    if (!source) throw new Error(`No ${version} contract found for this card`)
    const targetVersion = toVersion || this.activeContractVersion
    if (targetVersion === version) {
      return { success: false, message: `Cannot sweep ${version.toUpperCase()} into itself.` }
    }
    const sourceId = source.contract_id || source.id
    if (!sourceId) throw new Error(`${version} contract has no contract id`)
    const target = toVersion
      ? this.contracts.find(c => c.version === toVersion)
      : this.activeContractEntry
    const toAddress = target?.cash_address || this.raw?.contract?.cash_address
    if (!toAddress) throw new Error('Target contract has no cash address')

    const sourceContract = createTapToPay(sourceId, version);
    const privateKey = this.wallet.privkey();
    const built = await sourceContract.sweep({ ownerWif: privateKey, toAddress, broadcast: false });
    if (built?.success === false) return { success: false, message: built?.message || 'No BCH balance to sweep.' }
    const txHex = built?.txHex;
    if (!txHex) return { success: false, message: 'No BCH balance to sweep.' }
    if (!opts.broadcast) return { success: true, txHex, toAddress }

    const result = await broadcastCardTransaction(txHex, 'sweep', { cardIdOrUid: this.id || this.uid });
    cardLogger.log('[card.sweepFromVersion] Sweep response:', result);
    return { ...result, txHex, toAddress };
  }

  /**
   * Sweeps all fungible tokens from the current (inactive) contract to the
   * currently active contract's token address via the backend endpoint.
   * @returns {Promise<{success: boolean|'unknown', txid: string|null}>}
   */
  async sweepFungibleTokensToActive() {
    this._assertWallet();
    const message = `sweep_ft_to_active:${this.id || this.uid}`
    const messageHash = sha256.hash(utf8ToBin(message))
    const privateKeyBin = decodePrivateKeyWif(this.wallet.privkey()).privateKey
    if (typeof privateKeyBin === 'string') throw new Error(privateKeyBin)
    const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
    if (typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin)

    try {
      const response = await backend.post(`/cards/${this.id || this.uid}/sweep-fungible-tokens/`, {
        signature,
      })
      return normalizeFtSweepResult(response?.data)
    } catch (error) {
      if (!error?.response) throw error
      if (error.response.status === 500 && (error.response.data == null || error.response.data === '')) {
        return { success: 'unknown', txid: null }
      }
      const { message: errMsg, requiresSweepAuth } = parseFtSweepError(error)
      const normalized = new Error(errMsg)
      normalized.status = error?.response?.status
      normalized.requiresSweepAuth = requiresSweepAuth
      normalized.cause = error
      throw normalized
    }
  }

  // ==================== HELPERS ====================

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
}

export function normalizeFtBalances(data) {
  const raw = data?.balances || data?.results || data || []
  const list = Array.isArray(raw) ? raw : Object.entries(raw).map(([tokenId, value]) => {
    if (value && typeof value === 'object') return { tokenId, ...value }
    return { tokenId, amount: value }
  })
  return list.map(item => {
    const tokenId = item?.tokenId || item?.token_id || item?.category || item?.id || ''
    const amount = item?.amount ?? item?.balance ?? 0
    return { ...item, tokenId, category: item?.category || tokenId, amount, balance: amount }
  }).filter(item => item.tokenId)
}

export async function fetchFtBalances(contractAddress, { tokenIds = [], includeUtxos = false } = {}) {
  if (!contractAddress) throw new Error('Contract address is required')
  const params = {}
  if (tokenIds?.length) params.tokenIds = tokenIds.join(',')
  if (includeUtxos) params.include_utxos = true
  const response = await backend.get(`/contracts/${contractAddress}/ft/balances/`, { params, authorize: false })
    .catch(error => {
      cardLogger.error('Error fetching FT balances:', error.response || error.message);
      throw error;
    });
  return normalizeFtBalances(response.data)
}

function findTxid(obj, depth = 0) {
  if (!obj || depth > 3) return null
  if (typeof obj === 'string' && /^[0-9a-f]{64}$/i.test(obj)) return obj
  if (typeof obj !== 'object') return null
  for (const key of ['txid', 'tx_id', 'txId', 'transaction_id', 'transactionId', 'hash']) {
    if (typeof obj[key] === 'string' && obj[key]) return obj[key]
  }
  for (const value of Object.values(obj)) {
    const found = findTxid(value, depth + 1)
    if (found) return found
  }
  return null
}

export function normalizeFtSweepResult(data) {
  if (data == null || data === '') return { success: 'unknown', txid: null }
  if (typeof data === 'string') {
    const txid = findTxid(data)
    return { success: txid ? true : 'unknown', txid }
  }
  if (data.success === true || data.ok === true) return { success: true, txid: findTxid(data) }
  if (data.success === false || data.ok === false) return { success: false, txid: findTxid(data) }
  const txid = findTxid(data)
  if (txid) return { success: true, txid }
  if (typeof data === 'object' && Object.keys(data).length === 0) return { success: 'unknown', txid: null }
  return { success: 'unknown', txid: null, raw: data }
}

export function parseFtSweepError(error) {
  const status = error?.response?.status
  const detail = error?.response?.data?.detail || error?.response?.data?.error
    || error?.response?.data?.message || error?.message || 'Sweep failed'
  const detailStr = Array.isArray(detail) ? detail.join(' ') : String(detail || '')
  const requiresSweepAuth = /no sweep auth/i.test(detailStr)
  switch (status) {
    case 400: return { status, message: detail || 'Invalid token or destination address', requiresSweepAuth }
    case 401: return { status, message: 'Session expired. Please re-login and try again.', requiresSweepAuth }
    case 403: {
      if (/sign/i.test(detailStr)) {
        return { status, message: 'Signature rejected — check the signing key matches the card owner', requiresSweepAuth }
      }
      if (requiresSweepAuth) {
        return { status, message: detailStr, requiresSweepAuth: true }
      }
      return { status, message: 'You do not own this card', requiresSweepAuth }
    }
    case 404: return { status, message: 'Card or token not found', requiresSweepAuth }
    case 502: return { status, message: 'Sweep service unavailable. Please try again later.', requiresSweepAuth }
    case 500: return { status, message: 'No confirmation received. Check balances again; tokens may have swept.', requiresSweepAuth }
    default: return { status, message: detailStr, requiresSweepAuth }
  }
}

export function buildSweepMessage(card, tokenId, tokenAddress) {
  const cardRef = card?.uid || String(card?.id)
  return `sweep_ft:${cardRef}:${tokenId}:${tokenAddress}`
}

export function signSweepMessage(privateKeyWif, message) {
  const messageHash = sha256.hash(utf8ToBin(message))
  const privateKeyBin = decodePrivateKeyWif(privateKeyWif).privateKey
  if (typeof privateKeyBin === 'string') throw new Error(privateKeyBin)
  const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
  if (typeof signatureBin === 'string') throw new Error(signatureBin)
  return binToHex(signatureBin)
}

export function isContractHistoryMutation(item) {
  return item?.tx_type === 'mutation'
}

export function getContractHistoryKind(item) {
  if (!item || isContractHistoryMutation(item)) return null
  if (item.direction === 'incoming' && (item.tx_type == null || item.tx_type === '')) return 'cash-in'
  if (item.direction === 'outgoing' && item.tx_type === 'payment') return 'payment'
  if (item.direction === 'outgoing' && item.tx_type === 'sweep') return 'sweep'
  return null
}

export function normalizeContractHistoryItem(item) {
  if (!item) return null
  const kind = getContractHistoryKind(item)
  if (!kind) return null
  const isToken = !!item.is_token
  const tokenAmount = item?.token?.amount ?? null
  const category = item?.token?.category || null
  return {
    id: item.id,
    txid: item.txid,
    direction: item.direction,
    tx_type: item.tx_type,
    kind,
    is_token: isToken,
    value: Number(item?.value ?? 0),
    amount: isToken ? tokenAmount : Number(item?.value ?? 0),
    category,
    token: item?.token || null,
    merchant: item?.merchant || null,
    merchantRefId: item?.merchant?.ref_id ?? null,
    address: item?.address || null,
    card: item?.card || null,
    created_at: item?.created_at || null,
    raw: item,
  }
}

export function normalizeContractHistoryList(items) {
  return (Array.isArray(items) ? items : []).map(normalizeContractHistoryItem).filter(Boolean)
}

export async function broadcastCardTransaction(txHex, txType, { cardIdOrUid } = {}) {
  if (!txHex) throw new Error('tx_hex is required')
  const payload = { tx_hex: txHex, tx_type: txType }
  if (cardIdOrUid) payload.card_id = cardIdOrUid
  const response = await backend.post('/transactions/broadcast/', payload)
    .catch(error => {
      cardLogger.error('Error broadcasting transaction:', error.response || error.message);
      throw error;
    });
  return response.data
}

export async function sweepFungibleTokens(cardIdOrUid, tokenId, tokenAddress, signature) {
  if (!cardIdOrUid) throw new Error('Card id or uid is required')
  if (!tokenId) throw new Error('token_id is required')
  if (!tokenAddress) throw new Error('token_address is required')
  if (!signature) throw new Error('signature is required')
  try {
    const response = await backend.post(`/cards/${cardIdOrUid}/sweep_fungible_tokens/`, {
      token_id: tokenId,
      token_address: tokenAddress,
      signature,
    })
    return normalizeFtSweepResult(response?.data)
  } catch (error) {
    if (!error?.response) throw error
    if (error.response.status === 500 && (error.response.data == null || error.response.data === '')) {
      return { success: 'unknown', txid: null }
    }
    const { message, requiresSweepAuth } = parseFtSweepError(error)
    const normalized = new Error(message)
    normalized.status = error?.response?.status
    normalized.requiresSweepAuth = requiresSweepAuth
    normalized.cause = error
    throw normalized
  }
}

export default Card;

/**
 * Card domain model and workflows for TapToPay cards.
 *
 * Wraps the server card payload with version-aware contract resolution and
 * provides helpers to activate cards, manage auth NFTs, sweep BCH/FTs, and
 * migrate between contract versions. Requires a wallet via
 * `Card.createWithWallet()` or `Card.createInitialized()` before on-chain use.
 */
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
  CardActivationStatus,
  saveCardMigrationAttempt,
  updateCardMigrationAttempt,
  getCardMigrationAttempt,
  clearCardMigrationAttempt,
  CardMigrationStatus,
} from './storage';

import { pubkeyToPkHash } from './utils';
import { encodePointerCommitment, findPointerUtxo, describeMigrationState } from './pointer';

/**
 * Card backed by the server payload plus wallet/contract services.
 *
 * Holds the raw server data in `raw` and resolves addresses and token
 * categories from the active contract version entry. Wallet, AuthNftService,
 * and TapToPay contract are attached by the `create*` factories.
 */
export class Card {
  /**
   * Creates a card wrapper around the server payload.
   * @param {Object} [data] - Server card payload.
   */
  constructor(data) {
    this.raw = data;
    // Normalize default lock status to unlocked (false)
    if (this.raw && this.raw.is_locked === undefined) {
      this.raw.is_locked = false;
    }
  }

  /**
   * Replaces the underlying server payload.
   * @param {Object} data - Server card payload.
   */
  set raw(data) {
    this._rawData = data;
  }

  /**
   * Returns the underlying server payload.
   * @returns {Object}
   */
  get raw() {
    return this._rawData;
  }

  /**
   * Returns the card alias.
   * @returns {string|undefined}
   */
  get alias() {
    return this.raw?.alias;
  }

  /**
   * Returns the server card id.
   * @returns {string|number|undefined}
   */
  get id() {
    return this.raw?.id;
  }

  /**
   * Returns the card UID from the NFC tag.
   * @returns {string|undefined}
   */
  get uid() {
    return this.raw?.uid;
  }

  /**
   * Returns the active contract cash address.
   * @returns {string|undefined}
   */
  get cashAddress() {
    return this._contractSource?.cash_address;
  }

  /**
   * Returns the active contract token address.
   * @returns {string|undefined}
   */
  get tokenAddress() {
    return this._contractSource?.token_address;
  }

  /**
   * Returns the cached BCH balance from server data.
   * @returns {number}
   */
  get bchBalance () {
    return this.raw?.bch_balance || 0;
  }

  /**
   * Returns true when the card is locked.
   * @returns {boolean}
   */
  get isLocked() {
    return !!this.raw?.is_locked;
  }

  /**
   * Returns true when transaction alerts are enabled.
   * @returns {boolean|undefined}
   */
  get isAlertsEnabled() {
    return this.raw?.is_alerts_enabled;
  }

  /**
   * Returns true when subscribed to transaction notifications.
   * @returns {boolean|undefined}
   */
  get isSubscribed() {
    return this.raw?.subscribed_to_transactions;
  }

  /**
   * Returns the active contract auth-token category.
   * @returns {string|undefined}
   */
  get authCategory() {
    return this._contractSource?.auth_token;
  }

  /**
   * Returns the active contract ownership-token category.
   * @returns {string|undefined}
   */
  get ownershipCategory() {
    return this._contractSource?.ownership_token;
  }

  /**
   * Returns true when the card completed activation.
   * @returns {boolean|undefined}
   */
  get isActivated() {
    return this.raw?.is_activated
  }

  /**
   * Returns all contract version entries for the card.
   * @returns {Array}
   */
  get contracts() {
    return this.raw?.contracts || []
  }

  /**
   * Returns the active contract version label (e.g. 'v1', 'v2').
   * @returns {string|null}
   */
  get activeContractVersion() {
    const active = this.contracts.find(c => c.is_active)
    return active?.version || this.raw?.contract?.version || null
  }

  /**
   * Returns true when a v2 contract entry exists.
   * @returns {boolean}
   */
  get hasV2Contract() {
    return this.contracts.some(c => c.version === 'v2')
  }

  /**
   * Returns the v2 contract entry, if present.
   * @returns {Object|null}
   */
  get v2Contract() {
    return this.contracts.find(c => c.version === 'v2') || null
  }

  /**
   * Returns true when v2 is the active contract version.
   * @returns {boolean}
   */
  get isV2Active() {
    return this.activeContractVersion === 'v2'
  }

  /**
   * Checks whether a contract version already has on-chain ownership set up.
   * Used to distinguish "already upgraded" from "currently active version".
   *
   * The version's ownership tokens are sent to the contract before `setOwner`
   * runs, so the mere presence of a `cat` ownership token does not mean
   * ownership is configured (e.g. a freshly regenerated V2 already has its
   * tokens but is not set up yet). The backend `ownership_token` field is
   * scoped to the card rather than the contract version and can report another
   * version's value, so ownership is verified on-chain against the wallet's
   * owner pkh instead.
   * @param {string} version - 'v1' or 'v2'
   * @returns {Promise<boolean>}
   */
  async isVersionOwnershipSet(version) {
    const entry = this.contracts.find(c => c.version === version)
    const contractId = entry?.contract_id || entry?.id
    if (!contractId) return false
    if (!this.wallet) return false
    try {
      const contract = createTapToPay(contractId, version)
      const ownerPkh = pubkeyToPkHash(this.wallet.pubkey())
      return await contract.isOwnershipSet(ownerPkh)
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
    const source = this._contractSource
    if (!source) return;
    const contractId = source.contract_id || source.id
    if (!contractId) return;
    const version = source.version || this.activeContractVersion
    this.contract = createTapToPay(contractId, version);
  }

  /**
   * Returns the active contract version entry, if any.
   * @returns {Object|null}
   */
  get activeContractEntry() {
    return this.contracts.find(c => c.is_active) || null
  }

  /**
   * Resolves the contract entry that the card should operate on. The version
   * entry backing the active contract takes precedence over the legacy
   * top-level `contract` object so V1->V2 switches stay consistent across the
   * contract instance, token/cash addresses and auth categories.
   * @returns {Object|null}
   */
  get _contractSource() {
    const active = this.activeContractEntry
    if (active && (active.contract_id || active.id)) return active
    return this.raw?.contract || active || null
  }

  // ==================== CONTRACT OPERATIONS ====================
  /**
   * Returns BCH balance for card address.
   * Fetches from server data, server queries blockchain.
   * @returns {Promise<number>}
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
   * Sweeps one FT category to the wallet's token address using the on-chain
   * `sweep` function (v2 contracts only).
   * @param {string} tokenId - FT category hex
   * @param {Object} [opts]
   * @param {boolean} [opts.broadcast=true]
   * @returns {Promise<Object>}
   */
  async sweepToken(tokenId, opts = { broadcast: true }) {
    return this.sweepFungibleToken(tokenId, opts);
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
   * Resolves the auth-token category for the card's active contract.
   *
   * The backend `auth_token` field is scoped to the card rather than the
   * contract version, so a V2 contract can report the V1 auth token. The
   * authoritative category is the one committed into the contract's `cat`
   * ownership token, so prefer that and fall back to the backend value.
   * @returns {Promise<string|undefined>}
   */
  async resolveAuthCategory() {
    this._assertContract();
    const fallback = this.authCategory
    try {
      const { authOwnershipToken, authCategory } = await this.contract.getMerchantAuthCategory()
      if (authOwnershipToken && authCategory) return authCategory
    } catch (error) {
      cardLogger.warn('[Card.resolveAuthCategory] Failed to resolve on-chain auth category:', error.message || error)
    }
    return fallback
  }

  /**
   * Gets token UTXOs for card token address
   * @returns {Promise<Array>}
   */
  async getAuthTokenUtxos() {
    this._assertContract();
    const tokenId = await this.resolveAuthCategory()
    cardLogger.log('[Card.getAuthTokenUtxos] querying token UTXOs:', {
      tokenId,
      contractAddress: this.contract?.getContract?.()?.address,
      contractTokenAddress: this.contract?.getContract?.()?.tokenAddress,
    })
    const utxos = await this.contract.getTokenUtxos(tokenId);
    cardLogger.log('[Card.getAuthTokenUtxos] returned UTXOs:', utxos)
    return utxos
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

  /**
   * Submits the linking txid for server validation and processing.
   * @param {string} linkingTxid - Linking (setOwner) transaction id.
   * @returns {Promise<Object>}
   */
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

  /**
   * Polls the wallet until the linking token UTXO appears.
   * @param {string} tokenId - Linking token category.
   * @param {number} [interval=1000] - Delay between attempts in ms.
   * @param {number} [maxAttempts=10] - Maximum number of attempts.
   * @returns {Promise<Array>} The linking token UTXOs once visible.
   */
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

  /**
   * Polls the wallet until a freshly minted pointer NFT (0x02 commitment) is
   * visible in the UTXO set. Backends can lag a few seconds behind broadcast.
   * @param {string} tokenId - Auth category of the origin contract.
   * @param {number} [interval=2000] - Delay between attempts in ms.
   * @param {number} [maxAttempts=15] - Maximum number of attempts.
   * @param {string} [tokenAddress] - Token address to scan; defaults to wallet token address.
   * @returns {Promise<Object>} The pointer UTXO once visible.
   */
  async pollForPointerUtxo(tokenId, interval = 2000, maxAttempts = 15, tokenAddress = null) {
    const address = tokenAddress || this.wallet.tokenAddress();
    cardLogger.log(`Polling for pointer NFT with tokenId: ${tokenId} at ${address}`);
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const walletUtxos = await this.wallet.getTokenUtxos(tokenId, address);
        const pointerUtxo = findPointerUtxo(walletUtxos);
        if (pointerUtxo) {
          cardLogger.log(`Pointer NFT found after ${attempts + 1} attempt(s):`, pointerUtxo);
          return pointerUtxo;
        }
        cardLogger.log(`Attempt ${attempts + 1}/${maxAttempts}: Pointer NFT not visible yet. Retrying in ${interval}ms...`);
      } catch (error) {
        cardLogger.error('Error polling for pointer NFT:', error.message);
      }
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    throw new Error('Pointer NFT was not found in the wallet after minting (timed out waiting for it to appear).');
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
   * @returns {Promise<Object|null>}
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
  async getTransactions({ page, page_size, version } = {}) {
    const cardIdOrUid = this.id || this.uid
    if (!cardIdOrUid) throw new Error('Card id or uid is required')
    const params = {}
    if (page) params.page = page
    if (page_size) params.page_size = page_size
    if (version) params.version = version
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
    const contract = this.contract?.getContract?.()
    cardLogger.log('[Card.getGlobalAuthNft] contract resolution:', {
      activeContractVersion: this.activeContractVersion,
      topLevelContractVersion: this.raw?.contract?.version,
      activeEntryVersion: this.activeContractEntry?.version,
      sourceVersion: this._contractSource?.version,
      sourceContractId: this._contractSource?.contract_id || this._contractSource?.id,
      resolvedContractAddress: contract?.address,
      cardTokenAddress: this.tokenAddress,
      authCategory: this.authCategory,
      topLevelContract: this.raw?.contract,
      contracts: this.contracts.map(c => ({
        version: c.version,
        is_active: c.is_active,
        id: c.id,
        contract_id: c.contract_id,
        auth_token: c.auth_token,
        ownership_token: c.ownership_token,
        token_address: c.token_address,
      })),
    })

    const authTokenUtxos = await this.getAuthTokenUtxos();
    const globalAuthNft = authTokenUtxos.find(utxo => {
      const mutableNft = utxo?.token?.nft?.capability === 'mutable'
      if (!mutableNft) return false

      const commitment = utxo?.token?.nft?.commitment
      if (!commitment) return false

      const decodedCommitment = decodeCommitment(commitment)
      if (!decodedCommitment) return false

      return decodedCommitment.hash === ""
    });

    if (!globalAuthNft) {
      cardLogger.log('[Card.getGlobalAuthNft] no global auth NFT found among', authTokenUtxos.length, 'auth UTXOs')
      return {}
    }

    const decodedCommitment = decodeCommitment(globalAuthNft.token.nft.commitment)
    const result = { ...globalAuthNft, ...decodedCommitment }
    cardLogger.log('[Card.getGlobalAuthNft] global auth NFT found:', result)
    return result
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
    const label = normalizeVersionLabel(version);
    if (!label) {
      throw new Error('Invalid version. Must be a positive integer or "vN".');
    }
    const response = await backend.post(`/cards/${this.id}/activate-version/`, { version: label });
    return response.data;
  }

  /**
   * Sets up on-chain ownership for a contract version by running the standard
   * card-activation flow (linking token, genesis auth token, setOwner, global
   * auth token) against the version contract, then marks the version active.
   * Needed for V1→V2 migration since V2 has its own separate ownership tokens.
   * @param {string} version - 'v1' or 'v2'
   * @param {Function} [callbackOnProgress] - Progress message callback
   * @param {Object} [opts]
   * @param {boolean} [opts.markActive=true] - When false, only sets up on-chain
   *   ownership and leaves the server's active version untouched. Used by
   *   migration so a later failure does not register the card as migrated.
   * @returns {Promise<Object>} - Updated card data with new active version
   */
  async activateContractVersion(version, callbackOnProgress = null, { markActive = true } = {}) {
    cardLogger.log(`[Card.activateContractVersion] Setting up ${version} via standard activation...`);
    this._assertWallet();
    this._assertAuthNftService();

    const entry = this.contracts.find(c => c.version === version)
    if (!entry) throw new Error(`No ${version} contract found for this card`)

    // Present the version entry as the card's contract so the standard
    // activation flow operates on the version contract's own tokens. The
    // `contracts` list is overridden too so the active-entry resolution used
    // by the contract/category/address getters points at this version.
    const versionCard = new Card({
      ...this.raw,
      contract: { ...entry },
      contracts: [{ ...entry, is_active: true }],
    });
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

    // A stored attempt whose linking token no longer matches the contract
    // belongs to a different (relinked) contract. Resuming it would skip
    // minting and try to issue a token that is not in the wallet, so discard it
    // and start this version's activation fresh.
    if (lastAttempt && provisioned && lastAttempt.linkingCategory && lastAttempt.linkingCategory !== provisioned) {
      cardLogger.log(`[Card.activateContractVersion] Discarding stale ${version} attempt for a different contract`);
      await clearCardActivationAttempt(attemptKey).catch(() => {});
      lastAttempt = null;
    }

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
        cardLogger.log(`[Card.activateContractVersion] Resetting attempt for new ${version} linking token`);
        lastAttempt = await saveCardActivationAttempt(attemptKey, {
          linkingCategory: pollCategory,
          walletHash: this.wallet.walletHash,
          status: CardActivationStatus.LINKING_TOKEN_REQUESTED,
          createdAt: lastAttempt.createdAt || Date.now(),
        });
      }
    }

    await versionCard.activate(callbackOnProgress, lastAttempt, { version });

    if (!markActive) {
      cardLogger.log(`[Card.activateContractVersion] Ownership for ${version} set up; leaving active version unchanged`);
      return null;
    }

    this._notifyCallbackFn(callbackOnProgress, `Activating ${version.toUpperCase()}...`);
    return this.activateVersion(version);
  }

  /**
   * Subscribes the card to transaction notifications. No-op when already subscribed.
   * @returns {Promise<void>}
   */
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

    // Reuse a global auth token already minted by a previous partial run so a
    // resume does not fail consuming an already-spent minting UTXO.
    const existing = await this.wallet.getTokenUtxos(tokenId).catch(() => []);
    const existingGlobal = existing.find(utxo => {
      if (utxo?.token?.nft?.capability !== 'mutable') return false;
      const commitment = utxo.token.nft.commitment;
      if (!commitment) return false;
      const decoded = decodeCommitment(commitment);
      return !!decoded && decoded.hash === '';
    });
    if (existingGlobal) {
      cardLogger.log('[Card._mintGlobalAuthToken] reusing existing global auth token:', existingGlobal.txid);
      return { success: true, txid: existingGlobal.txid, reused: true };
    }

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
      const tokenId = await this.resolveAuthCategory();
      const mintResult = await this._mintMerchantAuthToken({ authorized, spendLimitSats, merchant, tokenId }, retryOnFailure);
      const issueResult = await this._issueAuthTokens(tokenId);
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
  async _mintMerchantAuthToken({ authorized = true, spendLimitSats, merchant, tokenId } = {}, retryOnFailure = true) {
    cardLogger.log('Minting merchant auth token...');
    this._assertWallet();
    this._assertAuthNftService();

    if (!merchant || !merchant.id || !merchant.pubkey) {
      throw new Error('Merchant id and pubkey are required to mint merchant auth token');
    }

    const authTokenId = tokenId || await this.resolveAuthCategory()
    const result = await this.authNftService.mint({ 
        tokenId: authTokenId, 
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

  /**
   * Sends all mutable auth tokens under a category to a destination address.
   * @private
   * @param {string} tokenId - Auth token category.
   * @param {string} [toAddress] - Destination; defaults to the card token address.
   * @returns {Promise<Object>}
   */
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

    // A pointer signals the origin contract is retired: its funds must move to
    // the target contract via migration, not be spent out as an origin spend.
    const pointer = await this.findPointerNft().catch(() => null);
    if (pointer) {
      throw new Error('Origin spend blocked: a migration pointer is present. Move funds to the target contract instead.');
    }

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

  // ==================== POINTER / MIGRATION ====================

  /**
   * Builds a Card scoped to a specific contract version. The version entry is
   * presented as the active contract so contract/address/category getters and
   * the auth NFT service all operate on that version's tokens.
   * @private
   * @param {string} version - e.g. 'v1' or 'v2'
   * @returns {Card}
   */
  _scopedVersionCard(version) {
    this._assertWallet();
    const entry = this.contracts.find(c => c.version === version);
    if (!entry) throw new Error(`No ${version} contract found for this card`);
    const scoped = new Card({
      ...this.raw,
      contract: { ...entry },
      contracts: [{ ...entry, is_active: true }],
    });
    scoped.wallet = this.wallet;
    scoped.authNftService = this.authNftService;
    scoped._initializeContract();
    scoped._assertContract();
    return scoped;
  }

  /**
   * Locates the pointer NFT at a contract version's token address.
   * @param {string} [version] - Defaults to the active contract version.
   * @returns {Promise<Object|null>}
   */
  async findPointerNft(version = null) {
    const target = version || this.activeContractVersion;
    const scoped = target ? this._scopedVersionCard(target) : this;
    if (!scoped.contract) return null;
    return scoped.contract.getPointerUtxo();
  }

  /**
   * True when a pointer NFT exists at the given (default: active) contract.
   * @param {string} [version]
   * @returns {Promise<boolean>}
   */
  async hasPointerNft(version = null) {
    return !!(await this.findPointerNft(version));
  }

  /**
   * GET /api/cards/{id}/pointer-state/ — server mirror of the on-chain pointer.
   * The on-chain pointer remains authoritative; this is only a hint/fast path.
   * @returns {Promise<Object>}
   */
  async getPointerState() {
    const idOrUid = this.id || this.uid;
    if (!idOrUid) throw new Error('Card id or uid is required');
    const response = await backend.get(`/cards/${idOrUid}/pointer-state/`)
      .catch(error => {
        cardLogger.error('Error fetching pointer state:', error.response || error.message);
        throw error;
      });
    return response.data || {};
  }

  /**
   * Derives the migration status from the server pointer-state plus on-chain
   * origin funding.
   * @returns {Promise<{status: string, version: number|null, label: string, pointerState: Object}>}
   */
  async getMigrationState() {
    const pointerState = await this.getPointerState().catch(() => ({}));
    let originFunded = false;
    if (pointerState?.pointer_present) {
      const originVersion = pointerState.origin_version != null ? normalizeVersionLabel(pointerState.origin_version) : this.activeContractVersion;
      try {
        const origin = this._scopedVersionCard(originVersion);
        const bch = await origin.getBchBalance().catch(() => 0);
        originFunded = bch > 0;
      } catch (error) {
        cardLogger.warn('[Card.getMigrationState] Failed to read origin funding:', error.message || error);
      }
    }
    return { ...describeMigrationState(pointerState, { originFunded }), pointerState };
  }

  /**
   * Mints the pointer NFT under the ORIGIN auth category and sends it to the
   * ORIGIN contract token address. Refuses to mint when a pointer already
   * exists (use re-point instead).
   * @param {Object} params
   * @param {number} params.version - Target contract version (1..255).
   * @param {string} params.category - Target contract category (params.category encoding).
   * @param {string} [params.sourceVersion] - Origin version; defaults to active.
   * @param {boolean} [params.broadcast=true]
   * @returns {Promise<Object>}
   */
  async mintPointerToken({ version, category, sourceVersion = null, broadcast = true, migrationKey = null } = {}) {
    this._assertWallet();
    this._assertAuthNftService();
    const source = sourceVersion || this.activeContractVersion;
    const origin = this._scopedVersionCard(source);

    const existing = await origin.contract.getPointerUtxo();
    if (existing) {
      throw new Error('Pointer NFT already present. Use re-point instead of minting a second pointer.');
    }

    const tokenId = await origin.resolveAuthCategory();
    const commitment = encodePointerCommitment({ version, category });
    cardLogger.log(`[Card.mintPointerToken] origin=${source} authCategory=${tokenId} -> ${commitment}`);

    // Recover a pointer that was minted on a previous attempt but never issued
    // (e.g. the post-broadcast lookup timed out). Reusing it prevents minting a
    // duplicate pointer NFT under the same auth category. When a prior attempt
    // recorded the exact minted UTXO, prefer that one.
    const record = migrationKey ? await getCardMigrationAttempt(migrationKey).catch(() => null) : null;
    const walletAddress = this.wallet.tokenAddress();
    const walletCandidates = await this.wallet.getTokenUtxos(tokenId, walletAddress);
    let walletPointer = null;
    if (record?.pointerTxid && !record.pointerIssued) {
      walletPointer = walletCandidates.find(u => u.txid === record.pointerTxid && u.vout === record.pointerVout)
        || findPointerUtxo(walletCandidates);
    } else {
      walletPointer = findPointerUtxo(walletCandidates);
    }

    let mintResult = null;
    if (walletPointer) {
      cardLogger.log('[Card.mintPointerToken] reusing unissued pointer already in wallet:', walletPointer.txid);
      if (migrationKey) {
        await updateCardMigrationAttempt(migrationKey, {
          status: CardMigrationStatus.POINTER_MINTED,
          pointerTxid: walletPointer.txid,
          pointerVout: walletPointer.vout,
          pointerIssued: false,
        });
      }
    } else {
      mintResult = await origin.authNftService.mint({
        tokenId,
        merchants: [{ commitment }],
        opts: { broadcast },
      });
      walletPointer = await this.pollForPointerUtxo(tokenId);
      if (migrationKey) {
        await updateCardMigrationAttempt(migrationKey, {
          status: CardMigrationStatus.POINTER_MINTED,
          pointerTxid: walletPointer?.txid || null,
          pointerVout: walletPointer?.vout ?? null,
          pointerIssued: false,
        });
      }
    }

    const issueResult = await origin.authNftService.issue([walletPointer], origin.tokenAddress, { broadcast });
    if (migrationKey) {
      await updateCardMigrationAttempt(migrationKey, {
        status: CardMigrationStatus.POINTER_ISSUED,
        pointerIssued: true,
        pointerCommitment: commitment,
      });
    }

    // If the reused pointer carried a different commitment, correct it on-chain
    // so exactly one pointer points at the requested target.
    const existingCommitment = String(walletPointer?.token?.nft?.commitment || '').toLowerCase();
    if (existingCommitment && existingCommitment !== commitment.toLowerCase()) {
      cardLogger.log('[Card.mintPointerToken] reused pointer commitment differs; re-pointing to target');
      const issuedPointer = await this.pollForPointerUtxo(tokenId, 2000, 15, origin.tokenAddress);
      const repointResult = await origin.contract.mutatePointer({
        ownerWif: this.wallet.privkey(),
        pointerUtxo: issuedPointer,
        commitment,
        broadcast,
      });
      if (migrationKey) {
        await updateCardMigrationAttempt(migrationKey, {
          status: CardMigrationStatus.POINTER_COMMITTED,
          pointerCommitment: commitment,
          pointerIssued: true,
        });
      }
      return { commitment, mintResult, issueResult, repointResult };
    }

    if (migrationKey) {
      await updateCardMigrationAttempt(migrationKey, {
        status: CardMigrationStatus.POINTER_COMMITTED,
        pointerCommitment: commitment,
        pointerIssued: true,
      });
    }
    return { commitment, mintResult, issueResult };
  }

  /**
   * Re-points the existing pointer NFT at the ORIGIN contract to a new
   * commitment. Always mutates the existing pointer; never mints a second one.
   * @param {Object} params
   * @param {number} params.version
   * @param {string} params.category
   * @param {string} [params.sourceVersion] - Origin version; defaults to active.
   * @param {boolean} [params.broadcast=true]
   * @returns {Promise<Object>}
   */
  async repointPointer({ version, category, sourceVersion = null, broadcast = true, migrationKey = null } = {}) {
    this._assertWallet();
    this._assertContract();
    const source = sourceVersion || this.activeContractVersion;
    const origin = this._scopedVersionCard(source);

    const pointerUtxo = await origin.contract.getPointerUtxo();
    if (!pointerUtxo) {
      throw new Error('No pointer NFT found at the origin contract. Cannot re-point; migrate first.');
    }
    
    const commitment = encodePointerCommitment({ version, category });

    // Already pointing at the target: nothing to spend, just keep the record.
    const existingCommitment = String(pointerUtxo?.token?.nft?.commitment || '').toLowerCase();
    if (existingCommitment === commitment.toLowerCase()) {
      cardLogger.log('[Card.repointPointer] pointer already points at target; skipping mutation');
      if (migrationKey) {
        await updateCardMigrationAttempt(migrationKey, {
          status: CardMigrationStatus.POINTER_COMMITTED,
          pointerCommitment: commitment,
          pointerIssued: true,
        });
      }
      return { commitment, skipped: true };
    }

    cardLogger.log(`[Card.repointPointer] origin=${source} pointer=${pointerUtxo.txid}:${pointerUtxo.vout} -> ${commitment}`);
    const result = await origin.contract.mutatePointer({
      ownerWif: this.wallet.privkey(),
      pointerUtxo,
      commitment,
      broadcast,
    });
    if (migrationKey) {
      await updateCardMigrationAttempt(migrationKey, {
        status: CardMigrationStatus.POINTER_COMMITTED,
        pointerCommitment: commitment,
        pointerIssued: true,
      });
    }
    return { commitment, ...result };
  }

  /**
   * Idempotently ensures the origin contract carries a pointer to the target
   * version: mints on first migration, re-points on subsequent ones.
   * @param {number|string} targetVersion
   * @param {Object} [opts]
   * @param {string} [opts.sourceVersion] - Origin version; defaults to active.
   * @param {boolean} [opts.broadcast=true]
   * @returns {Promise<Object>}
   */
  async ensureMigrationPointer(targetVersion, { sourceVersion = null, broadcast = true, migrationKey = null } = {}) {
    this._assertWallet();
    this._assertAuthNftService();
    const targetLabel = normalizeVersionLabel(targetVersion);
    const targetEntry = this.contracts.find(c => c.version === targetLabel);
    if (!targetEntry) throw new Error(`No ${targetLabel} contract found for this card`);

    const targetCategory = this._resolveVersionOwnershipCategory(targetEntry, targetLabel)
      || targetEntry.ownership_token;
    if (!targetCategory) throw new Error('Unable to resolve target contract category');

    const source = sourceVersion || this.activeContractVersion;
    const origin = this._scopedVersionCard(source);
    const existingPointer = await origin.contract.getPointerUtxo();
    const version = parseVersionNumber(targetLabel);

    if (existingPointer) {
      cardLogger.log(`[Card.ensureMigrationPointer] pointer present at ${source}; re-pointing to ${targetLabel}`);
      return { action: 'repoint', ...(await this.repointPointer({ version, category: targetCategory, sourceVersion: source, broadcast, migrationKey })) };
    }

    cardLogger.log(`[Card.ensureMigrationPointer] no pointer at ${source}; minting for ${targetLabel}`);
    return { action: 'mint', ...(await this.mintPointerToken({ version, category: targetCategory, sourceVersion: source, broadcast, migrationKey })) };
  }

  /**
   * Migrates the card from an origin contract to a target version by minting /
   * re-pointing the pointer and moving BCH, then switching the server preimage
   * version. The on-chain pointer is authoritative.
   *
   * Ordering matters: pointer, BCH, activate-version.
   *
   * @param {number|string} targetVersion
   * @param {Object} [opts]
   * @param {string} [opts.sourceVersion] - Origin version; defaults to active.
   * @param {Function} [opts.onProgress]
   * @param {boolean} [opts.broadcast=true]
   * @returns {Promise<Object>}
   */
  async migrateToVersion(targetVersion, { sourceVersion = null, onProgress = null, broadcast = true } = {}) {
    this._assertWallet();
    this._assertAuthNftService();
    const targetLabel = normalizeVersionLabel(targetVersion);
    const targetEntry = this.contracts.find(c => c.version === targetLabel);
    if (!targetEntry) throw new Error(`No ${targetLabel} contract found for this card`);
    const source = sourceVersion || this.activeContractVersion;

    const targetCategory = this._resolveVersionOwnershipCategory(targetEntry, targetLabel)
      || targetEntry.ownership_token;
    if (!targetCategory) throw new Error('Unable to resolve target contract category');

    // Resume a previous partial run for the same source -> target, otherwise
    // start a fresh attempt. Progress is persisted so a failed step (notably a
    // pointer mutation) can be retried without re-minting or re-pointing blindly.
    const migrationKey = this.id || this.uid;
    if (!migrationKey) throw new Error('Card id or uid is required to migrate');
    let attempt = await getCardMigrationAttempt(migrationKey).catch(() => null);
    if (!attempt || attempt.sourceVersion !== source || attempt.targetVersion !== targetLabel) {
      attempt = await saveCardMigrationAttempt(migrationKey, {
        sourceVersion: source,
        targetVersion: targetLabel,
        status: CardMigrationStatus.STARTED,
      });
    } else {
      cardLogger.log(`[Card.migrateToVersion] resuming ${source}->${targetLabel} from status ${attempt.status}`, attempt);
    }

    // 2. Ensure target ownership is set with the user's key. Do NOT flip the
    // server active version yet: only the final step marks the card migrated,
    // so an error in any sweep step leaves the card on the origin version.
    if (attempt.status < CardMigrationStatus.TARGET_OWNERSHIP_SET) {
      this._notifyCallbackFn(onProgress, `Preparing ${targetLabel.toUpperCase()} ownership...`);
      if (!(await this.isVersionOwnershipSet(targetLabel))) {
        await this.activateContractVersion(targetLabel, onProgress, { markActive: false });
      }
      attempt = await updateCardMigrationAttempt(migrationKey, { status: CardMigrationStatus.TARGET_OWNERSHIP_SET });
    }

    // 3. Pointer: mint on first migration, re-point afterwards.
    if (attempt.status < CardMigrationStatus.POINTER_COMMITTED) {
      this._notifyCallbackFn(onProgress, 'Setting migration pointer...');
      await this.ensureMigrationPointer(targetLabel, { sourceVersion: source, broadcast, migrationKey });
      attempt = await updateCardMigrationAttempt(migrationKey, { status: CardMigrationStatus.POINTER_COMMITTED });
    }

    // 4. Move BCH origin -> target.
    let bchResult = null;
    if (attempt.status < CardMigrationStatus.BCH_SWEPT) {
      this._notifyCallbackFn(onProgress, 'Moving BCH to target contract...');
      bchResult = await this.sweepFromVersion(source, targetLabel, { broadcast });
      attempt = await updateCardMigrationAttempt(migrationKey, { status: CardMigrationStatus.BCH_SWEPT });
    }

    // 5. Server preimage version hint. Only now is the card marked migrated.
    this._notifyCallbackFn(onProgress, 'Activating target version...');
    await this.activateVersion(targetLabel);
    await updateCardMigrationAttempt(migrationKey, { status: CardMigrationStatus.ACTIVATED });

    // Completed: drop the local resume record.
    await clearCardMigrationAttempt(migrationKey).catch(() => {});

    // 6. Verify against the on-chain pointer.
    const pointerState = await this.getPointerState().catch(() => ({}));
    return { bchResult, pointerState, targetVersion: targetLabel, targetCategory };
  }

  // ==================== HELPERS ====================

  /**
   * Resolves a contract version's ownership category from the contract itself.
   *
   * The backend `ownership_token` field is scoped to the card rather than the
   * contract version and can report another version's value, so the on-chain
   * contract parameters are authoritative.
   * @private
   * @param {Object} entry - Contract version entry.
   * @param {string} version - Version label (e.g. 'v2').
   * @returns {string|null}
   */
  _resolveVersionOwnershipCategory(entry, version) {
    const contractId = entry?.contract_id || entry?.id;
    if (!contractId) return null;
    try {
      return createTapToPay(contractId, version).getOwnershipCategory();
    } catch (error) {
      cardLogger.warn(`[Card._resolveVersionOwnershipCategory] Failed to derive ${version} category on-chain:`, error.message || error);
      return null;
    }
  }

  /**
   * Calls the progress callback when provided.
   * @private
   * @param {Function} [callback] - Progress message callback.
   * @param {string} message - Progress message.
   * @returns {void}
   */
  _notifyCallbackFn(callback, message) {
    if (callback && typeof callback === 'function') {
      callback(message);
    }
  }
}

/**
 * Normalizes FT balance payloads into a uniform list.
 * @param {Object|Array} data - Raw balances, results, or map payload.
 * @returns {Array<{tokenId: string, category: string, amount: number|string, balance: number|string}>}
 */
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

/**
 * Lists sweepable FT balances for a contract address (no auth).
 * @param {string} contractAddress - Contract cash or token address.
 * @param {Object} [opts]
 * @param {Array<string>} [opts.tokenIds] - Only return these categories.
 * @param {boolean} [opts.includeUtxos] - Include UTXOs per token.
 * @returns {Promise<Array>}
 */
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

/**
 * Normalizes a version into its 'vN' label (e.g. 2 -> 'v2', 'V3' -> 'v3').
 * @param {number|string} version
 * @returns {string|null}
 */
export function normalizeVersionLabel(version) {
  if (version === undefined || version === null || version === '') return null
  const str = String(version).toLowerCase().trim()
  const label = str.startsWith('v') ? str : `v${str}`
  if (!/^v[1-9][0-9]*$/.test(label)) return null
  return label
}

/**
 * Parses a version label into its integer number (e.g. 'v2' -> 2).
 * @param {number|string} version
 * @returns {number}
 */
export function parseVersionNumber(version) {
  const label = normalizeVersionLabel(version)
  if (!label) throw new Error(`Invalid contract version: ${version}`)
  return parseInt(label.slice(1), 10)
}

/**
 * Returns true when a history row is an on-chain mutation.
 * @param {Object} item - ContractHistory row.
 * @returns {boolean}
 */
export function isContractHistoryMutation(item) {
  return item?.tx_type === 'mutation'
}

/**
 * Maps a history row to its display kind.
 * @param {Object} item - ContractHistory row.
 * @returns {string|null} 'cash-in', 'payment', 'sweep', or null when not displayable.
 */
export function getContractHistoryKind(item) {
  if (!item || isContractHistoryMutation(item)) return null
  if (item.direction === 'incoming' && (item.tx_type == null || item.tx_type === '')) return 'cash-in'
  if (item.direction === 'outgoing' && item.tx_type === 'payment') return 'payment'
  if (item.direction === 'outgoing' && item.tx_type === 'sweep') return 'sweep'
  return null
}

/**
 * Normalizes a ContractHistory row for display. Returns null when not displayable.
 * @param {Object} item - ContractHistory row.
 * @returns {Object|null}
 */
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
    version: item?.version ?? null,
    contract: item?.contract ?? null,
    created_at: item?.created_at || null,
    raw: item,
  }
}

/**
 * Normalizes a list of ContractHistory rows, dropping non-displayable ones.
 * @param {Array} items - ContractHistory rows.
 * @returns {Array}
 */
export function normalizeContractHistoryList(items) {
  return (Array.isArray(items) ? items : []).map(normalizeContractHistoryItem).filter(Boolean)
}

/**
 * Broadcasts a card transaction hex via the server.
 * @param {string} txHex - Raw transaction hex.
 * @param {string} txType - Transaction type (e.g. 'sweep').
 * @param {Object} [opts]
 * @param {string} [opts.cardIdOrUid] - Card id or uid for server linkage.
 * @returns {Promise<Object>}
 */
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

export default Card;

import AuthNftService from 'src/services/card/auth-nft.js';
import Card from 'src/services/card/card.js';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { loadWallet } from 'src/services/wallet';
import { backend } from 'src/services/card/backend.js';
import { cardLogger } from 'src/utils/debug-logger.js'

const TOKEN_STORAGE_KEY = 'card-auth-key'

function registrationDetails(wallet) {
    const address_path = wallet.addressPath();
    const public_key = wallet.pubkey(address_path).toLowerCase();
    if (!/^(02|03)[0-9a-f]{64}$/.test(public_key)) {
        throw new Error('Invalid NFC wallet public key');
    }
    return Object.freeze({ wallet_hash: wallet.walletHash, public_key, address_path });
}

function signChallenge(wallet, details, challenge) {
    if (typeof challenge !== 'string' || !challenge.length) {
        throw new Error('Invalid NFC authentication challenge');
    }
    const keypair = wallet.keypair(details.address_path);
    if (keypair.publicKey.toLowerCase() !== details.public_key || wallet.walletHash !== details.wallet_hash) {
        throw new Error('NFC wallet identity changed. Please reopen Cards.');
    }
    try {
        return wallet.signMessage(keypair.privateKey, challenge);
    } catch {
        throw new Error('Unable to sign NFC authentication challenge');
    }
}

function authError(error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const duplicate = status === 409 || (status === 400 &&
        /already|unique|duplicate/i.test(JSON.stringify([data?.wallet_hash, data?.public_key])));
    const message = duplicate
        ? 'This NFC wallet is already registered with another identity. Registration was not changed.'
        : status === 429
            ? `Too many NFC requests. Try again in ${error.retryAfterSeconds ?? 120} seconds.`
            : 'NFC wallet authentication failed. Please try again.';
    const safe = new Error(message);
    safe.response = { status };
    safe.code = duplicate ? 'NFC_IDENTITY_CONFLICT' : error.code;
    safe.retryAfterSeconds = error.retryAfterSeconds;
    return safe;
}

async function userWithWallet(data, wallet) {
    const user = CardUser.parse(data);
    user.wallet = wallet;
    await user._initializeAuthNftService();
    return user;
}

/**
 * Card user authentication and card-data utilities.
 *
 * This module:
 * - Manages challenge/response login
 * - Loads and caches auth session data
 * - Fetches card metadata and token UTXOs
 */

/**
 * Represents a Card User session.
 */
export class CardUser {
    /**
     * @param {object} data
     */
    constructor(data) {
        this.raw = data;
    }

    /**
     * @param {object} data
     * @returns {CardUser}
     */
    static parse(data) {
        return new CardUser(data);
    }
    
    /**
     * @param {object} data
     */
    set raw(data) {
        this._rawData = data;
        this.public_key = data?.public_key;
        this.is_authenticated = data?.is_authenticated;
    }

    /**
     * Raw response payload from backend.
     * @returns {object}
     */
    get raw() {
        return this._rawData;
    }

    get cardCount() {
        return this.raw?.card_count ?? 0;
    }

    // ================ FACTORIES ==================

    /**
     * Creates a CardUser and loads the active wallet.
     * @param {object} data
     * @returns {Promise<CardUser>}
     */
    static async createWithWallet(data) {
        const cardUser = CardUser.parse(data);
        cardUser.wallet = await loadWallet();
        return cardUser;
    }

    /**
     * Creates a CardUser, loads wallet, and initializes auth NFT service.
     * @param {object} data
     * @returns {Promise<CardUser>}
     */
    static async createInitialized(data) {
        const cardUser = await CardUser.createWithWallet(data);
        await cardUser._initializeAuthNftService();
        return cardUser;
    }

    // =============== ASSERTIONS ==================

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
     * Throws if AuthNftService is not initialized
     * @private
     * @returns {void}
     */
    _assertAuthNftService() {
        if (!this.authNftService) {
           throw new Error('AuthNftService not initialized. Use Card.createInitialized() or call _initializeAuthNftService() before calling this method.');
        }
    }

    // =============== INITIALIZERS ==================

    /**
     * Initializes AuthNftService with wallet's private key.
     * @private
     * @returns {Promise<void>}
     */
    async _initializeAuthNftService() {
        this._assertWallet();
        this.authNftService = await AuthNftService.initializeWithWallet(this.wallet.privkey());
    }


    // ================ AUTHENTICATION ==================

    /**
     * Requests an auth challenge from backend.
     * @param {string} publicKey
     * @returns {Promise<string>}
     */
    async getChallenge(publicKey) {
        try {
            const payload = { public_key: publicKey };
            const { data: { challenge } } = await backend.post('/auth/user/challenge/', payload, { authorize: false });
            return challenge;
        } catch (error) {
            throw authError(error);
        }
    }

    /**
     * Verifies the signed challenge and obtains session data.
     * @param {string} publicKey
     * @param {string} signature
     * @returns {Promise<object>}
     */
    async verifyChallenge(publicKey, signature) {
        try {
            const body = {
                public_key: publicKey,
                signature: signature
            };
            const verifyResponse = await backend.post('/auth/user/verify/', body, { authorize: false });
            return verifyResponse.data;
        } catch (error) {
            throw authError(error);
        }
    }

    /**
     * Authenticates the user by signing a challenge with the wallet keypair.
     * @returns {Promise<void>}
     */
    async login(details = registrationDetails(this.wallet)) {
        if (this.public_key && this.public_key.toLowerCase() !== details.public_key) {
            throw authError({ response: { status: 409 } });
        }
        const challenge = await this.getChallenge(details.public_key);
        const signature = signChallenge(this.wallet, details, challenge);
        const loginResp = await this.verifyChallenge(details.public_key, signature);
        if (!loginResp?.token) throw new Error('NFC wallet login did not return a session');
        await saveAuthToken(loginResp);
    }

    // ================ DATA FETCHING ==================

    /**
     * Fetches cards linked to the authenticated user.
     * @returns {Promise<Array<Card>>}
     */
    async fetchCards({page = 1, page_size = 10, filters = {}} = {}) {
        try {
            const response = await backend.get('/cards/', {
                params: {
                    page,
                    page_size,
                    ...filters
                }
            });
            const { results } = response.data;
            const cards = await Promise.all(
                results.map(cardData => (
                    cardData?.contract_id
                        ? Card.createInitialized(cardData)
                        : Card.createWithWallet(cardData)
                ))
            );
            return cards;
        } catch (error) {
            cardLogger.error('Error fetching cards:', error.message || error);
            throw error;
        }
    }

    /**
     * Fetches a specific card by its identifier
     * @param {string} identifier (id | uid | cashaddress | tokenaddress)
     * @returns {Promise<Card>}
     */
    async fetchCardByIdentifier(identifier) {
        try {
            const response = await backend.get(`/cards/by-identifier/${identifier}/`);
            const cardData = response.data;
            const card = cardData?.contract?.contract_id
                ? await Card.createInitialized(cardData)
                : await Card.createWithWallet(cardData);
            return card;
        } catch (error) {
            cardLogger.error(`Error fetching card info for identifier ${identifier}:`, error.message || error);
            throw error;
        }
    }

    /**
     * Fetches the balance of all cards linked to the authenticated user.
     * @returns {Promise<object>} An object containing the balances of all cards.
     */
    async fetchCardsBalance() {
        try {
            const response = await backend.get('/cards/balance/');
            return response.data;
        } catch (error) {
            cardLogger.error('Error fetching card balances:', error.message || error);
            throw error;
        }
    }

    /**
     * Fetches auth token UTXOs for the current wallet.
     * @param {string} tokenId Token ID/category to fetch.
     * @returns {Promise<void>}
     */
    async fetchAuthTokens(tokenId) {
        this._assertWallet();
        this._assertAuthNftService();

        try {
            const utxos = await this.authNftService.getTokenUtxos(tokenId);
            return utxos;
        } catch (error) {
            cardLogger.error('Error fetching token UTXOs:', error.message || error);
            throw error;
        }
    }

    /**
     * Fetches mutable-auth-token UTXOs for the current wallet and token ID.
     * @param {string} tokenId Token ID/category to fetch.
     * @returns {Promise<void>}
     */
    async fetchMutableAuthTokens(tokenId) {
        this._assertWallet();
        this._assertAuthNftService();

        try {
            const utxos = await this.authNftService.getMutableTokens(tokenId);
            return utxos;
        } catch (error) {
            cardLogger.error('Error fetching mutable auth token UTXOs:', error.message || error);
            throw error;
        }
    }


    async _requestLinkingToken(category) {
        this._assertWallet()

        try {
            const body = {
                category: category,
                to_address: this.wallet.tokenAddress()
            }
            const response = await backend.post('/contracts/linking-token/', body);
            return response.data.linking_token;
        } catch (error) {
            cardLogger.error('Error requesting linking token:', error.message || error);
            throw error;
        }
    }

    async linkWithCard(category) {
        const response = await backend.post('/cards/claim/', { category });
        return response.data;
    }

    async linkAndActivateCard(category) {
        // Request to obtain the linking token first
        const linkingToken = await this._requestLinkingToken(category);
        // Link the contract and the card using the linking token
    }
}

/**
 * Fetches CardUser data for a wallet from backend.
 * @param {object} wallet
 * @returns {Promise<CardUser>}
 */
export async function fetchOrCreateCardUser(wallet, { forceLogin = false } = {}) {
    const details = registrationDetails(wallet);
    let existingUser;
    try {
        existingUser = await fetchCardUser(wallet, details);
    } catch (error) {
        if (error.response?.status !== 404) throw error;
    }
    if (existingUser) {
        if (forceLogin) {
            await existingUser.login(details);
            return fetchCardUser(wallet, details);
        }
        return existingUser;
    }
    await clearAuthToken();
    clearCardUserCache();

    for (let attempt = 0; attempt < 2; attempt++) {
        let submitted = false;
        try {
            const issuedAt = Date.now();
            const { data: { challenge } } = await backend.post('/user/registration-challenge/', details, { authorize: false });
            const signature = signChallenge(wallet, details, challenge);
            if (Date.now() - issuedAt >= 120000) {
                if (!attempt) continue;
                throw new Error('NFC registration challenge expired');
            }
            submitted = true;
            const response = await backend.post('/user/', { ...details, challenge, signature }, { authorize: false });
            if (response.status !== 201) throw new Error('Unexpected NFC registration response');
        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;
            const expired = status === 400 && (
                String(data?.code || data?.error).toLowerCase() === 'challenge_expired' ||
                /challenge[^.]*expired|expired[^.]*challenge/i.test(JSON.stringify(data))
            );
            if (expired && !attempt) continue;
            if (submitted && (!status || status >= 500)) {
                try {
                    const user = await userWithWallet({ public_key: details.public_key }, wallet);
                    await user.login(details);
                    return await fetchCardUser(wallet, details);
                } catch (loginError) {
                    if (loginError.response?.status === 429) throw loginError;
                }
            }
            throw authError(error);
        }
        const user = await userWithWallet({ public_key: details.public_key }, wallet);
        await user.login(details);
        return fetchCardUser(wallet, details);
    }
}

async function fetchCardUser(wallet, details = registrationDetails(wallet)) {
    try {
        const response = await backend.get(`/auth/user/${wallet.walletHash}`);
        if (response.data?.public_key?.toLowerCase() !== details.public_key) {
            throw authError({ response: { status: 409 } });
        }
        return await userWithWallet(response.data, wallet);
    } catch (error) {
        throw authError(error);
    }
}

let _cachedUser = null;
let _cachedIdentity = null;
const pendingUsers = new Map();

export async function loadCardUser({ forceLogin = false } = {}) {
    const wallet = await loadWallet();
    const details = registrationDetails(wallet);
    const identity = JSON.stringify(details);
    if (pendingUsers.has(identity)) return pendingUsers.get(identity);
    if (_cachedUser && !forceLogin && _cachedIdentity === identity) return _cachedUser;

    const pending = (async () => {
        let user = await fetchOrCreateCardUser(wallet, { forceLogin });
        if (!user.is_authenticated) {
            await user.login(details);
            user = await fetchCardUser(wallet, details);
        }
        _cachedUser = user;
        _cachedIdentity = identity;
        return user;
    })();
    pendingUsers.set(identity, pending);
    try {
        return await pending;
    } finally {
        pendingUsers.delete(identity);
    }
}

/** Clears the cached CardUser instance.
 */
export function clearCardUserCache() {
  _cachedUser = null;
  _cachedIdentity = null;
}

/**
 * Reads the full auth session from secure storage.
 * @returns {Promise<object|string|null>}
 */
export async function getAuthSession () {
    try {
        const result = await SecureStoragePlugin.get({ key: TOKEN_STORAGE_KEY });
        const rawValue = result.value;
        if (rawValue == null) {
            return null;
        }

        try {
            return JSON.parse(rawValue);
        } catch {
            return rawValue;
        }
    } catch (error) {
            cardLogger.error(`Item with key ${TOKEN_STORAGE_KEY} does not exist:`, error.message || error);
        return null;
    }
}

/**
 * Returns the auth token string from secure storage.
 * @returns {Promise<string|null>}
 */
export async function getAuthToken () {
    const session = await getAuthSession();
    if (session == null) {
        return null;
    }

    if (typeof session === 'object') {
        return session.token ?? null;
    }

    return session;
}

/**
 * Persists auth token or session object into secure storage.
 * @param {string|object} value
 * @returns {Promise<string|undefined>}
 */
export async function saveAuthToken (value) {
    try {
        const storedValue = typeof value === 'string' ? value : JSON.stringify(value);
        const result = await SecureStoragePlugin.set({ key: TOKEN_STORAGE_KEY, value: storedValue });
        return result.value;
    } catch (error) {
            cardLogger.error('Failed to save auth token:', error.message || error);
            throw error;
        }
    }

    /**
     * Clears auth token from secure storage.
     * @returns {Promise<void>}
     */
    export async function clearAuthToken () {
        try {
            await SecureStoragePlugin.remove({ key: TOKEN_STORAGE_KEY })
        } catch (error) {
            cardLogger.error('Failed to clear auth token:', error.message || error);
            throw error;
        }
    }
import Watchtower from 'watchtower-cash-js';
import AuthNftService from './auth-nft.js';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { loadWallet } from 'src/services/wallet';
import { backend } from './backend.js';
import Card from './card.js';

const TOKEN_STORAGE_KEY = 'card-auth-key'

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
     * Raw response payload from backend.
     * @returns {object}
     */
    get raw() {
        return this._rawData;
    }
    
    /**
     * @param {object} data
     */
    set raw(data) {
        this._rawData = data;
        this.id = data?.id;
        this.public_key = data?.public_key;
        this.is_authenticated = data?.is_authenticated;
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
            const { data: { challenge } } = await backend.post('/auth/challenge/', payload);
            return challenge;
        } catch (error) {
            console.error('Failed to get challenge:', error);
            throw new Error('Failed to obtain authentication challenge');
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
            const verifyResponse = await backend.post('/auth/verify/', body);
            return verifyResponse.data;
        } catch (error) {
            console.error('Failed to verify challenge:', error);
            throw new Error('Challenge verification failed');
        }
    }

    /**
     * Authenticates the user by signing a challenge with the wallet keypair.
     * @returns {Promise<void>}
     */
    async login() {
        console.log('Starting Card User login process...');

        try {
            const keypair = this.wallet.keypair();
        
            // obtain challenge from backend
            const challenge = await this.getChallenge(keypair.publicKey);

            // produce a signature with the challenge
            const signature = this.wallet.signMessage(keypair.privateKey, challenge);

            // send to backend to verify and create card session
            const loginResp = await this.verifyChallenge(keypair.publicKey, signature);
            
            // Save token if provided
            if (loginResp?.token) {
                await saveAuthToken(loginResp);
            }

        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // ================ DATA FETCHING ==================

    /**
     * Fetches cards linked to the authenticated user.
     * @returns {Promise<Array<Card>>}
     */
    async fetchCards() {
        console.log('Fetching card info for user...');
        try {
            const response = await backend.get('/cards/');
            const cards = await Promise.all(
                response.data.results.map(cardData => (
                    cardData?.contract_id
                        ? Card.createInitialized(cardData)
                        : Card.createWithWallet(cardData)
                ))
            );
            return cards;
        } catch (error) {
            console.error('Error fetching card info:', error);
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
            console.error('Error fetching token UTXOs:', error);
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
            console.error('Error fetching mutable auth token UTXOs:', error);
            throw error;
        }
    }


    /** Burns all auth tokens for the current wallet and token ID.
     * @param {string} tokenId Token ID/category to burn.
     * @returns {Promise<void>}
     */
    async burnAllAuthTokens(tokenId) {
        return await this._burnAuthTokens({ tokenId, opts: { all: true } });
    }

    /**
     * Burns global auth tokens for the current wallet and token ID.
     * @param {string} tokenId Token ID/category to burn.
     * @returns {Promise<void>}
     */
    async burnGlobalAuthTokens(tokenId) {
        return await this._burnAuthTokens({ tokenId });
    }

    /** Burns merchant-specific auth tokens for the current wallet and token ID.
     * @param {string} tokenId Token ID/category to burn.
     * @param {Array} merchants Array of merchant objects with id and pubkey.
     * @returns {Promise<void>}
     */
    async burnMerchantAuthTokens(tokenId, merchants) {
        if (!merchants || merchants.length === 0) {
            throw new Error('Merchants array is required to burn merchant auth tokens.');
        }
        return await this._burnAuthTokens({ tokenId, merchants });
    }

    /** Burns a single merchant-specific auth token for the current wallet and token ID.
     * @param {string} tokenId Token ID/category to burn.
     * @param {string} merchantId Merchant ID.
     * @param {string} merchantPk Merchant public key.
     * @returns {Promise<void>}
     */
    async burnMerchantAuthToken(tokenId, merchantId, merchantPk) {
        if (!merchantId || !merchantPk) {
            throw new Error('Both merchantId and merchantPk are required to burn a merchant auth token.');
        }
        const merchant = { id: merchantId, pubkey: merchantPk };
        return await this._burnAuthTokens({ tokenId, merchants: [merchant] });
    }

    /**
     * Burns auth tokens for the current wallet, token ID, and optional merchants.
     * @private
     * @param {string} tokenId Token ID/category to burn.
     * @param {Array} merchants Optional array of merchant objects with id and pubkey.
     * @returns {Promise<void>}
     */
    async _burnAuthTokens({ tokenId, merchants = [], opts = {} }) {
        this._assertWallet();
        this._assertAuthNftService();

        try {
            const result = await this.authNftService.burn({ tokenId, merchants, opts });
            return result;
        } catch (error) {
            console.error('Error burning auth tokens:', error);
            throw error;
        }
    }
}

/**
 * Fetches CardUser data for a wallet from backend.
 * @param {object} wallet
 * @returns {Promise<CardUser>}
 */
export async function fetchCardUser(wallet) {
    try {
        const response = await backend.get(`/auth/${wallet.walletHash}`);
        return CardUser.createInitialized(response.data);
    } catch (error) {
        console.error('Card User fetch failed:', error.response?.status || error.message);
        throw error;
    }
}

/**
 * Loads CardUser for active wallet and ensures authenticated session.
 * @returns {Promise<CardUser>}
 */
export async function loadCardUser() {
    try {
        const wallet = await loadWallet();
        const user = await fetchCardUser(wallet);
        
        console.log('[user.js] Loaded Card User:', user);
        
        if (!user.is_authenticated) {
            await user.login();
        }
        
        return user;
    } catch (error) {
        console.error('Error loading Card User:', error);
        if (error.response && error.response.status === 404) {
            console.error('Card User not found for this wallet.');
            await clearAuthToken();
        }
        throw error;
    }
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
        console.error(`Item with key ${TOKEN_STORAGE_KEY} does not exist:`, error);
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
    console.log('Saving auth token...');
    try {
        const storedValue = typeof value === 'string' ? value : JSON.stringify(value);
        const result = await SecureStoragePlugin.set({ key: TOKEN_STORAGE_KEY, value: storedValue });
        const temp = await getAuthToken();
        console.log('Auth token after saving:', temp);
        return result.value;
    } catch (error) {
        console.error('Failed to save auth token:', error);
        throw error;
    }
}

/**
 * Clears auth token from secure storage.
 * @returns {Promise<void>}
 */
export async function clearAuthToken () {
    console.log('Clearing auth token...');
    try {
        SecureStoragePlugin.remove({ key: TOKEN_STORAGE_KEY })
        console.log('Card auth token deleted');
        const authToken = await getAuthToken();
        console.log('Auth token after deletion (should be null):', authToken);
    } catch (error) {
        console.error('Failed to clear auth token:', error);
        throw error;
    }
}
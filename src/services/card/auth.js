import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { loadWallet } from 'src/services/wallet';
import { backend } from './backend.js';
import Card from './card.js';

const TOKEN_STORAGE_KEY = 'card-auth-key'

export class CardUser {
    constructor(data, backendClient = backend, wallet = null) {
        this.backend = backendClient;
        this._rawData = data;
        this.id = data?.id;
        this.public_key = data?.public_key;
        this.is_authenticated = data?.is_authenticated;
        this.wallet = wallet;
    }

    static parse(data) {
        return new CardUser(data);
    }

    get raw() {
        return this._rawData;
    }
    
    set raw(data) {
        this._rawData = data;
        this.id = data?.id;
        this.public_key = data?.public_key;
        this.is_authenticated = data?.is_authenticated;
    }

    async getChallenge(publicKey) {
        try {
            const payload = { public_key: publicKey };
            const { data: { challenge } } = await this.backend.post('/auth/challenge/', payload);
            return challenge;
        } catch (error) {
            console.error('Failed to get challenge:', error);
            throw new Error('Failed to obtain authentication challenge');
        }
    }

    async verifyChallenge(publicKey, signature) {
        try {
            const body = {
                public_key: publicKey,
                signature: signature
            };
            const verifyResponse = await this.backend.post('/auth/verify/', body);
            return verifyResponse.data;
        } catch (error) {
            console.error('Failed to verify challenge:', error);
            throw new Error('Challenge verification failed');
        }
    }

    async login() {
        console.log('Starting Card User login process...');

        try {
            const wallet = await loadWallet();
            const keypair = wallet.keypair();
        
            // obtain challenge from backend
            const challenge = await this.getChallenge(keypair.publicKey);

            // produce a signature with the challenge
            const signature = wallet.signMessage(keypair.privateKey, challenge);

            // send to backend to verify and create card session
            const loginResp = await this.verifyChallenge(keypair.publicKey, signature);
            
            // Save token if provided
            if (loginResp?.token) {
                await saveAuthToken(loginResp.token);
            }

        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    async fetchCards() {
        try {
            const response = await this.backend.get('/cards/');
            const cards = response.data.results.map(cardData => new Card(cardData));
            return cards;
        } catch (error) {
            console.error('Error fetching card info:', error);
            throw error;
        }
    }
    
}

export async function fetchCardUser(wallet) {
    console.log('Fetching Card User for wallet hash:', wallet.walletHash);
    try {
        const response = await backend.get(`/auth/${wallet.walletHash}`);
        console.log('Card User fetched:', response.data);
        return new CardUser(response.data, backend, wallet);
    } catch (error) {
        console.error('Card User fetch failed:', error.response?.status || error.message);
        throw error;
    }
}

export async function loadCardUser() {
    try {
        const wallet = await loadWallet();
        const user = await fetchCardUser(wallet);
        
        if (!user.is_authenticated) {
            await user.login();
        }
        
        return user;
    } catch (error) {
        console.error('Error loading Card User:', error);
        throw error;
    }
}

export async function getAuthToken () {
    try {
        const result = await SecureStoragePlugin.get({ TOKEN_STORAGE_KEY });
        return result.value;
    } catch (error) {
        console.error(`Item with key ${TOKEN_STORAGE_KEY} does not exist:`, error);
        return null;
    }
}

export async function saveAuthToken (value) {
    console.log('Saving auth token...');
    try {
        const result = await SecureStoragePlugin.set({ TOKEN_STORAGE_KEY, value });
        return result.value;
    } catch (error) {
        console.error('Failed to save auth token:', error);
        throw error;
    }
}
/**
 * Card service for managing cryptocurrency card operations:
 * genesis tokens, auth tokens, smart contracts, and UTXO management.
 */

import AuthNft from './auth-nft';
import { defaultSpendLimitSats } from './constants';
import { defaultExpirationBlock } from './auth-nft';
import { TapToPay } from './tap-to-pay';
import { createNFTs, fetchCard, createCard, mutateNFTs } from './backend/api';
import { binToHex } from 'bitauth-libauth-v3';
import { backend } from './backend';
import { loadWallet } from '../wallet';

/** Handles card operations: genesis/auth tokens, smart contracts, UTXO management */
export class Card {
  /** @param {Object} data - Initial card data */
  constructor(data) {
    this.raw = data;
  }

  set raw(data) {
    console.log('=====>>>>>', data)
    this._rawData = data;
  }

  get raw() {
    return this._rawData;
  }

  /**
   * Creates card: mints genesis token, registers on server, links NFT
   * @returns {Promise<{tokenId: string, cardData: Object, genesisResult: Object}>}
   */
  async create() {
    console.log('Starting complete card creation workflow...');
    
    try {

      // Mint genesis token (includes vout=0 management)
      const genesisResult = await this.mintGenesisToken();

      // Create the card from the server
      const cardData = await this.createCardEntry();

      // Save genesis NFT to server
      const response = await this.saveGenesisNft(cardData.id, genesisResult);
      this.raw = {
        ...response.card,
        genesis_nft: response.genesis_nft
      };

      // Mint global auth token
      const mintResult = await this.mintGlobalAuthToken();

      // Issue the global auth token to the card
      const _ = await this.issueGlobalAuthToken(this.raw.token_address);

      // Save global auth token to server
      await this.saveGlobalAuthToken(cardData.id, mintResult);

      console.log('Card creation completed successfully');
      return this
      
    } catch (error) {
      console.error('Error:', error);
      console.error('Card creation workflow failed:', error.response || error.message);
      throw error;
    }
  }

  /**
   * Mints genesis token, creates vout=0 UTXO if needed
   * @returns {Promise<{tokenId: string, utxos: Array}>}
   */
  async mintGenesisToken() {
    console.log('Starting genesis token minting...');

    if (!this.wallet) {
      this.wallet = await loadWallet();
    }

    if (!this.authNft) {
      this.authNft = new AuthNft(this.wallet.privkey());
    }
    
    // Check for vout=0 UTXOs first
    const hasVoutZero = await this.checkForVoutZeroUtxos();

    if (!hasVoutZero) {
      console.log('No vout=0 UTXO available, creating one...');
      await this.createVoutZeroTransaction();
      await this.waitForTransaction();
    }

    try {
      const result = await this.authNft.genesis();
      console.log('Genesis result:', result);
      
      if (result && result.tokenIds && result.tokenIds[0]) {
        const tokenId = result.tokenIds[0];
        const utxos = await this.authNft.getTokenUtxos(tokenId);
        
        return { tokenId, utxos };
      }
      
      throw new Error('No token ID returned from genesis');
      
    } catch (error) {
      if (this.isVoutZeroError(error)) {
        console.error('Still getting vout=0 error after ensuring UTXO exists');
        console.error('Possible causes: UTXO not confirmed, wallet sync issues');
      }
      throw error;
    }
  }

  /**
   * Mints global auth token for card
   * @returns {Promise<Object>}
   */
  async mintGlobalAuthToken() {
    console.log('Minting global auth token...');
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }

    if (!this.authNft) {
      this.authNft = new AuthNft(this.wallet.privkey());
    }

    const result = await this.authNft.mint({ 
        tokenId: this.raw?.genesis_nft?.category, 
        terminals: [{
          authorized: true,
          expirationBlock: await defaultExpirationBlock(),
          spendLimitSats: defaultSpendLimitSats,
        }]
    });
    console.log('Global auth token minted:', result);
    return result;
  }

  async issueGlobalAuthToken(toAddress) {
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }

    if (!this.authNft) {
      this.authNft = new AuthNft(this.wallet.privkey());
    }

    console.log('Issuing global auth token to address:', toAddress);
    const tokenId = this.raw.genesis_nft.category
    const authNfts = await this.authNft.getMutableTokens(tokenId);
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
    const result = await this.authNft.issue({recipients});
    console.log('Global auth token issued:', result);
    return result;
  }

  /**
   * Saves genesis NFT to server
   * @param {number} cardId
   * @param {Object} genesisResult
   * @returns {Promise<Object>}
   */
  async saveGenesisNft(cardId, genesisResult) {
    console.log('Creating server record for genesis NFT...');
    
    if (!genesisResult.utxos || genesisResult.utxos.length === 0) {
      throw new Error('No UTXOs available from genesis result');
    }
    
    const nftData = genesisResult.utxos[0];
    const payload = {
      category: nftData.token?.tokenId,
      txid: nftData.txid,
      card_id: cardId
    };

    console.log('Saving Genesis NFT with payload:', payload);
    const response = await backend.post('/genesis-nfts/', payload);
    console.log('Server record created:', response.data);
    return response.data;
  }

  /**
   * Saves global auth token to server
   * @param {number} cardId
   * @param {Object} mintResult
   * @returns {Promise<Object>}
   */
  async saveGlobalAuthToken(cardId, mintResult) {
    const payload = {
      txid: mintResult.txId,
      card_id: cardId
    };
    console.log('Saving global auth token:', payload);
    const response = await backend.post('/global-auth-nfts/', payload);
    console.log('Server record created:', response.data);
    return response.data;
  }

  /**
   * Creates card entry on server
   * @returns {Promise<Object>}
   */
  async createCardEntry() {
    console.log('Creating card entry...');
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }

    const data = {
      wallet_hash: this.wallet.walletHash,
      public_key: this.wallet.pubkey(),
      address_path: this.wallet.addressPath()
    };
    
    const response = await backend.post('/cards/', data);
    console.log('Card entry created:', response.data);
    return response.data;
  }

  // ==================== UTXO MANAGEMENT ====================

  /**
   * Checks for available vout=0 UTXOs
   * @returns {Promise<boolean>}
   */
  async checkForVoutZeroUtxos() {
    try {
      console.log('Checking for existing vout=0 UTXOs...');
      if (!this.wallet) {
        this.wallet = await loadWallet();
      }
      
      const resp = await this.wallet.getBchUtxos()
      console.log('UTXO response:', resp);
      const utxos = resp.utxos || [];
      const voutZeroUtxos = utxos.filter(utxo => utxo.tx_pos === 0 && utxo.value >= 2000);
      
      console.log(`Found ${voutZeroUtxos.length} existing vout=0 UTXOs`);
      return voutZeroUtxos.length > 0;
      
    } catch (error) {
      console.warn('Could not check existing UTXOs:', error.message);
      return false;
    }
  }

  /**
   * Creates vout=0 UTXO by sending BCH to self
   * @returns {Promise<Object>}
   */
  async createVoutZeroTransaction() {
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }
    console.log('Creating vout=0 transaction...');
    console.log('Genesis tokens require a UTXO with output index 0 (vout=0)');
    
    const wallet = await this.wallet.getRawWallet();
    const receivingAddress = (await wallet.getAddressSetAt(0)).receiving;
    
    console.log('Sending BCH to address (will create vout=0):', receivingAddress);
    
    const sendResult = await wallet.sendBch(0.00002, receivingAddress);
    console.log('Transaction sent:', sendResult);
    
    return sendResult;
  }

  /**
   * Waits for transaction confirmation
   * @param {number} [delayMs=2000]
   * @returns {Promise<void>}
   */
  async waitForTransaction(delayMs = 2000) {
    console.log('Waiting for transaction confirmation for ', delayMs / 1000, 'seconds...');
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Gets token UTXOs for card token address
   * @returns {Promise<Array>}
   */
  async getTokenUtxos() {
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }

    if (!this.authNft) {
      this.authNft = new AuthNft(this.wallet.privkey());
    }

    const tokenId = this.raw?.genesis_nft?.category;
    return await this.authNft.getTokenUtxos(tokenId);
  }

  /**
   * Gets BCH UTXOs for card address
   * @returns {Promise<Object>}
   */
  async getBchUtxos() {
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }
    
    const address = this.raw?.cash_address;
    const rawWallet = await this.wallet.getRawWallet();
    return await rawWallet.watchtower.BCH.getBchUtxos(address);
  }

  async getContract(){
    if (!this.tapToPay) {
      this.initializeTapToPay();
    }
    console.log('this.raw:', this.raw)
    const contractId = this.raw.contract_id;
    console.log('Fetching contract with ID:', contractId);
    const contract = this.tapToPay.getContractFromId(contractId);
    const utxos = await contract.getUtxos()
    console.log('Contract UTXOs:', utxos);

    return contract
  }

  /**
   * Issues auth tokens for terminals
   * @param {Array} terminals
   * @returns {Promise<Object>}
   */
  async issueAuthTokens(terminals) {
    console.log('Issuing auth tokens for terminals...');
    return await this.authTokenManager.issue(terminals);
  }

  // ==================== SMART CONTRACT OPERATIONS ====================

  /**
   * Initializes TapToPay contract
   * @param {string} contractId
   * @returns {TapToPay}
   */
  initializeTapToPay() {
    this.tapToPay = new TapToPay();
    return this.tapToPay;
  }

  /**
   * Mutates auth token permissions
   * @param {string} contractId
   * @param {Array} mutations
   * @param {boolean} [broadcast=true]
   * @returns {Promise<{mutateResponse: Object, serverResponse: Object}>}
   */
  async mutateAuthTokens(contractId, mutations, broadcast = true) {
    if (!this.tapToPay) {
      this.initializeTapToPay(contractId)
    }

    const mutateResponse = await this.tapToPay.mutate({
      senderWif: this.privateKey,
      mutations,
      broadcast
    });

    const mutationData = mutations.map(mutation => {
      const outputs = mutateResponse.outputs || []
      const mutatedOutput = outputs.find(output => !!output.token.nft)
      const commitment = binToHex(mutatedOutput?.token?.nft?.commitment)
      return {
        terminal_id: mutation.id,
        commitment: commitment
      };
    });

    const serverResponse = await mutateNFTs({ mutations: mutationData })

    return { mutateResponse, serverResponse };
  }

  // // this spend function should be in the POS app, not in paytaca-app
  // /**
  //  * Spends from the card (terminal payment)
  //  */
  // async spend(signers, recipient, broadcast = true) {
  //   if (!this.tapToPay) {
  //     throw new Error('TapToPay contract not initialized. Call initializeTapToPay() first.');
  //   }
  //   return await this.tapToPay.spend({ signers, recipient, broadcast });
  // }

  /**
   * Sweeps all funds from card
   * @param {string} toAddress
   * @param {boolean} [broadcast=true]
   * @returns {Promise<Object>}
   */
  async sweep(toAddress, broadcast = true) {
    if (!this.tapToPay) {
      throw new Error('TapToPay contract not initialized. Call initializeTapToPay() first.');
    }
    
    return await this.tapToPay.sweep({
      senderWif: this.privateKey,
      toAddress,
      broadcast
    });
  }

  // ==================== CARD INFO OPERATIONS ====================

  /**
   * Fetches card info from server
   * @returns {Promise<Object>}
   */
  async fetchCardInfo() {
    console.log('Fetching card info for wallet:', this.walletHash);
    return await fetchCard(this.walletHash);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Checks if error is vout=0 related
   * @param {Error} error
   * @returns {boolean}
   */
  isVoutZeroError(error) {
    return error.message?.includes('No suitable inputs with vout=0 available for new token genesis');
  }

  /**
   * Updates private key
   * @param {string} newPrivateKey
   * @returns {void}
   */
  updatePrivateKey(newPrivateKey) {
    this.privateKey = newPrivateKey;
    this.authTokenManager = new AuthTokenManager(newPrivateKey);
    // Note: TapToPay will need to be reinitialized if it was already created
    if (this.tapToPay) {
      console.log('TapToPay contract needs to be reinitialized after key update');
    }
  }

  // ==================== SERVER METHODS ====================

  /**
   * Fetches NFTs for wallet
   * @param {string} walletHash
   * @returns {Promise<Array>}
   */
  async fetchNFTs(walletHash) {
    return await fetchAuthNFTs(walletHash);
  }

  /**
   * Creates NFTs on server
   * @param {Object} nftData
   * @returns {Promise<Object>}
   */
  async createNFTs(nftData) {
    return await createNFTs(nftData);
  }
}

export default Card;

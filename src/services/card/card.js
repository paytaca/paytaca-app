import { loadWallet } from 'src/wallet';
import AuthTokenManager from './auth-token';
import { TapToPay } from './tap-to-pay';
import { createAuthNFTs, fetchCard, createCard } from './api';

/**
 * Main Card class that handles all card-related operations
 * Combines genesis token creation, auth token management, and smart contract operations
 */
export class Card {
  constructor(privateKey, walletIndex, walletHash) {
    this.privateKey = privateKey;
    this.walletIndex = walletIndex;
    this.walletHash = walletHash;
    
    // Initialize sub-managers
    this.authTokenManager = new AuthTokenManager(privateKey);
    this.tapToPay = null; // Will be initialized when needed
  }

  // ==================== GENESIS TOKEN OPERATIONS ====================

  /**
   * Complete card creation workflow
   * 1. Ensures vout=0 UTXO exists
   * 2. Mints genesis token
   * 3. Creates server record
   * 4. Creates card entry
   */
  async createCard(publicKey) {
    console.log('Starting complete card creation workflow...');
    
    try {
      // Step 1: Mint genesis token (includes vout=0 management)
      const genesisResult = await this.mintGenesisToken();
      
      // Step 2: Create server record for genesis NFT
      await this.createGenesisServerRecord(genesisResult);
      
      // Step 3: Create the card entry
      const cardData = await this.createCardEntry(genesisResult.tokenId, publicKey);
      
      console.log('Card creation completed successfully');
      return {
        tokenId: genesisResult.tokenId,
        cardData,
        genesisResult
      };
      
    } catch (error) {
      console.error('Card creation workflow failed:', error);
      throw error;
    }
  }

  /**
   * Mints a genesis token, ensuring vout=0 UTXO is available
   */
  async mintGenesisToken() {
    console.log('Starting genesis token minting...');
    
    // Check for vout=0 UTXOs first
    const hasVoutZero = await this.checkForVoutZeroUtxos();
    
    if (!hasVoutZero) {
      console.log('No vout=0 UTXO available, creating one...');
      await this.createVoutZeroTransaction();
      await this.waitForTransaction();
    }
    
    try {
      const result = await this.authTokenManager.genesis();
      console.log('Genesis result:', result);
      
      if (result && result.tokenIds && result.tokenIds[0]) {
        const tokenId = result.tokenIds[0];
        const utxos = await this.authTokenManager.getTokenUtxos(tokenId);
        
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
   * Creates server record for the genesis NFT
   */
  async createGenesisServerRecord(genesisResult) {
    console.log('Creating server record for genesis NFT...');
    
    if (!genesisResult.utxos || genesisResult.utxos.length === 0) {
      throw new Error('No UTXOs available from genesis result');
    }
    
    const nftData = genesisResult.utxos[0];
    const payload = {
      txid: nftData.txid,
      wallet_hash: this.walletHash,
      category: nftData.token?.tokenId,
      capability: nftData.token?.capability,
      commitment: nftData.token?.commitment,
      satoshis: nftData.satoshis,
      amount: nftData.token?.amount
    };
    
    console.log('Creating Auth NFT with payload:', payload);
    await createAuthNFTs(payload);
    console.log('Server record created');
  }

  /**
   * Creates the final card entry
   */
  async createCardEntry(tokenId, publicKey) {
    console.log('Creating card entry...');
    
    const data = {
      wallet_hash: this.walletHash,
      public_key: publicKey,
      category: tokenId
    };
    
    const response = await createCard(data);
    console.log('Card entry created:', response);
    return response;
  }

  // ==================== UTXO MANAGEMENT ====================

  /**
   * Checks if vout=0 UTXOs are available
   */
  async checkForVoutZeroUtxos() {
    try {
      console.log('Checking for existing vout=0 UTXOs...');
      
      const wallet = await loadWallet('BCH', this.walletIndex);
      const utxos = await wallet.BCH.getUtxos();
      const voutZeroUtxos = utxos.filter(utxo => utxo.vout === 0);
      
      console.log(`Found ${voutZeroUtxos.length} existing vout=0 UTXOs`);
      return voutZeroUtxos.length > 0;
      
    } catch (error) {
      console.warn('Could not check existing UTXOs:', error.message);
      return false;
    }
  }

  /**
   * Creates a vout=0 transaction by sending BCH to self
   */
  async createVoutZeroTransaction() {
    console.log('Creating vout=0 transaction...');
    console.log('Genesis tokens require a UTXO with output index 0 (vout=0)');
    
    const wallet = await loadWallet('BCH', this.walletIndex);
    const receivingAddress = (await wallet.BCH.getAddressSetAt(0)).receiving;
    
    console.log('Sending BCH to address (will create vout=0):', receivingAddress);
    
    const sendResult = await wallet.BCH.sendBch(0.00005, receivingAddress);
    console.log('Transaction sent:', sendResult);
    
    return sendResult;
  }

  /**
   * Waits for transaction confirmation
   */
  async waitForTransaction() {
    console.log('Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // ==================== AUTH TOKEN OPERATIONS ====================

  /**
   * Issues new auth tokens for terminals
   */
  async issueAuthTokens(terminals) {
    console.log('Issuing auth tokens for terminals...');
    return await this.authTokenManager.issue(terminals);
  }

  /**
   * Gets token UTXOs for a specific category
   */
  async getTokenUtxos(tokenId) {
    return await this.authTokenManager.getTokenUtxos(tokenId);
  }

  // ==================== SMART CONTRACT OPERATIONS ====================

  /**
   * Initializes TapToPay contract with card parameters
   */
  initializeTapToPay(contractParams) {
    this.tapToPay = new TapToPay({
      params: contractParams,
      options: { network: 'mainnet' }
    });
    return this.tapToPay;
  }

  /**
   * Mutates auth token permissions
   */
  async mutateAuthTokens(mutations, tokenCategory, broadcast = true) {
    if (!this.tapToPay) {
      throw new Error('TapToPay contract not initialized. Call initializeTapToPay() first.');
    }
    
    return await this.tapToPay.mutate({
      senderWif: this.privateKey,
      tokenCategory,
      mutations,
      broadcast
    });
  }

  /**
   * Spends from the card (terminal payment)
   */
  async spend(signers, recipient, broadcast = true) {
    if (!this.tapToPay) {
      throw new Error('TapToPay contract not initialized. Call initializeTapToPay() first.');
    }
    
    return await this.tapToPay.spend({ signers, recipient, broadcast });
  }

  /**
   * Sweeps all funds from the card
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
   * Fetches card information from server
   */
  async fetchCardInfo() {
    console.log('Fetching card info for wallet:', this.walletHash);
    return await fetchCard(this.walletHash);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Checks if error is related to missing vout=0 inputs
   */
  isVoutZeroError(error) {
    return error.message?.includes('No suitable inputs with vout=0 available for new token genesis');
  }

  /**
   * Updates the private key (useful for testing or key rotation)
   */
  updatePrivateKey(newPrivateKey) {
    this.privateKey = newPrivateKey;
    this.authTokenManager = new AuthTokenManager(newPrivateKey);
    // Note: TapToPay will need to be reinitialized if it was already created
    if (this.tapToPay) {
      console.log('TapToPay contract needs to be reinitialized after key update');
    }
  }
}

export default Card;

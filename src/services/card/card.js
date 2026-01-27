import AuthNft from './auth-nft';
import { defaultSpendLimitSats, minTokenValue } from './constants';
import { defaultExpirationBlock } from './auth-nft';
import { TapToPay } from './tap-to-pay';
import { backend } from './backend';
import { loadWallet } from '../wallet';

export class Card {
  constructor(data) {
    this.raw = data;
    this.initializeTapToPay()
  }

  set raw(data) {
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
      this.raw = response

      // Initialize TapToPay contract
      this.initializeTapToPay()

      // Mint global auth token
      await this.mintGlobalAuthToken();

      // Issue the global auth token to the card
      await this.issueGlobalAuthToken(this.raw.token_address);

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
    
    // Check existing vout=0 UTXOs and calculate needed amount
    const requiredSats = this.estimateGenesisSatsRequirement();
    const existingSats = await this.checkForVoutZeroUtxos();
    
    if (existingSats < requiredSats) {
      const neededSats = requiredSats - existingSats;
      console.log(`Need ${neededSats} more sats (have ${existingSats}, need ${requiredSats})`);
      await this.createVoutZeroTransaction(neededSats);
      await this.waitForTransaction();
    } else {
      console.log(`Sufficient vout=0 UTXOs available: ${existingSats} sats`);
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
        tokenId: this.raw?.category, 
        terminals: [{
          authorized: true,
          expirationBlock: await defaultExpirationBlock(),
          spendLimitSats: defaultSpendLimitSats,
        }]
    });
    console.log('Global auth token minted:', result);
    return result;
  }

  /**
   * Issues global auth token to specified address
   * @param {string} toAddress - Recipient address for the global auth token
   * @returns {Promise<Object>}
   */
  async issueGlobalAuthToken(toAddress) {
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }

    if (!this.authNft) {
      this.authNft = new AuthNft(this.wallet.privkey());
    }

    console.log('Issuing global auth token to address:', toAddress);
    const tokenId = this.raw.category;
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
    };

    console.log('Saving Genesis NFT with payload:', payload);
    const response = await backend.patch(`/cards/${cardId}/`, payload);
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
   * Checks for available vout=0 UTXOs and returns total satoshis
   * @returns {Promise<number>} Total satoshis available in vout=0 UTXOs
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
  async createVoutZeroTransaction(amount) {
    if (!this.wallet) {
      this.wallet = await loadWallet();
    }
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
    const buffer = 15000n; // Larger buffer based on actual requirements (~12k sats observed)
    
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
   * @param {number} [delayMs=6000]
   * @returns {Promise<void>}
   */
  async waitForTransaction(delayMs = 6000) {
    console.log('Waiting for transaction confirmation for ', delayMs / 1000, 'seconds...');
    await new Promise(resolve => setTimeout(resolve, delayMs));
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

  /**
   * Gets token UTXOs for card token address
   * @returns {Promise<Array>}
   */
  async getTokenUtxos() {
    if (!this.tapToPay) {
      this.initializeTapToPay();
    }
    return await this.tapToPay.getTokenUtxos();
  }

  /**
   * Gets BCH UTXOs for card address
   * @returns {Promise<Object>}
   */
  async getBchUtxos() {
    if (!this.tapToPay) {
      this.initializeTapToPay();
    }
    return await this.tapToPay.getBchUtxos();
  }

  /**
   * Gets the TapToPay contract instance
   * @returns {Promise<Object>}
   */
  async getContract(){
    if (!this.tapToPay) {
      this.initializeTapToPay();
    }
    const contract = this.tapToPay.getContract()
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
    if (!this.raw?.contract_id)
      return
    this.tapToPay = new TapToPay(this.raw.contract_id);
  }

  // /**
  //  * Mutates auth token permissions
  //  * @param {string} contractId
  //  * @param {Array} mutations
  //  * @param {boolean} [broadcast=true]
  //  * @returns {Promise<{mutateResponse: Object, serverResponse: Object}>}
  //  */
  // async mutateAuthTokens(contractId, mutations, broadcast = true) {
  //   if (!this.tapToPay) {
  //     this.initializeTapToPay(contractId)
  //   }

  //   const mutateResponse = await this.tapToPay.mutate({
  //     senderWif: this.privateKey,
  //     mutations,
  //     broadcast
  //   });

  //   const mutationData = mutations.map(mutation => {
  //     const outputs = mutateResponse.outputs || []
  //     const mutatedOutput = outputs.find(output => !!output.token.nft)
  //     const commitment = binToHex(mutatedOutput?.token?.nft?.commitment)
  //     return {
  //       terminal_id: mutation.id,
  //       commitment: commitment
  //     };
  //   });

  //   const serverResponse = await mutateNFTs({ mutations: mutationData })

  //   return { mutateResponse, serverResponse };
  // }

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

  // /**
  //  * Sweeps all funds from card
  //  * @param {string} toAddress
  //  * @param {boolean} [broadcast=true]
  //  * @returns {Promise<Object>}
  //  */
  // async sweep(toAddress, broadcast = true) {
  //   if (!this.tapToPay) {
  //     throw new Error('TapToPay contract not initialized. Call initializeTapToPay() first.');
  //   }
    
  //   return await this.tapToPay.sweep({
  //     senderWif: this.privateKey,
  //     toAddress,
  //     broadcast
  //   });
  // }

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
}

export default Card;

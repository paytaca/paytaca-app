import { RpcWebSocketClient } from "rpc-websocket-client";
import EventEmitter from "events";
import { microPoolToPoolV0 } from "./utils";
import { binToHex } from "@bitauth/libauth";
import { attemptTrade } from "./transact";

// const SERVER_URL = 'wss://rostrum.cauldron.quest:50002'
const SERVER_URL = 'wss://rostrum.moria.money:443'


/**
 * @typedef {Object} MicroPool
 * @property {String} poolData.pkh The public key hash of the contract owner in hex format
 * @property {Boolean} poolData.is_withdrawn Whether the contract has been withdrawn
 * @property {String} poolData.spent_utxo_hash Hash of the UTXO that was spent to create this contract (all zeros for new contracts)
 * @property {String} poolData.new_utxo_hash Hash of the UTXO containing this contract
 * @property {String} poolData.new_utxo_txid Transaction ID of the transaction containing this contract
 * @property {Number} poolData.new_utxo_n Output index of the contract in the transaction
 * @property {String} poolData.token_id The 32-byte token ID this contract is for
 * @property {Number} poolData.sats Amount of satoshis locked in the contract
 * @property {Number} poolData.token_amount Amount of tokens locked in the contract
 */

/**
 * @typedef {'disconnected' | 'connecting' | 'connected' | 'reconnecting'} ConnectionState
 */

export class CauldronPoolTracker extends EventEmitter {
  /**
   * @param {Object} [opts]
   * @param {Object} [opts.reconnectionOpts]
   * @param {Boolean} [opts.reconnectionOpts.enable=true]
   * @param {Number} [opts.reconnectionOpts.baseInterval=5000]
   * @param {Number} [opts.reconnectionOpts.exponentialBackoff=1.5]
   * @param {Number} [opts.reconnectionOpts.maxAttempts=5]
   */
  constructor(opts) {
    super();
    
    /** @type {import("@cashlab/cauldron").PoolV0[]} */
    this.microPools = [];

    this.subscribedTokenId = '';
    
    /** @type {ConnectionState} */
    this.connectionState = 'disconnected';
    
    /** @type {String|null} */
    this.pendingTokenId = null;
    
    /** @type {Boolean} */
    this.isConnecting = false;

    // Reconnection configuration
    this.reconnectionOpts = {
      enable: opts?.reconnectionOpts?.enable !== undefined ? opts.reconnectionOpts.enable : true,
      baseInterval: parseInt(opts?.reconnectionOpts?.baseInterval) || 5000,
      exponentialBackoff: parseFloat(opts?.reconnectionOpts?.exponentialBackoff) || 1.5,
      maxAttempts: parseInt(opts?.reconnectionOpts?.maxAttempts) || 5,
    };

    this._currentRetries = 0;
    this._reconnectTimeout = null;

    // https://github.com/radarsu/rpc-websocket-client
    this.rpcClient = new RpcWebSocketClient();
    this.rpcClient.configure({ responseTimeout: 90_000 }) // 1 minute & 30 seconds
    
    // Setup connection event handlers
    this.rpcClient.onOpen(() => {
      this._currentRetries = 0;
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
      this.isConnecting = false;
      
      this.setConnectionState('connected');
      
      // Auto-resubscribe if we have a subscribed token
      if (this.subscribedTokenId) {
        this.resubscribeToken().catch(error => {
          this.emit('error', error);
          console.error('CauldronPoolTracker | Failed to resubscribe after reconnection:', error);
        });
      } else if (this.pendingTokenId) {
        // Subscribe to pending token if connection was pending
        const pendingId = this.pendingTokenId;
        this.pendingTokenId = null;
        this.subscribeToken(pendingId).catch(error => {
          this.emit('error', error);
          console.error('CauldronPoolTracker | Failed to subscribe to pending token:', error);
        });
      }
    });

    this.rpcClient.onCloseHandlers.push(() => {
      this.handleConnectionClose();
    });
    
    this.rpcClient.onAnyMessage((...args) => this.onAnyMessage(...args));
  }

  /**
   * @param {ConnectionState} newState
   */
  setConnectionState(newState) {
    if (this.connectionState === newState) return;
    
    const oldState = this.connectionState;
    this.connectionState = newState;
    
    // Emit state-specific events
    if (newState === 'connected') {
      this.emit('connect');
    } else if (newState === 'disconnected') {
      this.emit('disconnect');
    } else if (newState === 'reconnecting') {
      this.emit('reconnecting');
    }
    
    // Emit generic state change event
    this.emit('statechange', { from: oldState, to: newState });
  }

  /**
   * @returns {ConnectionState}
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Handle connection close with reconnection logic
   */
  handleConnectionClose() {
    this.setConnectionState('disconnected');
    
    if (!this.reconnectionOpts.enable) {
      console.log('CauldronPoolTracker | Websocket closed. Reconnection disabled.');
      return;
    }
    
    if (this._currentRetries >= this.reconnectionOpts.maxAttempts) {
      console.log('CauldronPoolTracker | Websocket closed. Max retries reached.');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    if (!this.subscribedTokenId && !this.pendingTokenId) {
      // No active subscription, no need to reconnect
      return;
    }

    this._currentRetries += 1;
    let timeout = 10000; // default value
    if (!Number.isNaN(this.reconnectionOpts.baseInterval) && !Number.isNaN(this.reconnectionOpts.exponentialBackoff)) {
      timeout = this.reconnectionOpts.baseInterval * (this.reconnectionOpts.exponentialBackoff ** this._currentRetries);
    }

    if (isNaN(timeout) || timeout < 0) {
      console.error(`CauldronPoolTracker | Websocket closed. Invalid reconnection interval ${timeout}`);
      this.emit('error', new Error(`Invalid reconnection interval: ${timeout}`));
      return;
    }

    this.setConnectionState('reconnecting');
    console.log(`CauldronPoolTracker | Websocket closed. Reconnecting in ${timeout}ms (attempt ${this._currentRetries}/${this.reconnectionOpts.maxAttempts})`);
    
    clearTimeout(this._reconnectTimeout);
    this._reconnectTimeout = setTimeout(() => {
      this.reconnect().catch(error => {
        this.emit('error', error);
        console.error('CauldronPoolTracker | Reconnection attempt failed:', error);
      });
    }, timeout);
  }

  /**
   * Attempt to reconnect to the server
   */
  async reconnect() {
    if (this.isConnecting) {
      return; // Prevent multiple simultaneous connection attempts
    }

    try {
      this.isConnecting = true;
      await this.rpcClient.connect(SERVER_URL);
      // onOpen handler will be called automatically and handle resubscription
    } catch (error) {
      this.isConnecting = false;
      // If connection fails, handleConnectionClose will be called again
      throw error;
    }
  }

  /**
   * Resubscribe to the current token after reconnection
   */
  async resubscribeToken() {
    if (!this.subscribedTokenId) return;
    
    try {
      const response = await this.rpcClient.call('cauldron.contract.subscribe', [2, this.subscribedTokenId]);
      this.contractSubscribeUpdate(response);
    } catch (error) {
      console.error('CauldronPoolTracker | Failed to resubscribe to token:', error);
      throw error;
    }
  }

  async subscribeToken(tokenId='') {
    if (!tokenId) {
      throw new Error('Token ID is required');
    }

    // If already subscribed to the same token, return
    if (this.subscribedTokenId === tokenId && this.connectionState === 'connected') {
      return;
    }

    // If connection is connecting or reconnecting, queue the request
    if (this.connectionState === 'connecting' || this.connectionState === 'reconnecting') {
      this.pendingTokenId = tokenId;
      return;
    }

    try {
      // Unsubscribe from current token if switching
      if (this.subscribedTokenId && this.subscribedTokenId !== tokenId) {
        if (this.rpcClient?.ws?.readyState === WebSocket.OPEN) {
          try {
            await this.rpcClient.call('cauldron.contract.unsubscribe', [2, this.subscribedTokenId]);
          } catch (error) {
            console.warn('CauldronPoolTracker | Failed to unsubscribe from previous token:', error);
          }
        }
      }

      // Connect if not already connected
      if (this.rpcClient?.ws?.readyState !== WebSocket.OPEN) {
        this.setConnectionState('connecting');
        this.isConnecting = true;
        await this.rpcClient.connect(SERVER_URL);
        this.isConnecting = false;
      }

      // Subscribe to new token
      const response = await this.rpcClient.call('cauldron.contract.subscribe', [2, tokenId]);
      this.contractSubscribeUpdate(response);
      this.subscribedTokenId = tokenId;
      this.pendingTokenId = null;
    } catch (error) {
      this.isConnecting = false;
      this.setConnectionState('disconnected');
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Connect to the server without subscribing
   */
  async connect() {
    if (this.isConnecting) {
      return; // Prevent multiple simultaneous connection attempts
    }

    if (this.rpcClient?.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      this.setConnectionState('connecting');
      this.isConnecting = true;
      await this.rpcClient.connect(SERVER_URL);
      this.isConnecting = false;
      // onOpen handler will set state to 'connected'
    } catch (error) {
      this.isConnecting = false;
      this.setConnectionState('disconnected');
      this.emit('error', error);
      throw error;
    }
  }

  async unsubscribeToken(closeConnection=false) {
    try {
      if (this.subscribedTokenId && this.rpcClient?.ws?.readyState === WebSocket.OPEN) {
        try {
          await this.rpcClient.call('cauldron.contract.unsubscribe', [2, this.subscribedTokenId]);
        } catch (error) {
          console.warn('CauldronPoolTracker | Failed to unsubscribe from token:', error);
        }
      }

      if (closeConnection && this.rpcClient?.ws) {
        this.rpcClient.ws.close();
      }

      this.microPools = [];
      this.subscribedTokenId = '';
      this.pendingTokenId = null;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Cleanup and destroy the pool tracker instance.
   * Closes connections, stops reconnection, clears timers, and resets state.
   * Should be called when the tracker is no longer needed (e.g., component unmount).
   */
  async cleanup() {
    try {
      // Disable reconnection to prevent new attempts
      this.reconnectionOpts.enable = false;

      // Clear reconnection timeout if it exists
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }

      // Close RPC client connection
      if (this.rpcClient?.ws) {
        try {
          this.rpcClient.ws.close();
        } catch (error) {
          console.warn('CauldronPoolTracker | Error closing WebSocket during cleanup:', error);
        }
      }

      // Remove all event listeners
      this.removeAllListeners();

      // Reset state variables
      this.microPools = [];
      this.subscribedTokenId = '';
      this.pendingTokenId = null;
      this.connectionState = 'disconnected';
      this.isConnecting = false;
      this._currentRetries = 0;
    } catch (error) {
      // Log errors but don't throw - cleanup should complete even if individual steps fail
      console.error('CauldronPoolTracker | Error during cleanup:', error);
    }
  }

  /**
   * 
   * @param {WebSocket.MessageEvent} message 
   */
  onAnyMessage(message) {
    console.log('CauldronPoolTracker |onAnyMessage', message);
    try {
      const data =JSON.parse(message.data)
      if (data?.result?.type ==='update') {
        this.contractSubscribeUpdate(data?.result);
      }
    } catch (error) {
      console.error('CauldronPoolTracker | onAnyMessage error', error);
    }
  }

  /**
   * 
   * @param {Object} data
   * @param {String} data.type
   * @param {MicroPool[]} data.utxos
   */
  contractSubscribeUpdate(data) {
    console.log('CauldronPoolTracker | contractSubscribeUpdate', data);
    if (data.type === 'initial') {
      this.microPools = data.utxos.map(microPoolToPoolV0);
    } else if (data.type === 'update') {
      this.updatePools(data.utxos);
    }
    this.emit('pool-updated');
  }

  /**
   * 
   * @param {MicroPool[]} updatedMicroPools 
   */
  updatePools(updatedMicroPools = []) {
    updatedMicroPools.map(microPoolToPoolV0).forEach(updatedMicroPool => {
      const index = this.microPools.findIndex(pool => {
        return binToHex(pool.parameters.withdraw_pubkey_hash) === binToHex(updatedMicroPool.parameters.withdraw_pubkey_hash)
      });

      if (index !== -1) {
        this.microPools[index] = updatedMicroPool;
      } else {
        this.microPools.push(updatedMicroPool);
      }
    })
  }

  /**
   * @param {Object} opts
   * @param {Boolean} opts.isBuyingToken
   * @param {Number} opts.tokenDecimals 
   * @returns 
   */
  getPriceFromPools(opts) {
    const isBuyingToken = opts?.isBuyingToken;
    const tokenDecimals = opts?.tokenDecimals || 0;

    if (!this.microPools?.length) return null;
    const total_supply = this.microPools
      .map(pool => isBuyingToken ? pool.output.token.amount : pool.output.amount)
      .reduce((subtotal, supply) => subtotal + supply, 0n);
    
    let demand = total_supply * 1n / 100n;
    if (isBuyingToken && demand < 1n * BigInt(10 ** tokenDecimals)) {
      demand = 1n * BigInt(10 ** tokenDecimals);
    } else if (!isBuyingToken && demand < 1_00_000_000n) {
      demand = 1_00_000_000n;
    }
  
    if (demand > total_supply) demand = total_supply * 50n / 100n;

    const tradeResult = attemptTrade({
      pools: this.microPools,
      isBuyingToken: isBuyingToken,
      demand: demand,
    })
    return this.parseRate(tradeResult.summary.rate, tokenDecimals, isBuyingToken);
  }

  /**
   * @param {import("@cashlab/common").Fraction} rate
   * @param {Number} tokenDecimals
   * @param {Boolean} isBuyingToken
   */
  parseRate(rate, tokenDecimals, isBuyingToken) {
    let multiplerDecimals = 8
    let divisorDecimals = tokenDecimals
    if (isBuyingToken) {
      multiplerDecimals = tokenDecimals
      divisorDecimals = 8
    }

    const multiplier = 10n ** BigInt(multiplerDecimals);
    const _price = rate.numerator * multiplier / rate.denominator;

    const divisor = 10 ** divisorDecimals;
    const price = Number(_price) / divisor;
    return price.toFixed(divisorDecimals);
  }
}

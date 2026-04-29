import { RpcWebSocketClient } from "rpc-websocket-client";
import EventEmitter from "events";
import { apiPoolToMicroPool, microPoolToPoolV0 } from "./utils";
import { binToHex } from "@bitauth/libauth";
import { attemptTrade } from "./transact";
import type { PoolV0 } from "@cashlab/cauldron";
import type { Fraction } from "@cashlab/common";
import { cauldronApiAxios } from "./api";

// const SERVER_URL = 'wss://rostrum.cauldron.quest:50002'
const SERVER_URL = 'wss://rostrum.riften.net:443'

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';


export interface ApiPool {
  owner_p2pkh_addr: string;
  owner_pkh: string;
  pool_id: string;
  sats: number;
  token_id: string;
  tokens: number;
  tx_pos: number;
  txid: string;
}

export interface MicroPool {
  pool_id: string;
  pkh: string;
  is_withdrawn: boolean;
  spent_utxo_hash: string;
  new_utxo_hash: string;
  new_utxo_txid: string;
  new_utxo_n: number;
  token_id: string;
  sats: number;
  token_amount: number;
}

interface ReconnectionOptions {
  enable?: boolean;
  baseInterval?: number;
  exponentialBackoff?: number;
  maxAttempts?: number;
}

interface TrackerOptions {
  reconnectionOpts?: ReconnectionOptions;
}

interface UnsubscribeOptions {
  tokenId?: string;
  closeConnection?: boolean;
}

interface PoolUpdatedEvent {
  tokenId?: string;
  type: 'initial' | 'update';
}

interface StateChangeEvent {
  from: ConnectionState;
  to: ConnectionState;
}

interface ContractSubscribeData {
  type: 'initial' | 'update';
  utxos: MicroPool[];
}

interface PriceOptions {
  tokenId: string;
  isBuyingToken: boolean;
  tokenDecimals?: number;
}

/**
 * Multi-token pool tracker that can subscribe to multiple token IDs simultaneously.
 * Use this class when you need to track pools for multiple tokens at once.
 */
export class MultiCauldronPoolTracker extends EventEmitter {
  private tokenPools: Map<string, PoolV0[]>;
  private apiFetchPromises: Map<string, Promise<PoolV0[]>>;
  private subscribedTokenIds: Set<string>;
  private pendingTokenIds: Set<string>;
  private _connectionState: ConnectionState;
  private isConnecting: boolean;
  private reconnectionOpts: Required<ReconnectionOptions>;
  private _reconnectTimestamp: number | undefined;
  private _currentRetries: number;
  private _reconnectTimeout: NodeJS.Timeout | null;
  private rpcClient: RpcWebSocketClient;
  private _rpcClientConnectPromise: Promise<unknown> | undefined;

  constructor(opts: TrackerOptions = {}) {
    super();
    
    this.tokenPools = new Map();
    this.apiFetchPromises = new Map();
    this.subscribedTokenIds = new Set();
    this.pendingTokenIds = new Set();
    this._connectionState = 'disconnected';
    this.isConnecting = false;
    
    this.reconnectionOpts = {
      enable: opts.reconnectionOpts?.enable !== undefined ? opts.reconnectionOpts.enable : true,
      baseInterval: opts.reconnectionOpts?.baseInterval ?? 5000,
      exponentialBackoff: opts.reconnectionOpts?.exponentialBackoff ?? 1.5,
      maxAttempts: opts.reconnectionOpts?.maxAttempts ?? 5,
    };

    this._currentRetries = 0;
    this._reconnectTimeout = null;

    this.rpcClient = new RpcWebSocketClient();
    this.rpcClient.configure({ responseTimeout: 90_000 });
    
    // Setup connection event handlers
    this.rpcClient.onOpen(() => {
      this._currentRetries = 0;
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
        this._reconnectTimestamp = undefined;
      }
      this.isConnecting = false;
      
      this.setConnectionState('connected');
      
      // Auto-resubscribe if we have subscribed tokens
      if (this.subscribedTokenIds.size > 0 || this.pendingTokenIds.size > 0) {
        this.resubscribeTokens().catch((error: Error) => {
          this.emit('error', error);
          console.error('MultiCauldronPoolTracker | Failed to resubscribe after reconnection:', error);
        });
      }
    });

    this.rpcClient.onCloseHandlers.push(() => {
      this.handleConnectionClose();
    });
    
    this.rpcClient.onAnyMessage((...args: unknown[]) => this.onAnyMessage(...args));
  }

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  private setConnectionState(newState: ConnectionState): void {
    if (this._connectionState === newState) return;
    
    const oldState = this._connectionState;
    this._connectionState = newState;
    
    // Emit state-specific events
    if (newState === 'connected') {
      this.emit('connect');
    } else if (newState === 'disconnected') {
      this.emit('disconnect');
    } else if (newState === 'reconnecting') {
      this.emit('reconnecting');
    }
    
    // Emit generic state change event
    if (oldState !== newState) {
      this.emit('statechange', { from: oldState, to: newState } as StateChangeEvent);
    }
  }

  getConnectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Returns array of all subscribed token IDs
   */
  getSubscribedTokenIds(): string[] {
    return Array.from(this.subscribedTokenIds);
  }

  /**
   * Check if a specific token is subscribed
   */
  isSubscribed(tokenId: string): boolean {
    return this.subscribedTokenIds.has(tokenId);
  }

  /**
   * Check if a specific token is currently pending
   */
  isPending(tokenId: string): boolean {
    return this.pendingTokenIds.has(tokenId)
  }

  getReconnectAge(): number | undefined {
    if (this._reconnectTimestamp === undefined || this._reconnectTimestamp === null) {
      return;
    }

    return Date.now() - this._reconnectTimestamp;
  }

  /**
   * Get pools for a specific token
   */
  getPoolsForToken(tokenId: string): PoolV0[] {
    return this.tokenPools.get(tokenId) || [];
  }

  /**
   * Returns all pools across all subscribed tokens
   */
  getAllPools(): PoolV0[] {
    const allPools: PoolV0[] = [];
    for (const pools of this.tokenPools.values()) {
      allPools.push(...pools);
    }
    return allPools;
  }

  /**
   * Returns the internal Map of token IDs to their pools.
   * This is used by prepareSendWithCauldron which expects a Map.
   */
  getTokenPoolsMap(): Map<string, PoolV0[]> {
    return this.tokenPools;
  }

  /**
   * Handle connection close with reconnection logic
   */
  private handleConnectionClose(): void {
    this.setConnectionState('disconnected');
    
    if (!this.reconnectionOpts.enable) {
      console.log('MultiCauldronPoolTracker | Websocket closed. Reconnection disabled.');
      return;
    }
    
    if (this._currentRetries >= this.reconnectionOpts.maxAttempts) {
      console.log('MultiCauldronPoolTracker | Websocket closed. Max retries reached.');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    if (this.subscribedTokenIds.size === 0 && this.pendingTokenIds.size === 0) {
      return;
    }

    this._currentRetries += 1;
    let timeout = 10000;
    if (!Number.isNaN(this.reconnectionOpts.baseInterval) && !Number.isNaN(this.reconnectionOpts.exponentialBackoff)) {
      timeout = this.reconnectionOpts.baseInterval * (this.reconnectionOpts.exponentialBackoff ** this._currentRetries);
    }

    if (isNaN(timeout) || timeout < 0) {
      console.error(`MultiCauldronPoolTracker | Websocket closed. Invalid reconnection interval ${timeout}`);
      this.emit('error', new Error(`Invalid reconnection interval: ${timeout}`));
      return;
    }

    this.setConnectionState('reconnecting');
    console.log(`MultiCauldronPoolTracker | Websocket closed. Reconnecting in ${timeout}ms (attempt ${this._currentRetries}/${this.reconnectionOpts.maxAttempts})`);
    
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }

    if (this._currentRetries === 1) this._reconnectTimestamp = Date.now();
    this._reconnectTimeout = setTimeout(() => {
      this.connect().catch((error: Error) => {
        this.emit('error', error);
        console.error('MultiCauldronPoolTracker | Reconnection attempt failed:', error);
      });
    }, timeout);
  }

  /**
   * Resubscribe to all subscribed & pending tokens after reconnection
   */
  async resubscribeTokens(): Promise<void> {
    const tokenIds = this.subscribedTokenIds.union(this.pendingTokenIds);
    if (tokenIds.size === 0) return;
    
    const errors: Array<{ tokenId: string; error: Error }> = [];
    
    for (const tokenId of tokenIds) {
      try {
        const response = await this.rpcClient.call('cauldron.contract.subscribe', [2, tokenId]);
        this.contractSubscribeUpdate(response as ContractSubscribeData);
        this.subscribedTokenIds.add(tokenId);
        this.pendingTokenIds.delete(tokenId);
      } catch (error) {
        console.error(`MultiCauldronPoolTracker | Failed to resubscribe to token ${tokenId}:`, error);
        errors.push({ tokenId, error: error as Error });
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to resubscribe to ${errors.length} token(s)`);
    }
  }

  /**
   * Subscribe to a token's pool updates
   */
  async subscribeToken(tokenId: string): Promise<void> {
    if (!tokenId) {
      throw new Error('Token ID is required');
    }

    // If already subscribed to the same token, return
    if (this.subscribedTokenIds.has(tokenId) && this._connectionState === 'connected') {
      return;
    }

    // If connection is connecting or reconnecting, queue the request
    if (this._connectionState === 'connecting' || this._connectionState === 'reconnecting') {
      this.pendingTokenIds.add(tokenId);
      return;
    }

    try {
      // Connect if not already connected
      if (this.rpcClient.ws?.readyState !== WebSocket.OPEN) {
        await this.connect();
      }

      // Subscribe to new token
      const response = await this.rpcClient.call('cauldron.contract.subscribe', [2, tokenId]);
      this.contractSubscribeUpdate(response as ContractSubscribeData);
      this.subscribedTokenIds.add(tokenId);
      this.pendingTokenIds.delete(tokenId);
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
  async connect(): Promise<void> {
    if (this.isConnecting) {
      await this._rpcClientConnectPromise;
      return;
    }

    if (this.rpcClient.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.setConnectionState('connecting');
      this.isConnecting = true;
      this._rpcClientConnectPromise = this.rpcClient.connect(SERVER_URL);
      await this._rpcClientConnectPromise;
      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      this.setConnectionState('disconnected');
      this.emit('error', error);
      throw error;
    } finally {
      this._rpcClientConnectPromise = undefined;
    }
  }

  /**
   * Unsubscribe from token(s)
   */
  async unsubscribeToken(opts: UnsubscribeOptions = {}): Promise<void> {
    const { tokenId, closeConnection = false } = opts;
    
    try {
      if (this.rpcClient.ws?.readyState === WebSocket.OPEN) {
        if (tokenId) {
          // Unsubscribe from specific token
          if (this.subscribedTokenIds.has(tokenId)) {
            try {
              await this.rpcClient.call('cauldron.contract.unsubscribe', [2, tokenId]);
            } catch (error) {
              console.warn(`MultiCauldronPoolTracker | Failed to unsubscribe from token ${tokenId}:`, error);
            }
            this.subscribedTokenIds.delete(tokenId);
            this.tokenPools.delete(tokenId);
          }
        } else {
          // Unsubscribe from all tokens
          for (const id of this.subscribedTokenIds) {
            try {
              await this.rpcClient.call('cauldron.contract.unsubscribe', [2, id]);
            } catch (error) {
              console.warn(`MultiCauldronPoolTracker | Failed to unsubscribe from token ${id}:`, error);
            }
          }
          this.subscribedTokenIds.clear();
          this.tokenPools.clear();
        }
      } else {
        // If not connected, just remove from the set/map
        if (tokenId) {
          this.subscribedTokenIds.delete(tokenId);
          this.tokenPools.delete(tokenId);
        } else {
          this.subscribedTokenIds.clear();
          this.tokenPools.clear();
        }
      }

      if (closeConnection && this.rpcClient.ws) {
        this.rpcClient.ws.close();
      }

      // Only clear pending if unsubscribing from all tokens
      if (!tokenId) {
        this.pendingTokenIds.clear();
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Cleanup and destroy the pool tracker instance
   */
  async cleanup(): Promise<void> {
    try {
      // Disable reconnection to prevent new attempts
      this.reconnectionOpts.enable = false;

      // Clear reconnection timeout if it exists
      if (this._reconnectTimeout) {
        clearTimeout(this._reconnectTimeout);
        this._reconnectTimeout = null;
      }

      // Close RPC client connection
      if (this.rpcClient.ws) {
        try {
          this.rpcClient.ws.close();
        } catch (error) {
          console.warn('MultiCauldronPoolTracker | Error closing WebSocket during cleanup:', error);
        }
      }

      // Remove all event listeners
      this.removeAllListeners();

      // Reset state variables
      this.tokenPools.clear();
      this.subscribedTokenIds.clear();
      this.pendingTokenIds.clear();
      this._connectionState = 'disconnected';
      this.isConnecting = false;
      this._currentRetries = 0;
    } catch (error) {
      console.error('MultiCauldronPoolTracker | Error during cleanup:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private onAnyMessage(...args: unknown[]): void {
    console.log('MultiCauldronPoolTracker | onAnyMessage', args);
    try {
      const message = args[0] as { data: string };
      const data = JSON.parse(message.data);
      if (data?.result?.type === 'update') {
        this.contractSubscribeUpdate(data.result as ContractSubscribeData);
      }
    } catch (error) {
      console.error('MultiCauldronPoolTracker | onAnyMessage error', error);
    }
  }

  /**
   * Process contract subscription updates
   */
  private contractSubscribeUpdate(data: ContractSubscribeData): PoolV0[] {
    console.log('MultiCauldronPoolTracker | contractSubscribeUpdate', data);
    // Store pools per token (extract token_id from first utxo if available)
    const tokenId = data.utxos?.[0]?.token_id;
    const pools = data.utxos.map(microPoolToPoolV0) as PoolV0[];
    
    if (data.type === 'initial') {
      if (tokenId) {
        this.tokenPools.set(tokenId, pools);
      }
    } else if (data.type === 'update') {
      this.updatePools(tokenId, data.utxos);
    }
    
    this.emit('pool-updated', { tokenId, type: data.type } as PoolUpdatedEvent);
    return pools;
  }

  /**
   * Update pools for a specific token
   */
  private updatePools(tokenId: string | undefined, updatedMicroPools: MicroPool[]): void {
    if (!tokenId) return;
    
    const currentPools = this.tokenPools.get(tokenId) || [];
    
    updatedMicroPools
      .map(microPool => microPoolToPoolV0(microPool) as PoolV0)
      .forEach((updatedMicroPool: PoolV0) => {
        const index = currentPools.findIndex(pool => {
          return binToHex(pool.parameters.withdraw_pubkey_hash) === binToHex(updatedMicroPool.parameters.withdraw_pubkey_hash)
        });

        if (index !== -1) {
          currentPools[index] = updatedMicroPool;
        } else {
          currentPools.push(updatedMicroPool);
        }
      });
    
    this.tokenPools.set(tokenId, currentPools);
  }

  /**
   * Returns filtered pools for a specific token
   */
  getFilteredPools(tokenId: string): PoolV0[] {
    const MAX = (1n << 63n) - 1n;
    const pools = this.getPoolsForToken(tokenId);
    return pools.filter(pool => {
      const K = pool.output.amount * pool.output.token.amount;
      return K < MAX;
    });
  }

  /**
   * Calculate price from pools for a specific token
   */
  getPriceFromPools(opts: PriceOptions): string | null {
    const { tokenId, isBuyingToken, tokenDecimals = 0 } = opts;

    const pools = this.getPoolsForToken(tokenId);
    if (!pools?.length) return null;
    
    const total_supply = pools
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
      pools: pools,
      isBuyingToken: isBuyingToken,
      demand: demand,
      supply: 0n,
    });
    return this.parseRate(tradeResult.summary.rate, tokenDecimals, isBuyingToken);
  }

  /**
   * Parse rate to price string
   */
  parseRate(rate: Fraction, tokenDecimals: number, isBuyingToken: boolean): string {
    return parseRate(rate, tokenDecimals, isBuyingToken);
  }

  /**
   * Set mock pools for a token (for testing purposes)
   * @param tokenId - The token ID to set pools for
   * @param pools - Array of mock PoolV0 objects
   */
  setMockPools(tokenId: string, pools: PoolV0[]): void {
    this.tokenPools.set(tokenId, pools);
    this.subscribedTokenIds.add(tokenId);
  }

  /**
   * Checks if there is on going fetching of pools for a token via api
   */
  isFetchingPoolsFromApi(tokenId: string): boolean {
    return this.apiFetchPromises.has(tokenId)
  }

  /**
   * Updates the pool map through API requests.
   * The implementation is designed such that there will be at most 1 api call happening for
   * fetching 1 token even if calls for fetching 1 token is spammed.
   * 
   * @fires MultiCauldronPoolTracker#"pool-updated"
   */
  async updatePoolsViaAPI(tokenId: string): Promise<PoolV0[]> {
    try {
      const existing = this.apiFetchPromises.get(tokenId);
      if (existing) return existing;

      const promise = this._updatePoolsViaAPI(tokenId);
      this.apiFetchPromises.set(tokenId, promise);
      return await promise;
    } finally {
      this.apiFetchPromises.delete(tokenId);
    }
  }

  private async _updatePoolsViaAPI(tokenId: string): Promise<PoolV0[]> {
    const params = { token: tokenId };
    const path = 'cauldron/pool/active';
    const response = await cauldronApiAxios.get(path, { params });

    const apiPools = response.data?.active;
    if (!Array.isArray(apiPools)) return Promise.reject({ response });
    const microPools = apiPools.map(pool => apiPoolToMicroPool(pool));
    return this.contractSubscribeUpdate({ type: 'initial', utxos: microPools });
  }
}

/**
 * Parse rate to price string
 */
export function parseRate(rate: Fraction, tokenDecimals: number, isBuyingToken: boolean): string {
  let multiplerDecimals = 8;
  let divisorDecimals = tokenDecimals;
  if (isBuyingToken) {
    multiplerDecimals = tokenDecimals;
    divisorDecimals = 8;
  }

  const multiplier = 10n ** BigInt(multiplerDecimals);
  const _price = rate.numerator * multiplier / rate.denominator;

  const divisor = 10 ** divisorDecimals;
  const price = Number(_price) / divisor;
  return price.toFixed(divisorDecimals);
}

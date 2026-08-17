import { getBaseURL, backend } from ".";
import { bus } from '../event-bus.js';


class PaymnthubWebsocketManager {
  
  constructor() {
    /** @type {WebSocket} */
    this.websocket = null;
    this.wallet = null;

    this.listenersCount = 0;
    this.busListeners = [];

    this.reconnect = { enable: true, retries: 0, maxRetries: 5 }
    this.reconnectTimer = null;
    this.isIntentionallyDisconnected = false;
    this.disconnectTimer = null;
  }

  get bus() {
    return bus
  }

  get busEventName() {
    return 'payment-hub-update';
  }

  async aquire(wallet) {
    this.wallet = wallet;
    this.listenersCount++;
    // A new page arrived before the delayed close
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }

    if (this.websocket?.readyState === WebSocket.OPEN) {
      return this.websocket;
    }

    return await this.connect(wallet);
  }

  async release(delay=1000) {
    this.listenersCount--;
    if (this.listenersCount > 0) return

    // Don't close immediately.
    this.disconnectTimer = setTimeout(() => {
      // Someone may have acquired it while we were waiting.
      if (this.listenersCount === 0) {
        this.disconnect()
      }

      this.disconnectTimer = null
    }, delay)
  }

  async connect(wallet) {
    this.wallet = wallet;
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return this.websocket;
    }

    this.disconnect();
    this.isIntentionallyDisconnected = false;

    try {
      this.websocket = await this.getWebsocket(wallet);

      this.websocket.addEventListener('open', () => {
        this.reconnect.retries = 0;
      });

      this.websocket.addEventListener('message', message => {
        let data = message.data;
        try {
          data = JSON.parse(data)
        } catch {}

        this.bus.emit(this.busEventName, data);
      })

      this.websocket.addEventListener('close', () => {
        this.onWebsocketClose();
      });

      this.websocket.addEventListener('error', error => {
        console.error('PaymentHub websocket error:', error);
      });

      return this.websocket;
    } catch (error) {
      console.error('PaymentHub websocket connection failed:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  onWebsocketClose() {
    if (this.isIntentionallyDisconnected) return;
    if (this.listenersCount === 0) return;

    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (this.reconnect.retries >= this.reconnect.maxRetries) {
      console.warn('PaymentHub websocket max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnect.retries), 5000);
    this.reconnect.retries++;

    console.log(`PaymentHub websocket reconnecting in ${delay}ms (attempt ${this.reconnect.retries}/${this.reconnect.maxRetries})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listenersCount > 0 && this.wallet) {
        this.connect(this.wallet).catch(() => {
          // Error already logged; the close handler will continue reconnection attempts.
        });
      }
    }, delay);
  }

  disconnect() {
    this.isIntentionallyDisconnected = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.websocket?.close?.();
    this.websocket = null;
  }

  addListener(func) {
    if (this.busListeners.includes(func)) return

    this.bus.on(this.busEventName, func);
    this.busListeners.push(func);
  }

  removeListener(func) {
    this.bus.off(this.busEventName, func);
    this.busListeners = this.busListeners.filter(_func => func !== _func)
  }

  async getWebsocket(wallet) {
    const url = new URL(getBaseURL());
    const protocol = url.protocol === 'https' ? 'wss' : 'ws';

    const response = await backend.post('websocket-ticket/', null,  { authorize: true, wallet: wallet });
    const ticket = response.data?.ticket

    const websocketUrl = `${protocol}://${url.host}/ws/updates/?ticket=${ticket}`
    return new WebSocket(websocketUrl);
  }
}

export const paymentHubWebsocketManager = new PaymnthubWebsocketManager();

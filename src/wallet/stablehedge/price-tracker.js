import { Store } from "src/store";

/**
 * Used for tracking age of token prices of token balances being used;
 * placed in single file to minimize number of listeners
 */
class StablehedgeTokenPriceTracker {
  /**
   * @param {import("vuex").Store} store 
   */
  constructor(store) {
    this.$store = store
    this.subscribedKeys = {};
    
    this.intervalId = null;
    this.minAge = 45 * 1000;
    this.interval = 30 * 1000;

    this.updatingPrices = false
  }

  async updatePrices() {
    try {
      if (this.updatingPrices) return Promise.resolve()
      this.updatingPrices = true
      this._updatePricePromise = this.$store
        .dispatch('stablehedge/updateTokenPrices', { minAge: this.minAge })
      await this._updatePricePromise
    } finally {
      this.updatingPrices = false
      delete this._updatePricePromise;
    }
  }

  startInterval() {
    if (this.intervalId) return this.intervalId
    if (!this.intervalFunc) {
      this.intervalFunc = () => {
        const minTokenBalanceTimestamp = this.$store.getters['stablehedge/minTokenBalanceTimestamp']
        if (minTokenBalanceTimestamp == null) return
        const tokenAge = Date.now() - minTokenBalanceTimestamp;

        if (tokenAge > this.minAge) {
          this.updatePrices()
        }
      }
    }

    this.intervalId = setInterval(this.intervalFunc, this.interval);
    return this.intervalId;
  }

  stopInterval() {
    clearInterval(this.intervalId);
    this.intervalId = null
  }

  subscribe(key='') {
    if (!key) {
      key = String(Date.now())
    }

    if (!this.subscribedKeys?.[key]) this.subscribedKeys[key] = 1;
    if (this.shouldStartInterval()) this.startInterval()
    return () => this.unsubscribe(key)
  }

  unsubscribe(key='') {
    if (typeof key !== 'string') return
    delete this.subscribedKeys[key]
    if (this.shouldStopInterval()) this.stopInterval()
  }

  shouldStartInterval() {
    return Object.getOwnPropertyNames(this.subscribedKeys).length > 0
  }

  shouldStopInterval() {
    return !this.shouldStartInterval()
  }
}

export default new StablehedgeTokenPriceTracker(Store)

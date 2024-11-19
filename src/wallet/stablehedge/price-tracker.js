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

    // using Map over Object: https://www.zhenghao.io/posts/object-vs-map
    /** @type {Map<String, String[] | Number>} */
    this.subscribedKeys = new Map();

    this.intervalId = null;
    this.minAge = 45 * 1000;
    this.interval = 30 * 1000;

    this.updatingPrices = false
  }

  get subscribedCategories() {
    const categories = new Set([].map(String))
    this.subscribedKeys.forEach(value => {
      if (!Array.isArray(value)) return
      value.forEach(val => categories.add(val))
    })

    return Array.from(categories)
  }

  async updatePrices() {
    try {
      if (this.updatingPrices) return Promise.resolve()
      this.updatingPrices = true
      this._updatePricePromise = this.$store
        .dispatch(
          'stablehedge/updateTokenPrices',
          {
            minAge: this.minAge,
            includeCategories: this.subscribedCategories,
          })
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
        if (minTokenBalanceTimestamp == null && !this.subscribedCategories?.length) return
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

  /**
   * @param {String} key 
   * @param {String[]} [categories]
   * @returns 
   */
  subscribe(key='', categories) {
    if (!key) {
      key = String(Date.now())
    }

    let keyValue = 1
    if (Array.isArray(categories)) keyValue = categories;
    this.subscribedKeys.set(key, keyValue)
    if (this.shouldStartInterval()) this.startInterval()
    return () => this.unsubscribe(key)
  }

  unsubscribe(key='') {
    this.subscribedKeys.delete(key)
    if (this.shouldStopInterval()) this.stopInterval()
  }

  shouldStartInterval() {
    return this.subscribedKeys.size > 0
  }

  shouldStopInterval() {
    return !this.shouldStartInterval()
  }
}

export default new StablehedgeTokenPriceTracker(Store)

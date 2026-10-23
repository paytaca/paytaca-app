import { Capacitor } from '@capacitor/core'
import { BigNumber } from 'ethers'
import { Store } from 'src/store'
import OrderLiveActivity from './native-plugin'
import {
  OrderKind,
  activityId,
  isSameActivity,
  normalizeMarketplaceOrder,
  normalizeP2POrder,
} from './model'

const STORAGE_KEY = 'order_live_activities'
const MAX_TRACKED = 12
const REFRESH_THROTTLE_MS = 15 * 1000

/**
 * Shared, platform-agnostic controller for order live activities.
 *
 * It owns:
 * - support detection and native listener wiring,
 * - the in-memory registry of tracked orders (persisted to localStorage),
 * - diffing so only meaningful changes hit the native bridge,
 * - best-effort registration of the per-activity push token with the backend
 *   so the server can push live updates while the app is backgrounded,
 * - reconciliation of all active orders on demand.
 *
 * Order pages call `syncP2POrder` / `syncMarketplaceOrder` whenever they fetch
 * fresh order data; the backend push (registered through the token endpoint)
 * keeps the activity current while the app is closed.
 */
class OrderLiveActivityManager {
  constructor () {
    /** @type {Map<String, import('./model').OrderLiveActivity>} */
    this.tracked = new Map()
    /** @type {Map<String, String>} activity id -> native push token */
    this.pushTokens = new Map()
    this.supported = null
    this.platform = Capacitor.getPlatform()
    this._initPromise = null
    this._listenersAttached = false
    this._deviceId = ''
    this._lastRefreshAt = 0
  }

  /**
   * Idempotent initialization. Safe to call from multiple places.
   * @returns {Promise<Boolean>} whether native live activities are supported
   */
  init () {
    if (this._initPromise) return this._initPromise
    this._initPromise = this._init()
    return this._initPromise
  }

  async _init () {
    this.restore()
    try {
      const result = await OrderLiveActivity.isSupported()
      this.supported = Boolean(result?.supported)
    } catch (error) {
      console.debug('Order live activity native support check failed:', error)
      this.supported = false
    }
    if (this.supported) await this.attachNativeListeners()
    return this.supported
  }

  isSupported () {
    return Boolean(this.supported)
  }

  async attachNativeListeners () {
    if (this._listenersAttached) return
    this._listenersAttached = true
    try {
      await OrderLiveActivity.addListener('activityPushToken', data => this.onPushToken(data))
    } catch (error) {
      console.warn('Failed to attach order live activity listeners:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Registry
  // ---------------------------------------------------------------------------

  get (id) {
    return this.tracked.get(id)
  }

  list () {
    return Array.from(this.tracked.values())
  }

  restore () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      parsed.forEach(activity => {
        if (!activity?.id || activity.isTerminal) return
        this.tracked.set(activity.id, activity)
      })
    } catch (error) {
      console.warn('Failed to restore order live activities:', error)
    }
  }

  persist () {
    try {
      const activities = this.list().filter(activity => !activity.isTerminal).slice(-MAX_TRACKED)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
    } catch (error) {
      console.warn('Failed to persist order live activities:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  /**
   * Start or update the activity for a single order. Terminal orders are ended.
   * @param {import('./model').OrderLiveActivity|null} activity
   */
  async sync (activity) {
    if (!activity?.id) return
    await this.init()

    const existing = this.tracked.get(activity.id)

    if (activity.isTerminal) {
      // Nothing tracked means there is no activity to end (restore() and
      // persist() both drop terminal entries), so skip the native/backend work.
      if (existing) await this.stop(activity.id, activity)
      return
    }

    this.tracked.set(activity.id, activity)
    this.persist()

    if (!this.supported) return
    if (existing && isSameActivity(existing, activity)) return

    try {
      await OrderLiveActivity[existing ? 'update' : 'start']({ activity })
      this.postPushRegistration(activity, existing ? 'update' : 'start')
    } catch (error) {
      console.warn(`Failed to ${existing ? 'update' : 'start'} order live activity:`, error)
    }
  }

  async syncP2POrder (order) {
    return this.sync(normalizeP2POrder(order))
  }

  async syncMarketplaceOrder (order, opts) {
    return this.sync(normalizeMarketplaceOrder(order, opts))
  }

  /**
   * End an activity, optionally rendering one last (terminal) state.
   * @param {String} id
   * @param {import('./model').OrderLiveActivity} [finalActivity]
   */
  async stop (id, finalActivity) {
    if (!id) return
    const activity = finalActivity || this.tracked.get(id)

    if (activity) await this.unregisterPushToken(activity)

    this.tracked.delete(id)
    this.persist()

    if (!this.supported) return
    try {
      await OrderLiveActivity.end({ id, activity: activity || undefined })
    } catch (error) {
      console.warn('Failed to end order live activity:', error)
    }
  }

  /**
   * Stop tracking a specific order by kind + order id.
   */
  async stopOrder (kind, orderId) {
    return this.stop(activityId(kind, orderId))
  }

  /**
   * Clear every tracked activity. Call on logout / wallet switch.
   */
  async stopAll () {
    const activities = this.list()
    // Capture tokens first: clearing the map below would leave iOS without a
    // token to address when posting the `end` registration.
    const tokens = Array.from(this.pushTokens.entries())

    this.tracked.clear()
    this.pushTokens.clear()
    this.persist()

    // Best-effort backend cleanup so the server stops pushing to stale tokens.
    // Awaited so a wallet switch finishes cleanup before rebuilding.
    await Promise.allSettled(activities.map(activity => {
      const token = tokens.find(([id]) => id === activity.id)?.[1]
      return this.postPushRegistration(activity, 'end', token)
    }))

    if (!this.supported) return
    try {
      await OrderLiveActivity.endAll()
    } catch (error) {
      console.warn('Failed to end all order live activities:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Push token registration (backend contract, best-effort until endpoints ship)
  // ---------------------------------------------------------------------------

  onPushToken (data) {
    const token = data?.token
    const id = data?.activityId
    if (!token || !id) return

    this.pushTokens.set(id, token)

    const activity = this.tracked.get(id)
    if (activity) this.postPushRegistration(activity, activity.isTerminal ? 'end' : 'start', token)
  }

  /**
   * Resolve the token the backend should push live-activity updates to.
   *
   * iOS Live Activities use a dedicated, per-activity push token handed over by
   * the native plugin. Android has no such token, so the device's FCM token —
   * the same one the app already uses for push subscriptions — is reused.
   *
   * @param {import('./model').OrderLiveActivity} [activity]
   * @returns {Promise<String>}
   */
  async resolvePushToken (activity) {
    const perActivity = activity ? this.pushTokens.get(activity.id) : ''
    if (perActivity) return perActivity
    if (this.platform !== 'android') return ''

    try {
      const { pushNotificationsManager } = await import('src/boot/push-notifications')
      if (!pushNotificationsManager.registrationToken) {
        await pushNotificationsManager.fetchRegistrationToken({ timeout: 10 * 1000 }).catch(() => {})
      }
      return pushNotificationsManager.registrationToken || ''
    } catch (error) {
      console.debug('Failed to resolve the FCM token for order live activities:', error)
      return ''
    }
  }

  async unregisterPushToken (activity) {
    // Read the token before dropping it: on iOS it is the only one the backend
    // will accept for the `end` registration.
    const token = this.pushTokens.get(activity.id)
    this.pushTokens.delete(activity.id)
    await this.postPushRegistration(activity, 'end', token)
  }

  /**
   * @param {import('./model').OrderLiveActivity} activity
   * @param {'start'|'update'|'end'} type
   * @param {String} [token] Explicit token; otherwise resolved from the platform
   */
  async postPushRegistration (activity, type, token) {
    if (!activity) return
    const pushToken = token || (await this.resolvePushToken(activity))
    if (!pushToken) return

    try {
      if (activity.kind === OrderKind.P2P) {
        const { backend } = await import('src/exchange/backend')
        await backend.post('/push-notifications/live-activity/', {
          order_id: activity.orderId,
          token: pushToken,
          type,
          platform: this.platform,
        }, { authorize: true })
      } else if (activity.kind === OrderKind.MARKETPLACE) {
        const { backend } = await import('src/marketplace/backend')
        await backend.post('notifications/live-activity/', {
          order_id: activity.orderId,
          token: pushToken,
          type,
          platform: this.platform,
          device_id: await this.getDeviceId(),
        })
      }
    } catch (error) {
      // Endpoint may not exist yet; never let token registration break the UI.
      console.debug(
        'Order live activity push registration skipped:',
        error?.response?.status || error?.message || error
      )
    }
  }

  /**
   * Device id in the format commerce-hub already stores: the raw uuid on iOS,
   * and its decimal representation on Android (see `src/boot/push-notifications.js`
   * and `src/marketplace/push-notifications.js`).
   */
  async getDeviceId () {
    if (this._deviceId) return this._deviceId
    try {
      const { Device } = await import('@capacitor/device')
      const info = await Device.getId()
      const uuid = info?.uuid || info?.identifier || ''
      if (!uuid) return ''
      this._deviceId = this.platform === 'android'
        ? BigNumber.from('0x' + uuid).toString()
        : uuid
    } catch (error) {
      console.debug('Failed to resolve device id for order live activities:', error)
      this._deviceId = ''
    }
    return this._deviceId
  }

  // ---------------------------------------------------------------------------
  // Reconciliation
  // ---------------------------------------------------------------------------

  /**
   * Re-sync every active order. Throttled, safe to call on resume/boot.
   * @param {{ force?:Boolean }} [opts]
   */
  async refreshAll (opts = {}) {
    const now = Date.now()
    if (!opts.force && now - this._lastRefreshAt < REFRESH_THROTTLE_MS) return
    this._lastRefreshAt = now

    await this.init()
    await Promise.allSettled([
      this.refreshP2POrders(),
      this.refreshMarketplaceOrders(),
    ])
  }

  async refreshP2POrders () {
    try {
      const walletHash = this.getWalletHash()
      if (!walletHash) return
      const { backend } = await import('src/exchange/backend')
      const response = await backend.get('/ramp-p2p/order/public/', {
        params: { wallet_hash: walletHash, page_size: 50, page: 1 },
      })
      const results = response?.data?.results
      if (!Array.isArray(results)) return
      for (const order of results) {
        await this.syncP2POrder(order)
      }
    } catch (error) {
      console.debug('Skipped P2P order live activity refresh:', error?.response?.status || error?.message)
    }
  }

  async refreshMarketplaceOrders () {
    try {
      const { backend } = await import('src/marketplace/backend')
      const { Order } = await import('src/marketplace/objects')
      let ref
      try {
        ref = await Store.dispatch('marketplace/getCartRef')
      } catch {
        ref = undefined
      }
      const response = await backend.get('connecta/orders/', { params: { ref, limit: 50 } })
      const results = response?.data?.results
      if (!Array.isArray(results)) return
      for (const raw of results) {
        const order = Order.parse(raw)
        // Already-tracked orders must always be synced, otherwise the activity
        // freezes at the last in-progress status once the order moves to
        // delivered/terminal. Untracked ones only start from an in-progress
        // stage: pending checkouts and long-finished orders stay quiet.
        const tracked = this.get(activityId(OrderKind.MARKETPLACE, order.id))
        if (!tracked && !order.inProgress) continue
        await this.syncMarketplaceOrder(order, {
          storefrontName: this.getMarketplaceStorefrontName(order.storefrontId),
        })
      }
    } catch (error) {
      console.debug(
        'Skipped Marketplace order live activity refresh:',
        error?.response?.status || error?.message
      )
    }
  }

  getMarketplaceStorefrontName (storefrontId) {
    if (!storefrontId) return ''
    try {
      return Store.getters['marketplace/getStorefront']?.(storefrontId)?.name || ''
    } catch {
      return ''
    }
  }

  getWalletHash () {
    try {
      return Store.getters['global/getWallet']?.('bch')?.walletHash || ''
    } catch {
      return ''
    }
  }
}

export const orderLiveActivityManager = new OrderLiveActivityManager()

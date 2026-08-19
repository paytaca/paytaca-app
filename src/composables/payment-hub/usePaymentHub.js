// src/composables/payment-hub/core.js
import { ref } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { loadWallet } from 'src/wallet'
import { PaymentHub } from 'src/wallet/payment-hub'
import { paymentHubWebsocketManager } from 'src/wallet/payment-hub/websocket'

export function usePaymentHubCore() {
  const $store = useStore()
  const $q = useQuasar()

  const wallet = ref(null)
  const hub = ref(null)
  let webSocketInitialized = false

  /**
   *
   * @param {Object} opts
   * @param {Boolean} opts.isBackground
   * @param {String} opts.loadingMessage
   * @param {Boolean} opts.autoRegister
   * @returns
   */
  async function initHub(opts = {}) {
    const isBackground = opts?.isBackground ?? false
    if (!isBackground) {
      $q.loading.show({ message: opts.loadingMessage || 'Connecting…' })
    }
    try {
      if (!wallet.value) {
        wallet.value = await loadWallet('BCH', $store.getters['global/getWalletIndex'])
      }
      if (!hub.value) {
        hub.value = new PaymentHub(wallet.value)
      }

      if (opts.autoRegister !== false) {
        let registration = await hub.value.checkRegistration()
        if (!registration) {
          registration = await hub.value.registerWallet()
        }
        hub.value.walletData = registration
      }
      return hub.value
    } finally {
      if (!isBackground) $q.loading.hide()
    }
  }

  function initWebSocket(handler) {
    if (webSocketInitialized) return
    paymentHubWebsocketManager.aquire(wallet.value)
    paymentHubWebsocketManager.addListener(handler)
    webSocketInitialized = true
  }

  function closeWebSocket(handler) {
    paymentHubWebsocketManager.release()
    paymentHubWebsocketManager.removeListener(handler)
    webSocketInitialized = false
  }

  function _compareUUID(uuid1, uuid2) {
    if (typeof uuid1 == 'string' && typeof uuid2 === 'string')  {
      return uuid1.replaceAll('-', '') === uuid2.replaceAll('-', '');
    }
    return uuid1 === uuid2
  }

  return {
    wallet,
    hub,
    initHub,
    initWebSocket,
    closeWebSocket,

    _compareUUID,
  }
}

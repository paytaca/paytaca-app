// src/composables/payment-hub/core.js
import { computed, ref, toValue } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { date, useQuasar } from 'quasar'
import { loadWallet } from 'src/wallet'
import { PaymentHub } from 'src/wallet/payment-hub'
import { paymentHubWebsocketManager } from 'src/wallet/payment-hub/websocket'
import { serializeSchemaFields } from 'src/components/jsonforms/jsonform-utils'


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

export function usePaymentHubUtils() {  
  function formatDate(dateStr) {
    if (!dateStr) return '-'
    return date.formatDate(dateStr, 'MMM D, YYYY hh:mm A')
  }


  function formatAmount(amount, decimals = 2) {
    const num = parseFloat(amount)
    if (isNaN(num)) return amount
    return parseFloat(num.toFixed(decimals)).toString()
  }

  function getInvoiceBadgeColor(status) {
    switch(status) {
      case 'PAID': return 'green-4'
      case 'PENDING': return 'orange-4'
      case 'TOP UP': return 'blue-4'
      case 'RECLAIMED': return 'purple-4'
      case 'CANCELLED': return 'red-4'
      case 'EXPIRED': return 'grey-5'
      default: return 'grey-5'
    }
  }

  return {
    formatDate,
    formatAmount,
    getInvoiceBadgeColor,
  }
}


export function useSubscriptionUtils() {
  const $q = useQuasar();
  const { t: $t } = useI18n();
  const PAYOUT_TX_FEE = 1000;

  function satsToBchDisplay(sats) {
    return (sats / 1e8).toFixed(8).replace(/\.?0+$/, '')
  }

  function getSubscriptionStatusColor(sub) {
    if (!sub) return 'grey-5'
    const s = sub.status
    if (s === 'ACTIVE') return 'green-4'
    if (s === 'CANCELLED') return 'red-4'
    if (s === 'PENDING') return 'orange-4'
    return 'grey-5'
  }

  function getPaytacaFee(sub) {
    if (!sub) return 546
    if (typeof sub.paytaca_fee === 'number') return sub.paytaca_fee
    if (!sub.pledge_satoshis) return 546
    const pledge = sub.pledge_satoshis
    const maxFee = sub.max_fee || 546
    return Math.max(Math.min(maxFee, Math.floor(pledge / 100)), Math.floor(maxFee / 100));
  }

  function getTotalCostPerCycle(sub) {
    if (!sub?.pledge_satoshis) return 0;
    const paytacaFee = getPaytacaFee(sub);
    return sub.pledge_satoshis + paytacaFee + PAYOUT_TX_FEE
  }


  function getPeriodTextBase(plan) {
    if (plan.period_days) {
      return `${plan.period_days} ${plan.period_days === 1 ? $t('Day') : $t('Days')}`
    }

    const blocks = plan.period_blocks
    if (!blocks) return ''

    let timeStr = ''
    if (blocks % 4320 === 0) {
      const v = blocks / 4320
      timeStr = `${v} ${v === 1 ? $t('Month') : $t('Months')}`
    } else if (blocks % 1008 === 0) {
      const v = blocks / 1008
      timeStr = `${v} ${v === 1 ? $t('Week') : $t('Weeks')}`
    } else if (blocks % 144 === 0) {
      const v = blocks / 144
      timeStr = `${v} ${v === 1 ? $t('Day') : $t('Days')}`
    } else if (blocks % 6 === 0) {
      const v = blocks / 6
      timeStr = `${v} ${v === 1 ? $t('Hour') : $t('Hours')}`
    } else {
      timeStr = `${blocks * 10} ${$t('Minutes')}`
    }

    return timeStr
  }

  function getPeriodText(plan) {
    const text = getPeriodTextBase(plan)
    if (!text) return text;

    return $t('EveryPeriod', { period: text }, `Every ${text}`)
  }

  function showBlocksInfo(blocks) {
    const msg1 = $t('EstimatedTimeBasedOnBlocks')
    const msg2 = $t('ExactIntervalBlocksMsg', { blocks })
    $q.dialog({
      title: $t('BillingReceivingPeriod', 'Billing/Receiving Period'),
      message: msg1 + ' ' + msg2,
      color: 'pt-primary1',
      ok: {
        flat: true,
        color: 'pt-primary1',
        label: 'OK'
      }
    })
  }

  return {
    PAYOUT_TX_FEE,
    satsToBchDisplay,

    getSubscriptionStatusColor,

    getPaytacaFee,
    getTotalCostPerCycle,

    getPeriodTextBase,
    getPeriodText,

    showBlocksInfo,
  }
}

export function useSubscriptionFormSchema(sourceRef) {
  const subscriptionFormSchema = computed(() => {
    const sourceData = toValue(sourceRef);
    const planDetails = sourceData?.plan_details ?? sourceData
    const formData = planDetails.subscription_form_data

    const unserialized = formData?.unserialized_schema_data
    if (Array.isArray(unserialized)) {
      return serializeSchemaFields(unserialized, { normalizeNames: true })
    }
    return formData?.schema_data || null
  })

  const hasSubscriptionForm = computed(() => {
    const properties = subscriptionFormSchema.value?.properties
    return properties && Object.keys(properties).length > 0
  })

  return {
    subscriptionFormSchema,
    hasSubscriptionForm,
  }
}

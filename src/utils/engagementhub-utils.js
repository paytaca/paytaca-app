import axios from 'axios'
import { i18n } from 'src/boot/i18n'
// import { Capacitor } from '@capacitor/core'

const { t: $t } = i18n.global
const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'

// ========== CASHBACK ========== //

const CASHBACK_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}cashback/` })

const CASHBACK_LIMIT_MESSAGES = {
  WITH_LIMIT_MERCHANT_NAME: 'WithLimitMerchantNameMessage',
  NO_LIMITS_REACHED: 'NoLimitsReachedMessage',
  ALL_LIMITS_REACHED: 'AllLimitsReachedMessage',
  CUSTOMER_LIMIT_REACHED: 'CustomerLimitReachedMessage',
  MERCHANT_LIMIT_REACHED: 'MerchantLimitReachedMessage',
  TRANSACTION_LIMIT_REACHED: 'TransactionLimitReachedMessage'
}

const FALLBACK_CASHBACK_LIMIT_MESSAGES = {
  NO_LIMITS_REACHED:
    'You will receive<br/><span class="cashback-text amount">{amountBch} BCH or {amountFiat}</span>.',
  CUSTOMER_LIMIT_REACHED:
    'But since it falls within the set customer limit, you will only receive<br/>' +
    '<span class="cashback-text amount">{amountBch} BCH or {amountFiat}</span>.',
  MERCHANT_LIMIT_REACHED:
    'But since it falls within the set merchant limit, you will only receive<br/>' +
    '<span class="cashback-text amount">{amountBch} BCH or {amountFiat}</span>.',
  TRANSACTION_LIMIT_REACHED:
    'But since it falls within the set transaction limit, you will only receive<br/>' +
    '<span class="cashback-text amount">{amountBch} BCH or {amountFiat}</span>.'
}

export async function getCashbackAmount (payload) {
  let data = null

  await CASHBACK_URL
    .post('campaign/get_cashback_amount/', payload)
    .then(response => {
      data = response.data
    })
    .catch(error => {
      console.log(error)
    })

  return data
}

export function parseCashbackMessage (message, amountBch, amountFiat, merchantName) {
  let message1 = ''
  let message2 = ''

  if (message === 'ALL_LIMITS_REACHED') {
    return $t(
      CASHBACK_LIMIT_MESSAGES[message],
      'Sorry, this transaction did not qualify for a cashback as it exceeds limits set by the campaign.'
    )
  } else {
    message1 = $t(
      CASHBACK_LIMIT_MESSAGES.WITH_LIMIT_MERCHANT_NAME,
      { merchantName },
      `Congratulations! You qualify for a cashback for transacting with <span class="cashback-text">${merchantName}</span>.`
    )
    message2 = $t(
      CASHBACK_LIMIT_MESSAGES[message],
      { amountBch, amountFiat },
      `${FALLBACK_CASHBACK_LIMIT_MESSAGES[message]}`
    )
  }

  return `${message1} ${message2}`
}

// ========== NOTIFICATIONS ========== //

const NOTIFS_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}devicenotif/` })
const NOTIF_TYPES = {
  MP: $t('Marketplace'),
  CB: $t('Cashback'),
  AH: 'AnyHedge',
  RP: 'P2P Exchange',
  TR: $t('Transactions')
}

export async function getWalletNotifications (walletHash, notifType, page = 1) {
  let data = []

  await NOTIFS_URL
    .post(
      'notification/get_wallet_notifications/',
      {
        wallet_hash: walletHash,
        notif_type: notifType,
        page
      }
    )
    .then(response => {
      data = response.data
    })
    .catch(error => {
      console.log(error)
    })

  return data
}

export function parseNotifType (type) {
  return NOTIF_TYPES[type]
}

export async function hideItemUpdate (item) {
  await NOTIFS_URL
    .patch(`notification/${item.id}`, { is_hidden: true })
    .then(response => {
      // notif hidden successfully
    })
    .catch(error => {
      console.log(error)
    })
}

export async function getPushNotifConfigs (deviceId) {
  let data = null

  await NOTIFS_URL.post(
    '/wallethashdevice/get_push_notifs_settings/',
    { device_id: deviceId }
  )
    .then(response => {
      data = response.data
    })
    .catch(error => {
      console.log(error)
    })

  return data
}

export async function updateDeviceNotifType (deviceNotifTypesId, type, deviceId) {
  let id = deviceNotifTypesId
  if (id !== -1) { // patch
    const data = {}
    if (type.db_col === 'is_tr_enabled') data.is_tr_enabled = type.isEnabled
    else if (type.db_col === 'is_cb_enabled') data.is_cb_enabled = type.isEnabled
    else if (type.db_col === 'is_mp_enabled') data.is_mp_enabled = type.isEnabled
    else if (type.db_col === 'is_ah_enabled') data.is_ah_enabled = type.isEnabled
    else if (type.db_col === 'is_rp_enabled') data.is_rp_enabled = type.isEnabled

    await NOTIFS_URL.patch(
      `devicenotiftype/${id}/`,
      data
    ).then(response => {
      console.log(response)
    }).catch(error => {
      console.log(error)
    })
  } else { // post
    // const platform = Capacitor.getPlatform()

    const data = {
      is_tr_enabled: false,
      is_cb_enabled: false,
      is_mp_enabled: false,
      is_ah_enabled: false,
      is_rp_enabled: false,
      // adjust for ios
      apns_device: null,
      gcm_device: Number(deviceId)
    }

    await NOTIFS_URL.post('devicenotiftype/', data)
      .then(response => {
        console.log(response)
      }).catch(error => {
        console.log(error)
      })
  }

  return id
}

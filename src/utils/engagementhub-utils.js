import axios from 'axios'
import { i18n } from 'src/boot/i18n'
import { Capacitor } from '@capacitor/core'
import { BigNumber } from 'ethers'

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
    .patch(`notification/${item.id}/`, { is_hidden: true })
    .then(response => { /* notif hidden successfully */ })
    .catch(error => { console.log(error) })
}

export function parseDeviceId (deviceId) {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') {
    return deviceId
  } else if (platform === 'android') {
    return BigNumber.from('0x' + deviceId).toString()
  }
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
  let respId = deviceNotifTypesId

  if (respId !== -1) { // patch
    const data = {}
    if (type.db_col === 'is_events_promotions_enabled') {
      data.is_events_promotions_enabled = type.value
    } else if (type.db_col === 'is_by_country_enabled') {
      data.is_by_country_enabled = type.value
    } else if (type.db_col === 'is_by_city_enabled') {
      data.is_by_city_enabled = type.value
    } else if (type.db_col === 'country') data.country = type.value
    else if (type.db_col === 'city') data.city = type.value

    await NOTIFS_URL.patch(
      `devicenotiftype/${respId}/`,
      data
    ).then(response => {
      console.log('Device notif type updated successfully.')
    }).catch(error => {
      console.log(error)
    })
  } else { // post
    const platform = Capacitor.getPlatform()

    const data = {
      apns_device: undefined,
      gcm_device: undefined
    }

    if (platform === 'ios') data.apns_device = deviceId
    else if (platform === 'android') data.gcm_device = deviceId

    await NOTIFS_URL.post('devicenotiftype/create_device_notif_type/', data)
      .then(response => {
        respId = response.data.id
      }).catch(error => {
        console.log(error)
      })
  }

  return respId
}

import axios from 'axios'
import { i18n } from 'src/boot/i18n'
import { Capacitor } from '@capacitor/core'
import { BigNumber } from 'ethers'
import { formatWithLocale } from '../denomination-utils'
import { requestManager } from 'src/utils/request-manager'

const { t: $t } = i18n.global
const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'

// ========== CASHBACK ========== //

const CASHBACK_URL = axios.create({ baseURL: `${ENGAGEMENT_HUB_URL}cashback/` })
requestManager.attachTo(CASHBACK_URL)

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

export function parseCashbackMessage (message, amountBchUnformatted, amountFiat, merchantName) {
  let message1 = ''
  let message2 = ''
  const amountBch = formatWithLocale(amountBchUnformatted, { min: 0, max: 8 })

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
requestManager.attachTo(NOTIFS_URL)
const NOTIF_TYPES = {
  MP: $t('Marketplace'),
  CB: $t('Cashback'),
  AH: 'AnyHedge',
  RP: 'P2P Ramp',
  TR: $t('Transactions'),
  NF: $t('Collectibles'),
  EP: $t('EventsAndPromotions'),
  RW: $t('Rewards')
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

export async function hideItemUpdate (id) {
  await NOTIFS_URL
    .patch(`notification/${id}/`, { is_hidden: true })
    .then(response => { /* notif hidden successfully */ })
    .catch(error => { console.error(error) })
}

export async function markItemAsRead (id) {
  await NOTIFS_URL
    .patch(`notification/${id}/`, { is_read: true })
    .then(response => { /* notif hidden successfully */ })
    .catch(error => { console.error(error) })
}

export async function massHideNotifs (notifsIds) {
  await NOTIFS_URL
    .post('notification/mass_delete_notifications/', { notif_ids: notifsIds })
    .then(response => { /* mass delete successful */ })
    .catch(error => console.log(error))
}

export async function markWalletNotifsAsRead (walletHash) {
  await NOTIFS_URL
    .post('notification/mark_wallet_notifs_as_read/', { wallet_hash: walletHash })
    .then(response => { /* marking successful */ })
    .catch(error => console.log(error))
}

export async function getWalletUnreadNotifs (walletHash) {
  let count = 0
  await NOTIFS_URL
    .post('notification/get_unread_notifs/', { wallet_hash: walletHash })
    .then(response => { count = response.data.unread_notifs_count })
    .catch(error => console.log(error))
  return count
}

export function parseDeviceId (deviceId) {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') {
    return deviceId
  } else if (platform === 'android') {
    return BigNumber.from('0x' + deviceId).toString()
  }
  else return deviceId
}

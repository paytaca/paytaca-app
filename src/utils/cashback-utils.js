import axios from 'axios'
import { i18n } from 'src/boot/i18n'

const ENGAGEMENT_HUB_URL =
  process.env.ENGAGEMENT_HUB_URL || 'https://engagementhub.paytaca.com/api/'
const CASHBACK_URL = `${ENGAGEMENT_HUB_URL}cashback/`

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

const { t: $t } = i18n.global

export async function getCashbackAmount (payload) {
  let data = null

  await axios
    .post(`${CASHBACK_URL}campaign/get_cashback_amount/`, payload)
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
      'Sorry, this transaction did not qualify for a cashback as it exceeds limits stated in the campaign.'
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

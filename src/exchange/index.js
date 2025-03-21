import { i18n } from 'src/boot/i18n'
const { t } = i18n.global

export const SATOSHI_PER_BCH = 10 ** 8

export function formatOrderStatus (value) {
  switch (value) {
    case 'SBM':
      return t('Submitted')
    case 'CNF':
      return t('Confirmed')
    case 'ESCRW_PN':
      return t('EscrowPending')
    case 'ESCRW':
      return t('Escrowed')
    case 'PD_PN':
      return t('PaidPending')
    case 'PD':
      return t('Paid')
    case 'RLS':
      return t('Released')
    case 'RFN':
      return t('Refunded')
    case 'CNCL':
      return t('Cancelled')
    case 'APL':
      return t('Appealed')
    case 'RLS_PN':
      return t('ReleasePending')
    case 'RFN_PN':
      return t('RefundPending')
    default:
      return ''
  }
}

export function formatNumber (num) {
  if (!num) return

  let numStr = num.toString()
  if (numStr.includes('e')) {
    numStr = num.toFixed(20)
  }

  numStr = numStr.replace(/(\.\d*?)0+$/, '$1')

  if (numStr.includes('.')) {
    const [integerPart, decimalPart] = numStr.split('.')
    const firstNonZeroIndex = decimalPart.search(/[1-9]/)

    if (firstNonZeroIndex === -1 || firstNonZeroIndex < 2) {
      return parseFloat(num).toFixed(2)
    } else {
      const digitsUntilFirstNonZero = decimalPart.slice(0, firstNonZeroIndex + 1)
      return `${integerPart}.${digitsUntilFirstNonZero}`
    }
  } else {
    return numStr
  }
}

export function formatCurrency (value, currency) {
  let formattedNumber = null
  const parsedValue = parseFloat(value)
  let maximumFractionDigits = parsedValue % 1 === 0 ? 0 : 2
  if (parsedValue < 0.01) {
    maximumFractionDigits = parsedValue % 1 === 0 ? 0 : 3
  }
  if (parsedValue < 0.001) {
    maximumFractionDigits = parsedValue % 1 === 0 ? 0 : 6
  }
  if (parsedValue < 0.0001) {
    maximumFractionDigits = parsedValue % 1 === 0 ? 0 : 8
  }
  if (currency) {
    formattedNumber = parsedValue.toLocaleString(undefined, {
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: maximumFractionDigits
    })
  } else {
    formattedNumber = parsedValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maximumFractionDigits
    })
  }
  return formattedNumber
}

export function formatDate (
  date,
  relative = false,
  options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }) {
  const datetime = new Date(date)
  let dateString = null
  if (relative) {
    dateString = formatRelativeDate(datetime)
  } else {
    dateString = datetime.toLocaleString(undefined, options)
    dateString = dateString.replace(' at', '')
  }

  return dateString
}

export function formatAddress (address, startLength = 35, endLength = 5) {
  // const startLength = 35
  // const endLength = 5
  if (address.length <= startLength + endLength) {
    return address
  }
  return address.slice(0, startLength) + '...' + address.slice(-endLength)
}

export function formatRelativeDate (date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  let dateString = ''

  const elapsedMs = now - date
  const elapsedSeconds = Math.round(elapsedMs / 1000)
  const elapsedMinutes = Math.round(elapsedSeconds / 60)
  const elapsedHours = Math.round(elapsedMinutes / 60)
  const elapsedDays = Math.round(elapsedHours / 24)

  if (elapsedMinutes < 1) {
    dateString = t('JustNow')
  } else if (elapsedMinutes < 60) {
    dateString = elapsedMinutes.toString()
    if (elapsedMinutes > 1) {
      dateString += ` ${t('MinutesAgo')}`
    } else {
      dateString += ` ${t('MinuteAgo')}`
    }
  } else if (elapsedHours < 24) {
    dateString = elapsedHours.toString()
    if (elapsedHours > 1) {
      dateString += ` ${t('HoursAgo')}`
    } else {
      dateString += ` ${t('HourAgo')}`
    }
  } else if (elapsedDays < 7) {
    dateString = elapsedDays.toString()
    if (elapsedDays > 1) {
      dateString += ` ${t('DaysAgo')}`
    } else {
      dateString += ` ${t('DayAgo')}`
    }
  } else if (elapsedDays < 30) {
    const elapsedWeeks = Math.round(elapsedDays / 7)
    dateString = elapsedWeeks.toString()
    if (elapsedWeeks > 1) {
      dateString += ` ${t('WeeksAgo')}`
    } else {
      dateString += ` ${t('WeekAgo')}`
    }
  } else if (elapsedDays < 365) {
    const elapsedMonths = Math.round(elapsedDays / 30)
    dateString = elapsedMonths.toString()
    if (elapsedMonths > 1) {
      dateString += ` ${t('MonthsAgo')}`
    } else {
      dateString += ` ${t('MonthAgo')}`
    }
  } else {
    const elapsedYears = Math.round(elapsedDays / 365)
    dateString = elapsedYears.toString()
    if (elapsedYears === 1) {
      dateString += ` ${t('YearAgo')}`
    } else {
      dateString += ` ${t('YearsAgo')}`
    }
  }
  return dateString
}

export function getAppealCooldown (timeValue) {
  switch (timeValue) {
    case 5:
      return { label: t('FiveMinutes'), value: 5 }
    case 15:
      return { label: t('FifteenMinutes'), value: 15 }
    case 30:
      return { label: t('ThirtyMinutes'), value: 30 }
    case 45:
      return { label: t('FortyFiveMinutes'), value: 45 }
    case 60:
      return { label: t('OneHour'), value: 60 }
    case 300:
      return { label: t('FiveHours'), value: 300 }
    case 720:
      return { label: t('TwelveHours'), value: 720 }
    case 1440:
      return { label: t('TwentyFourHours'), value: 1440 }
    default:
      return ''
  }
}

/**
 * Generates a random alphanumeric string of the given length.
 *
 * @param {number} length - The desired length of the random string.
 * @returns {string} A random alphanumeric string of the given length.
 */
export function makeid (length) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function fiatToBch (fiatAmount, price) {
  return parseFloat(fiatAmount) / parseFloat(price)
}

export function bchToFiat (bchAmount, price) {
  return bchAmount * price
}

export function bchToSatoshi (bch) {
  return Math.floor(bch * SATOSHI_PER_BCH)
}

export function satoshiToBch (satoshi) {
  return satoshi / SATOSHI_PER_BCH
}

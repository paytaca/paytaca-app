export function formatOrderStatus (value) {
  switch (value) {
    case 'SBM':
      return 'Submitted'
    case 'CNF':
      return 'Confirmed'
    case 'ESCRW_PN':
      return 'Escrow Pending'
    case 'ESCRW':
      return 'Escrowed'
    case 'PD_PN':
      return 'Paid Pending'
    case 'PD':
      return 'Paid'
    case 'RLS':
      return 'Released'
    case 'RFN':
      return 'Refunded'
    case 'CNCL':
      return 'Cancelled'
    case 'APL':
      return 'Appealed'
    case 'RLS_PN':
      return 'Release Pending'
    case 'RFN_PN':
      return 'Refund Pending'
    default:
      return ''
  }
}

export function formatCurrency (value, currency) {
  let formattedNumber = null
  const parsedValue = parseFloat(value)
  if (currency) {
    let maximumFractionDigits = parsedValue % 1 === 0 ? 0 : 2
    if (parsedValue < 1) {
      maximumFractionDigits = parsedValue % 1 === 0 ? 0 : 8
    }
    formattedNumber = parsedValue.toLocaleString(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: maximumFractionDigits
    })
  } else {
    formattedNumber = parsedValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: parsedValue % 1 === 0 ? 0 : 8
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
    dateString = 'Just now'
  } else if (elapsedMinutes < 60) {
    dateString = elapsedMinutes.toString()
    if (elapsedMinutes > 1) {
      dateString += ' minutes ago'
    } else {
      dateString += ' minute ago'
    }
  } else if (elapsedHours < 24) {
    dateString = elapsedHours.toString()
    if (elapsedHours > 1) {
      dateString += ' hours ago'
    } else {
      dateString += ' hour ago'
    }
  } else if (elapsedDays < 7) {
    dateString = elapsedDays.toString()
    if (elapsedDays > 1) {
      dateString += ' days ago'
    } else {
      dateString += ' day ago'
    }
  } else if (elapsedDays < 30) {
    const elapsedWeeks = Math.round(elapsedDays / 7)
    dateString = elapsedWeeks.toString()
    if (elapsedWeeks > 1) {
      dateString += ' weeks ago'
    } else {
      dateString += ' week ago'
    }
  } else if (elapsedDays < 365) {
    const elapsedMonths = Math.round(elapsedDays / 30)
    dateString = elapsedMonths.toString()
    if (elapsedMonths > 1) {
      dateString += ' months ago'
    } else {
      dateString += ' month ago'
    }
  } else {
    const elapsedYears = Math.round(elapsedDays / 365)
    dateString = elapsedYears.toString()
    if (elapsedYears === 1) {
      dateString = dateString + ' year ago'
    } else {
      dateString = dateString + ' years ago'
    }
  }
  return dateString
}

export function getAppealCooldown (timeValue) {
  switch (timeValue) {
    case 5:
      return { label: '5 minutes', value: 5 }
    case 15:
      return { label: '15 minutes', value: 15 }
    case 30:
      return { label: '30 minutes', value: 30 }
    case 45:
      return { label: '45 minutes', value: 45 }
    case 60:
      return { label: '1 hour', value: 60 }
    case 300:
      return { label: '5 hours', value: 300 }
    case 720:
      return { label: '12 hours', value: 720 }
    case 1440:
      return { label: '24 hours', value: 1440 }
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

export function getCookie (name) {
  const cookieArr = document.cookie.split('; ')
  for (let i = 0; i < cookieArr.length; i++) {
    const cookiePair = cookieArr[i].split('=')
    if (name === cookiePair[0]) {
      return decodeURIComponent(cookiePair[1])
    }
  }
  return null
}

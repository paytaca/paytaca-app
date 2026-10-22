
import { date } from 'quasar'

// ==========
// FORMATTING
// ==========

// Formats an auction date for display.
export const formatAuctionDate = (dateString) => (dateString) ? date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') : 'N/A' 

// Formats the time remaining in an auction.
export const formatAuctionCountdown = (timeLeft, countingToEnd=false) => {
  const splitTime = String(timeLeft).split(":")
  const timeToIndex = ['day', 'hour', 'minute', 'second']

  for (let [index, time] of splitTime.entries()){
    const numTime = Number(time)
    if (numTime > 0) return `${numTime} ${timeToIndex[index]}${(numTime) > 1 ? 's':''} left.`
  }
  return (countingToEnd) ? "Time's Up!" : "Auction is Starting..."
}

// Formats a fiat value as Philippine pesos.
export const formatFiat = (value) => {
  const numValue = Number(value) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Formats a fiat value without a currency symbol.
export const formatFiatNumber = (value) => {
  const numValue = Number(value) || 0
  return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Formats a BCH value to eight decimal places.
export const formatBCH = (value) => {
  const bch = Number(value) || 0
  const numStr = Number(bch).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}

// Formats time into "time since" (for disputes)
export function formatTimeSince (timestamp) {
  if (!timestamp) return '0s'

  const now = new Date()
  let dateStr = String(timestamp).trim().replace(' ', 'T')
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
    dateStr += 'Z'
  }
  const past = new Date(dateStr)

  const seconds = Math.max(0, date.getDateDiff(now, past, 'seconds'))
  if (seconds < 60) return `${seconds}s`

  const minutes = date.getDateDiff(now, past, 'minutes')
  if (minutes < 60) return `${minutes}m`

  const hours = date.getDateDiff(now, past, 'hours')
  if (hours < 24) return `${hours}h`

  const days = date.getDateDiff(now, past, 'days')
  if (days < 7) return `${days}d`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`

  const months = date.getDateDiff(now, past, 'months')
  if (months < 12) return `${months}m`

  const years = date.getDateDiff(now, past, 'years')
  return `${years}y`
}

// Returns the label and price for an English auction lot.
export const getEnglishPriceInfo = (lot, hasBid = lot?.hasBids?.()) => {
  const highestBid = lot?.bids
    ?.filter(bid => ['Highest', 'Winner'].includes(bid.status))
    .sort((a, b) => new Date(b.date_bid) - new Date(a.date_bid))[0]

  return {
    label: hasBid ? 'HIGHEST BID:' : 'STARTING PRICE:',
    fiat: highestBid?.bid_price_fiat ?? lot?.start_price_fiat,
    bch: highestBid?.bid_price_bch ?? lot?.start_price_bch
  }
}

// Returns the price-drop interval in minutes.
export const getIntervalMinutes = (priceDropInterval) => typeof priceDropInterval === 'object'
  ? (priceDropInterval?.value || 10)
  : (priceDropInterval || 10)

// Converts an HH:MM:SS price-drop interval to minutes.
export const parseTimeIntervalMinutes = (timeInterval) => {
  if (!timeInterval) return 10

  const parts = timeInterval.split(':').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return 10

  const [hours, minutes] = parts
  return (hours * 60) + minutes
}

// Converts an HH:MM:SS price-drop interval to seconds.
export const parseTimeIntervalSeconds = (timeInterval) => {
  if (!timeInterval) return 10

  const parts = timeInterval.split(':').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return 10

  const [hours, minutes, seconds] = parts
  return (hours * 60 * 60) + (minutes * 60) + seconds
}

// Shortens long BCH addresses for display.
export const formatAddressWithEllipsis = (address) => {
  if (address === null || address === undefined || address === '') return address
  address = String(address)
  if (address.length <= 22) return address

  const start = address.substring(0, 17)
  const end = address.substring(address.length - 5)
  return `${start}........${end}`
}

const toBothCurrencies = (value, isFiatUsed, rate) => {
  const numValue = Number(value) || 0
  if (isFiatUsed) return { fiat: numValue, bch: rate > 0 ? numValue / rate : 0 }
  return { fiat: numValue * rate, bch: numValue }
}

// Adds normalized fiat and BCH values to a lot.
export const withBothCurrencies = (lot, isFiatUsed, rate, preserveExisting = false) => {
  const hasExistingFields = lot.est_price_fiat !== undefined || lot.est_price_bch !== undefined
  if (preserveExisting && hasExistingFields) {
    return {
      ...lot,
      est_price_bch: Number(lot.est_price_bch || 0).toFixed(8),
      est_price_fiat: Number(lot.est_price_fiat || 0).toFixed(2),
      start_price_bch: Number(lot.start_price_bch || 0).toFixed(8),
      start_price_fiat: Number(lot.start_price_fiat || 0).toFixed(2),
      thresh_price_bch: Number(lot.thresh_price_bch || 0).toFixed(8),
      thresh_price_fiat: Number(lot.thresh_price_fiat || 0).toFixed(2),
      price_drop_bch: Number(lot.price_drop_bch || 0).toFixed(8),
      price_drop_fiat: Number(lot.price_drop_fiat || 0).toFixed(2)
    }
  }

  const estimated = toBothCurrencies(lot.estimatedPrice, isFiatUsed, rate)
  const starting = toBothCurrencies(lot.startingPrice, isFiatUsed, rate)
  const threshold = toBothCurrencies(lot.threshold, isFiatUsed, rate)
  const priceDrop = toBothCurrencies(lot.price_drop ?? lot.priceDrop, isFiatUsed, rate)
  return {
    ...lot,
    est_price_bch: estimated.bch.toFixed(8),
    est_price_fiat: estimated.fiat.toFixed(2),
    start_price_bch: starting.bch.toFixed(8),
    start_price_fiat: starting.fiat.toFixed(2),
    thresh_price_bch: threshold.bch.toFixed(8),
    thresh_price_fiat: threshold.fiat.toFixed(2),
    price_drop_bch: priceDrop.bch.toFixed(8),
    price_drop_fiat: priceDrop.fiat.toFixed(2)
  }
}

// Returns a validation message when auction dates are invalid.
export const getAuctionDateValidationError = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Please set both start and end dates.'
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid date format.'
  if (end <= start) return 'End date must be after start date.'
  if ((end - start) / (1000 * 60 * 60) < 1) return 'Auction must run for at least 24 hours.'
  return null
}

// Copies text to the clipboard and notifies the user.
export const copyToClipboard = (text, $q, options = {}) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ type: 'positive', message: 'Copied to clipboard!', timeout: 1500, ...options })
  })
}



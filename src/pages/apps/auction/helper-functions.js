
import { date } from 'quasar'

// ==========
// FORMATTING
// ==========

// Auction Date Formatting
export const formatAuctionDate = (dateString) => (dateString) ? date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') : 'N/A' 

// Format's The Auction Countdown
export const formatAuctionCountdown = (timeLeft, countingToEnd=false) => {
  const splitTime = String(timeLeft).split(":")
  const timeToIndex = ['day', 'hour', 'minute', 'second']

  for (let [index, time] of splitTime.entries()){
    const numTime = Number(time)
    if (numTime > 0) return `${numTime} ${timeToIndex[index]}${(numTime) > 1 ? 's':''} left.`
  }
  return (countingToEnd) ? "Time's Up!" : "Auction is Starting..."
}

// Formats Fiat
export const formatFiat = (value) => {
  const numValue = Number(value) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatFiatNumber = (value) => {
  const numValue = Number(value) || 0
  return numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Formats BCH
export const formatBCH = (value) => {
  const bch = Number(value) || 0
  const numStr = Number(bch).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}

export const getEnglishPriceInfo = (lot, hasBid = lot?.hasBids?.()) => ({
  label: hasBid ? 'HIGHEST BID:' : 'STARTING PRICE:',
  fiat: lot?.threshold_bid_fiat,
  bch: lot?.threshold_bid_bch
})

export const getIntervalMinutes = (priceDropInterval) => typeof priceDropInterval === 'object'
  ? (priceDropInterval?.value || 10)
  : (priceDropInterval || 10)

const toBothCurrencies = (value, isFiatUsed, rate) => {
  const numValue = Number(value) || 0
  if (isFiatUsed) return { fiat: numValue, bch: rate > 0 ? numValue / rate : 0 }
  return { fiat: numValue * rate, bch: numValue }
}

export const withBothCurrencies = (lot, isFiatUsed, rate, preserveExisting = false) => {
  const hasExistingFields = lot.estimated_amount_fiat !== undefined || lot.estimated_amount_bch !== undefined
  if (preserveExisting && hasExistingFields) {
    return {
      ...lot,
      estimated_amount_bch: Number(lot.estimated_amount_bch || 0).toFixed(8),
      estimated_amount_fiat: Number(lot.estimated_amount_fiat || 0).toFixed(2),
      starting_price_bch: Number(lot.starting_price_bch || 0).toFixed(8),
      starting_price_fiat: Number(lot.starting_price_fiat || 0).toFixed(2),
      threshold_bid_bch: Number(lot.threshold_bid_bch || 0).toFixed(8),
      threshold_bid_fiat: Number(lot.threshold_bid_fiat || 0).toFixed(2),
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
    estimated_amount_bch: estimated.bch.toFixed(8),
    estimated_amount_fiat: estimated.fiat.toFixed(2),
    starting_price_bch: starting.bch.toFixed(8),
    starting_price_fiat: starting.fiat.toFixed(2),
    threshold_bid_bch: threshold.bch.toFixed(8),
    threshold_bid_fiat: threshold.fiat.toFixed(2),
    price_drop_bch: priceDrop.bch.toFixed(8),
    price_drop_fiat: priceDrop.fiat.toFixed(2)
  }
}

export const getAuctionDateValidationError = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Please set both start and end dates.'
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid date format.'
  if (end <= start) return 'End date must be after start date.'
  if ((end - start) / (1000 * 60 * 60) < 1) return 'Auction must run for at least 24 hours.'
  return null
}

export const copyToClipboard = (text, $q, options = {}) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ type: 'positive', message: 'Copied to clipboard!', timeout: 1500, ...options })
  })
}



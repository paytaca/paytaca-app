
import { date } from 'quasar'
import { Store } from 'src/store'

// ==========
// FORMATTING
// ==========

// Auction Date Formatting
export const formatAuctionDate = (dateString) => (dateString) ? date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') : 'N/A' 

// Format's The Auction Countdown
export const formatAuctionCountdown = (timeLeft, countingToEnd=false) => {
  const splitTime = (timeLeft).split(":")
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

// Formats BCH
export const formatBCH = (value) => {
  const bch = Number(value) || 0
  const numStr = Number(bch).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}


// ===== GETTERS =====
export const getArbiterServicerData = async () => {
  const arbiterTotalTime = Date.now() - Store.getters['auction/arbiterLastFetched']
  const servicerTotalTime = Date.now() - Store.getters['auction/servicerLastFetched']

  const arbiterPK = Store.getters['auction/arbiterPublicKey']
  const servicerPK = Store.getters['auction/servicerPublicKey']

  await Promise.all([
    !arbiterPK || arbiterTotalTime > 30000
      ? Store.dispatch('auction/fetchArbiterPublicKey')
      : Promise.resolve(),
    !servicerPK || servicerTotalTime >  30000
      ? Store.dispatch('auction/fetchServicerPublicKey')
      : Promise.resolve()
  ])
}


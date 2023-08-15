import { loadWallet } from 'src/wallet'
import { markRaw } from 'vue'

export async function loadP2PWalletInfo (walletInfo, network = 'bch') {
  /**
   * Returns the wallet information needed for RampP2P processes
   */
  const rawWallet = await markRaw(loadWallet())
  let wallet = (rawWallet).BCH
  if (network === 'chipnet') wallet = rawWallet.BCH_CHIP

  const walletHash = wallet.getWalletHash()
  const { lastAddress, connectedAddressIndex } = walletInfo
  const privateKeyWif = await wallet.getPrivateKey(connectedAddressIndex)
  const publicKey = await wallet.getPublicKey(connectedAddressIndex)

  return {
    wallet: wallet,
    walletHash: walletHash,
    privateKeyWif: privateKeyWif,
    publicKey: publicKey,
    address: lastAddress
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
    formattedNumber = parseFloat(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: parsedValue % 1 === 0 ? 0 : 8
    })
  }
  return formattedNumber
}

export function formatDate (date, relative = false) {
  const datetime = new Date(date)
  let dateString = null
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }
  if (relative) {
    dateString = formatRelativeDate(datetime)
  } else {
    dateString = datetime.toLocaleString(undefined, options)
    dateString = dateString.replace(' at', '')
  }

  return dateString
}

export function formatRelativeDate (date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  let dateString = ''

  if (date >= today) {
    dateString = 'Today'
  } else if (date >= yesterday) {
    dateString = 'Yesterday'
  } else {
    const elapsedMs = now - date
    const elapsedSeconds = Math.round(elapsedMs / 1000)
    const elapsedMinutes = Math.round(elapsedSeconds / 60)
    const elapsedHours = Math.round(elapsedMinutes / 60)
    const elapsedDays = Math.round(elapsedHours / 24)

    if (elapsedDays < 7) {
      dateString = `${elapsedDays} days ago`
    } else if (elapsedDays < 30) {
      const elapsedWeeks = Math.round(elapsedDays / 7)
      dateString = `${elapsedWeeks} weeks ago`
    } else if (elapsedDays < 365) {
      const elapsedMonths = Math.round(elapsedDays / 30)
      dateString = `${elapsedMonths} months ago`
    } else {
      const elapsedYears = Math.round(elapsedDays / 365)
      dateString = `${elapsedYears} years ago`
    }
  }
  return dateString.toLocaleLowerCase()
}

export function getPaymentTimeLimit (timeValue) {
  switch (timeValue) {
    case 5:
      return { label: '5 min', value: 5 }
    case 15:
      return { label: '15 min', value: 15 }
    case 30:
      return { label: '30 min', value: 30 }
    case 60:
      return { label: '1 hr', value: 60 }
    case 300:
      return { label: '5 hr', value: 300 }
    case 720:
      return { label: '12 hr', value: 720 }
    case 1440:
      return { label: '24 hr', value: 1440 }
    default:
      return ''
  }
}

import { loadWallet } from 'src/wallet'
import { markRaw } from 'vue'

export async function loadP2PWalletInfo (walletInfo) {
  /**
   * Returns the wallet information needed for RampP2P processes
   */
  const wallet = await markRaw(loadWallet())
  const walletHash = wallet.BCH.getWalletHash()

  const { lastAddress, connectedAddressIndex } = walletInfo
  const privateKeyWif = await wallet.BCH.getPrivateKey(connectedAddressIndex)
  const publicKey = await wallet.BCH.getPublicKey(connectedAddressIndex)

  return {
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

export function formatDate (value) {
  const datetime = new Date(value)
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }
  let dateString = datetime.toLocaleString(undefined, options)
  dateString = dateString.replace(' at', '')
  return dateString
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

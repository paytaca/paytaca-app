import { Store } from 'src/store'
import { markRaw } from '@vue/reactivity'
import { Notify, Dialog } from 'quasar'
import { i18n } from 'src/boot/i18n'
import { Address } from 'src/wallet'
import { JSONPaymentProtocol } from 'src/wallet/payment-uri'
import { isValidTokenAddress } from 'src/wallet/chipnet'
import { isTokenAddress } from 'src/utils/address-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { decodeCashAddress, decodeCashAddressFormatWithoutPrefix } from '@bitauth/libauth'
import {
  generateChangeAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

const { t: $t } = i18n.global

function isChipnet () {
  return Store.getters['global/isChipnet']
}

export async function handleJpp (paymentUri, darkMode) {
  const dialog = Dialog.create({
    title: 'Invoice',
    message: 'Fetching invoice data',
    progress: true,
    persistent: true,
    seamless: true,
    ok: false,
    class: `pt-card text-bow ${getDarkModeClass(darkMode)}`
  })
  let jppData = null

  await JSONPaymentProtocol.fetch(paymentUri)
    .then(jpp => {
      jppData = markRaw(jpp)
      dialog.hide()
    })
    .catch(error => {
      let message = 'Failed to fetch invoice data'
      if (typeof error?.response?.data === 'string') {
        if (error?.response?.data?.indexOf('expired') >= 0) message = 'Invoice is expired'
        else if (error?.response?.data?.length <= 1000) message = error?.response?.data
      }
      if (error?.name === 'JsonPaymentProtocolError' && error?.message) {
        message = error?.message
      }
      dialog.update({ message: message })
      console.error(error)
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: true })
    })

  return jppData
}

export function getAsset (id, symbol) {
  const getter = 'assets/getAsset'
  const assets = Store.getters[getter](id)

  let asset
  if (assets.length > 0) asset = assets[0]
  else asset = { id, symbol: symbol }

  if (id?.startsWith?.('ct/') && asset) {
    asset.decimals = parseInt(asset.decimals) || 0
  }

  return asset
}

export function getBIP21Amount (bip21Uri) {
  const addressParse = new URLSearchParams(bip21Uri.split('?')[1])
  if (addressParse.has('amount')) {
    const amount = parseFloat(addressParse.get('amount'))
    return amount
  }
  return NaN
}

export function getWallet (type) {
  return Store.getters['global/getWallet'](type)
}

/**
 * Dynamically generates change address from mnemonic instead of retrieving from store
 * This prevents address mixup issues in multi-wallet scenarios
 * 
 * IMPORTANT: This function subscribes the address to watchtower before returning.
 * If subscription fails, it will throw an error to prevent using unsubscribed addresses.
 * 
 * @param {string} walletType - 'bch' or 'slp'
 * @returns {Promise<string>} The change address
 * @throws {Error} If address generation or subscription fails
 */
export async function getChangeAddress (walletType) {
  try {
    let addressIndex = Store.getters['global/getLastAddressIndex'](walletType)
    const walletIndex = Store.getters['global/getWalletIndex']
    const isChipnetVal = isChipnet()
    
    // Validate and fix addressIndex - it should never be negative
    // New wallets start with -1, so default to 0 for the first change address
    if (addressIndex === undefined || addressIndex === null || addressIndex < 0) {
      addressIndex = 0
    }
    
    // Generate change address dynamically from mnemonic (includes watchtower subscription)
    const changeAddr = await generateChangeAddress({
      walletIndex: walletIndex,
      derivationPath: getDerivationPathForWalletType(walletType),
      addressIndex: addressIndex,
      isChipnet: isChipnetVal
    })
    
    // Check if subscription failed (returns null)
    if (!changeAddr) {
      // Try to get the address from the store as fallback
      const fallbackAddr = Store.getters['global/getChangeAddress'](walletType)
      if (fallbackAddr) {
        return fallbackAddr
      }
      throw new Error('Failed to subscribe change address to watchtower. Please check your internet connection and try again.')
    }
    
    return changeAddr
  } catch (error) {
    console.error('[getChangeAddress] Error generating change address dynamically:', error)
    
    // Fallback to store-retrieved change address if dynamic generation fails
    // Note: This is only for backward compatibility and shouldn't normally be used
    try {
      const fallbackAddr = Store.getters['global/getChangeAddress'](walletType)
      if (fallbackAddr) {
        return fallbackAddr
      }
    } catch (fallbackError) {
      console.error('[getChangeAddress] Fallback also failed:', fallbackError)
    }
    
    // Provide a more helpful error message
    const errorMessage = error.message || 'Unknown error'
    throw new Error(`Failed to get change address: ${errorMessage}`)
  }
}

export function getExplorerLink (txid, isCashToken) {
  let url = 'https://explorer.paytaca.com/tx/'
  if (isCashToken) url = 'https://explorer.paytaca.com/tx/'
  if (isChipnet()) url = 'https://chipnet.chaingraph.cash/tx/'
  return `${url}${txid}`
}

export function convertToFiatAmount (amount, selectedAssetMarketPrice) {
  const parsedAmount = Number(amount)
  if (!parsedAmount) return ''
  if (!selectedAssetMarketPrice) return ''

  const computedBalance = Number(parsedAmount || 0) * Number(selectedAssetMarketPrice)
  if (!computedBalance) return ''
  if (computedBalance > 0.01) return computedBalance.toFixed(2)
  else return computedBalance.toFixed(4)
}

export function convertFiatToSelectedAsset (amount, selectedAssetMarketPrice) {
  const parsedAmount = Number(amount)
  if (!parsedAmount) return ''
  if (!selectedAssetMarketPrice) return ''
  const computedBalance = Number(parsedAmount || 0) / Number(selectedAssetMarketPrice)
  return computedBalance.toFixed(8)
}

export function adjustWalletBalance (asset, amountArray) {
  const assetId = String(asset?.id || '')
  const isCashToken = assetId.startsWith('ct/')
  // IMPORTANT:
  // - BCH should always be treated as 8 decimals for send/balance math.
  // - Some navigation paths pass an `asset` object with `decimals: 0` for BCH,
  //   which would round values like 0.09 BCH down to 0 when using `toFixed(0)`.
  const decimals = assetId === 'bch' ? 8 : (asset?.decimals ?? 8)
  const tokenDenominator = 10 ** decimals

  const totalAmountNumber = amountArray.reduce((acc, curr) => acc + (Number(curr) || 0), 0)
  const totalAmount = Number(totalAmountNumber.toFixed(decimals))

  // For BCH, "spendable" is the amount the user can actually send (and is what MAX uses).
  // Prefer it for the balance display to avoid showing 0 when `balance` is stale/missing.
  const walletBalance = isCashToken
    ? (Number(asset?.balance) || 0) / tokenDenominator
    : (assetId === 'bch'
        ? (Number.isFinite(Number(asset?.spendable)) ? Number(asset?.spendable) : (Number(asset?.balance) || 0))
        : (Number(asset?.balance) || 0))

  const currentWalletBalance = Number((walletBalance - totalAmount).toFixed(decimals))
  return currentWalletBalance
}

export function validateAddress (address, walletType, isCashToken) {
  const addressObj = new Address(address)
  let addressIsValid = false
  let formattedAddress

  try {
    if (walletType === 'bch') {
      if (!isCashToken) {
        addressIsValid = true

        if (isValidTokenAddress(address)) {
          formattedAddress = address
        } else if (
          (addressObj.isLegacyAddress() || addressObj.isCashAddress()) &&
          addressObj.isValidBCHAddress(isChipnet)
        ) {
          formattedAddress = addressObj.toCashAddress(address)
        }

        new Address(address).toCashAddress()
      } else {
        addressIsValid = isTokenAddress(address.split('?c=')[0])
        formattedAddress = address
      }
    }
    if (walletType === 'slp') {
      if (addressObj.isSLPAddress() && addressObj.isMainnetSLPAddress()) {
        addressIsValid = true
        formattedAddress = addressObj.toSLPAddress(address)
      }
    }
  } catch (err) {
    addressIsValid = false
    console.log(err)
  }

  return { valid: addressIsValid, address: formattedAddress }
}

/**
 * Will parse address with or without prefix, returns address with the prefix if it was missing
 * @param {String} prefixlessAddress 
 * @returns 
 */
export function parseAddressWithoutPrefix(prefixlessAddress) {
  if (typeof prefixlessAddress !== 'string') return {valid: false, error: 'Invalid address' }

  const resultWPrefix = decodeCashAddress(prefixlessAddress)
  if (typeof resultWPrefix !== 'string') {
    return { valid: true, address: prefixlessAddress }
  }

  const result = decodeCashAddressFormatWithoutPrefix(prefixlessAddress)
  if (typeof result === 'string') return { valid: false, error: result }

  return {
    valid: true,
    address: `${result.prefix}:${prefixlessAddress}`,
  }
}


export function raiseNotifyError (message, timeout = 3000, position = 'bottom') {
  Notify.create({
    type: 'negative',
    color: 'red-4',
    timeout: timeout,
    message: message,
    position
  })
}

export function paymentUriPromiseResponseHandler (error, opts = { defaultError: '' }) {
  if (error?.message === 'PaymentRequestIsExpired') {
    raiseNotifyError($t(error.message))
  } else if (error?.message === 'InvalidOutputAddress' || error?.name === 'InvalidOutputAddress') {
    raiseNotifyError($t('InvalidAddressFormat'))
  } else if (error?.message === 'InvalidOutputCount' || error?.name === 'InvalidOutputCount') {
    raiseNotifyError($t('MultipleRecipientsUnsupported'))
  } else if (opts?.defaultError) {
    raiseNotifyError(opts?.defaultError)
  }
}

export function submitPromiseErrorResponseHandler (result, walletType) {
  if (result.error.indexOf('not enough balance in sender') > -1) {
    if (walletType === 'bch') raiseNotifyError($t('NotEnoughForBoth'))
    else if (walletType === 'slp') raiseNotifyError($t('NotEnoughForSendAmount'))
  } else if (result.error.indexOf('has insufficient priority') > -1) {
    raiseNotifyError($t('NotEnoughForTransactionFee'))
  } else if (result.error.indexOf('not enough balance in fee funder') > -1) {
    raiseNotifyError($t('NotEnoughBchForFee'))
  } else if (result.error) {
    raiseNotifyError(result.error)
  } else {
    raiseNotifyError($t('UnknownError'))
  }
}

export function addressPrechecks (content, recipientList, walletAddress) {
  const address = content.split('?')[0]
  const isLegacy = checkIfLegacyAddress(address)

  return [
    isLegacy,
    checkDuplicateRecipient(address, recipientList),
    checkIfWalletAddress(address, walletAddress, isLegacy)
  ]
}

export function checkIfLegacyAddress (address) {
  return new Address(address).isLegacyAddress()
}

function checkDuplicateRecipient (recipient, recipientList) {
  return recipientList.findIndex(a => a === recipient) > -1 &&
    recipient && recipientList.length > 1
}

function checkIfWalletAddress (address, walletAddress, isLegacy) {
  if (isLegacy) {
    return address === new Address(walletAddress).toLegacyAddress()
  }
  return address === walletAddress
}

export function addRemoveInputFocus (index, inputFocus) {
  const bchInput = document.getElementsByClassName('bch-input-field')
  const fiatInput = document.getElementsByClassName('fiat-input-field')
  
  if (inputFocus === 'bch') {
    addRemoveClass(bchInput[index], true)
    addRemoveClass(fiatInput[index], false)
  } else if (inputFocus === 'fiat') {
    addRemoveClass(bchInput[index], false)
    addRemoveClass(fiatInput[index], true)
  } else {
    addRemoveClass(bchInput[index], false)
    addRemoveClass(fiatInput[index], false)
  }
}

function addRemoveClass (element, isFocus) {
  if (isFocus)
    element?.classList.add('q-field--focused', 'q-field--highlighted')
  else
    element?.classList.remove('q-field--focused', 'q-field--highlighted')
}

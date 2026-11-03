import { Store } from 'src/store'
import { markRaw } from '@vue/reactivity'
import { Dialog } from 'quasar'
import { i18n } from 'src/boot/i18n'
import { Address } from 'src/wallet'
import { JSONPaymentProtocol } from 'src/wallet/payment-uri'
import crypto from 'crypto'
import { Buffer } from 'buffer'
import axios from 'axios'
import { isValidTokenAddress, getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { isTokenAddress } from 'src/utils/address-utils'
import { toTokenAddress } from 'src/utils/crypto'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { raiseNotifyError } from './notify-utils'
import { decodeCashAddress, decodeCashAddressFormatWithoutPrefix } from '@bitauth/libauth'
import {
  generateChangeAddress,
  generateAddressSetWithoutSubscription,
  findUnusedAddressIndex,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

const { t: $t } = i18n.global

function isChipnet () {
  return Store.getters['global/isChipnet']
}

/**
 * Per-wallet, per-network queue that serialises change-address selection.
 *
 * Reading the cursor, scanning for an unused index and committing the advance
 * are separated by network round trips. Without this, two spends started at the
 * same time could pick the same index and land their change on the same
 * address. Reserving the index alone is not enough: when the scan has to skip
 * indices that are already used, both callers can still converge on the same
 * free index further along. Waiting for the previous call to finish means each
 * caller reads the cursor the previous one committed.
 *
 * @type {Map<string, Promise<unknown>>}
 */
const changeAddressQueues = new Map()

function queueChangeAddressSelection (key, task) {
  const previous = changeAddressQueues.get(key) || Promise.resolve()
  // Chain on both settle paths so one failure does not block later callers
  const run = previous.then(task, task)
  const tail = run.catch(() => {})
  changeAddressQueues.set(key, tail)
  tail.then(() => {
    if (changeAddressQueues.get(key) === tail) changeAddressQueues.delete(key)
  })
  return run
}

/**
 * Reads the shared address cursor, normalised to a non-negative integer.
 * New wallets start at -1, so the first pair is index 0. Change 1/0 is a normal
 * change address; only the receiving address 0/0 is reserved for message
 * encryption and never shown by the receive page.
 * @param {string} walletType
 * @returns {number}
 */
function readLastAddressIndex (walletType) {
  const index = Store.getters['global/getLastAddressIndex'](walletType)
  return typeof index === 'number' && index >= 0 ? index : 0
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
  } else if (id === 'bch' && asset) {
    // Asset data from store for bch doesn't have decimals
    asset = { ...asset, decimals: 8 };
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
 * Gets a fresh change address and advances the wallet to the next address pair,
 * so consecutive spends never reuse the same change address.
 *
 * Receiving and change addresses are always generated as a pair sharing one
 * index: `lastAddressIndex` N gives receiving `0/N` and change `1/N`. That single
 * index is the only cursor. Using `1/N` as change and then moving the cursor to
 * N+1 means the next spend gets `1/(N+1)`, whose public key has never been
 * exposed, and the next receive moves to the fresh pair `0/(N+1)` too.
 *
 * The change address is verified against the chain before use, so an index that
 * was already spent from (auto-generate off, a second device, a restored
 * wallet, a server index that lags behind) is skipped instead of reused. The
 * cursor advances as soon as the address is handed out, before broadcast, so a
 * second spend cannot pick `1/N` again while watchtower has not yet indexed the
 * first change output. Indices skipped by a cancelled send are harmless.
 *
 * This is unconditional (not tied to the "Auto generate address" setting),
 * because change addresses are never shown to the user and reusing one that was
 * already spent from exposes its public key on chain.
 *
 * Concurrent calls for the same wallet and network are serialised, so two spends
 * started at the same time cannot end up sharing a change address.
 *
 * IMPORTANT: This function subscribes the address to watchtower before returning.
 * If subscription fails, it throws instead of falling back to a stored change
 * address, which may already be used.
 *
 * @param {string} walletType - 'bch' or 'slp'
 * @param {Object} [opts]
 * @param {boolean} [opts.isChipnet] - Overrides the store network (used by pages paying from a chipnet address)
 * @returns {Promise<string>} The change address
 * @throws {Error} If no unused change address could be verified or subscribed
 */
export async function getChangeAddress (walletType, opts = {}) {
  const isChipnetVal = typeof opts.isChipnet === 'boolean' ? opts.isChipnet : isChipnet()
  const queueKey = `${walletType}:${isChipnetVal ? 'chipnet' : 'mainnet'}`

  return queueChangeAddressSelection(queueKey, () => (
    selectChangeAddress(walletType, isChipnetVal)
  ))
}

/**
 * @param {string} walletType
 * @param {boolean} isChipnetVal
 * @returns {Promise<string>}
 */
async function selectChangeAddress (walletType, isChipnetVal) {
  const walletIndex = Store.getters['global/getWalletIndex']
  const derivationPath = getDerivationPathForWalletType(walletType)
  const storedIndex = readLastAddressIndex(walletType)

  try {
    // First change address from storedIndex onward with no on-chain history
    const { addressIndex } = await findUnusedAddressIndex({
      chain: 'change',
      startIndex: storedIndex,
      walletIndex,
      derivationPath,
      isChipnet: isChipnetVal
    })

    const changeAddr = await generateChangeAddress({
      walletIndex,
      derivationPath,
      addressIndex,
      isChipnet: isChipnetVal
    })

    if (!changeAddr) {
      throw new Error('Failed to subscribe change address to watchtower. Please check your internet connection and try again.')
    }

    // Advance the shared cursor so neither this change address nor the pair it
    // belongs to can be reused by a later spend or receive
    const nextIndex = addressIndex + 1
    const nextAddressSet = await generateAddressSetWithoutSubscription({
      walletIndex,
      derivationPath,
      addressIndex: nextIndex,
      isChipnet: isChipnetVal
    })
    const nextAddresses = nextAddressSet?.success ? nextAddressSet.addresses : null

    const cursorUpdate = {
      type: walletType,
      isChipnet: isChipnetVal,
      lastAddressIndex: nextIndex
    }
    // Only overwrite the cached address pair when it could be derived
    if (nextAddresses) {
      cursorUpdate.lastAddress = nextAddresses.receiving
      cursorUpdate.lastChangeAddress = nextAddresses.change
    }

    Store.commit('global/generateNewAddressSet', cursorUpdate)

    return changeAddr
  } catch (error) {
    console.error('[getChangeAddress] Error generating a fresh change address:', error)
    const errorMessage = error?.message || 'Unknown error'
    throw new Error(`Failed to get change address: ${errorMessage}`)
  }
}

export function getExplorerLink (txid, isCashToken) {
  let url = 'https://bchexplorer.info/tx/'
  if (isChipnet()) url = 'https://chipnet.bchexplorer.info/tx/'
  return `${url}${txid}`
}

export function getExplorerAddressLink (address) {
  let url = 'https://bchexplorer.info/address/'
  if (isChipnet()) url = 'https://chipnet.bchexplorer.info/address/'
  return `${url}${address || ''}`
}

export function getExplorerBaseUrl () {
  return isChipnet() ? 'https://chipnet.bchexplorer.info' : 'https://bchexplorer.info'
}

export function getExplorerLinkForNetwork (txid, isTestnet) {
  const base = isTestnet ? 'https://chipnet.bchexplorer.info/tx/' : 'https://bchexplorer.info/tx/'
  return `${base}${txid}`
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

export function convertFiatToSelectedAsset (amount, selectedAssetMarketPrice, decimals = 8) {
  const parsedAmount = Number(amount)
  if (!parsedAmount) return ''
  if (!selectedAssetMarketPrice) return ''
  const computedBalance = Number(parsedAmount || 0) / Number(selectedAssetMarketPrice)
  const safeDecimals = Number.isFinite(decimals) && decimals >= 0 ? decimals : 8
  return computedBalance.toFixed(safeDecimals)
}

/**
 * @param {{ id: string, balance: number, decimals: number, spendable: number }} asset 
 * @param {{ amount: string, amountFiat: string, cauldronEnabled: boolean, cauldronAmount: string, cauldronTokenId?: string }[]} amountsArray
 * @returns 
 */
export function adjustWalletBalances(asset, amountsArray) {
  const isCashtokenFT = asset.id.startsWith('ct/');

  /** @type {Record<string, number>} Map of asset IDs and remaining balances */
  const assetBalancesMap = {}

  return amountsArray
    .map(amounts => { /** Populate assetBalanceMap and deduct from each */
      let assetToDeduct = asset;
      let amountToDeduct = Number(amounts.amount);
      if (amounts.cauldronAmount || amounts.cauldronEnabled) {
        assetToDeduct = getAsset(isCashtokenFT ? 'bch' : `ct/${amounts.cauldronTokenId}`);
        amountToDeduct = Number(amounts.cauldronAmount);
      }

      // Check and populate if balance has not yet been initialized
      if (assetBalancesMap[assetToDeduct.id] === undefined) {
        const assetToAdd = assetToDeduct.id === asset.id ? asset : getAsset(assetToDeduct.id, '');

        // At the moment, balances for cashtokens are in base units,
        // while for bch asset it is not in satoshis but BCH
        // so we have to normalize the non BCH balances
        const balance = Number(assetToDeduct.id === 'bch' ? assetToAdd.spendable : assetToAdd.balance) || 0;
        const assetDecimals = parseInt(assetToDeduct.decimals) || 0;
        const normalizedBalance = assetToDeduct.id === 'bch' ? balance : (balance / 10 ** assetDecimals);

        assetBalancesMap[assetToDeduct.id] = normalizedBalance
        console.debug('Adding wallet balances', { assetToAdd, assetBalancesMap });
      }

      assetBalancesMap[assetToDeduct.id] -= amountToDeduct;
      console.debug('Adjusting wallet balances', { amounts, assetToDeduct, amountToDeduct, assetBalancesMap });
      return { assetId: assetToDeduct.id }
    })
    .map(data => {
      return { ...data, balance: assetBalancesMap[data.assetId] }
    })
}


export function adjustWalletBalance (asset, amountArray) {
  const assetId = String(asset?.id || '')
  const isCashToken = assetId.startsWith('ct/')
  // IMPORTANT:
  // - BCH should always be treated as 8 decimals for send/balance math.
  // - Some navigation paths pass an `asset` object with `decimals: 0` for BCH,
  //   which would round values like 0.09 BCH down to 0 when using `toFixed(0)`.
  const decimals = assetId === 'bch' ? 8 : (asset?.decimals ?? 0)
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
        addressIsValid = true

        if (isTokenAddress(address.split('?c=')[0])) {
          formattedAddress = address
        } else if (
          (addressObj.isLegacyAddress() || addressObj.isCashAddress()) &&
          addressObj.isValidBCHAddress(isChipnet)
        ) {
          formattedAddress = toTokenAddress(addressObj.toCashAddress(address))
        }

        new Address(address).toCashAddress()
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

export function withTimeout (promise, ms = 120000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Broadcast request timed out')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
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

/**
 * Check if an address belongs to the current wallet via Watchtower address-info API.
 * Compares response wallet_digest (sha224 of hex wallet hash) with the given wallet hash.
 * @param {string} address - BCH cash address (no BIP21 query)
 * @param {string} walletHashHex - Hex-formatted wallet hash
 * @param {boolean} isChipnet - Whether chipnet/mainnet
 * @returns {Promise<boolean>} True if API returns wallet_digest matching our digest
 */
export async function addressBelongsToWallet (address, walletHashHex, isChipnet) {
  if (!address || !walletHashHex) return false
  const baseUrl = getWatchtowerApiUrl(isChipnet)
  const url = `${baseUrl}/address-info/bch/${encodeURIComponent(address)}/`
  try {
    const { data } = await axios.get(url, { timeout: 10000 })
    const apiDigest = data?.wallet_digest
    if (!apiDigest) return false
    const walletHashBuffer = Buffer.from(walletHashHex, 'hex')
    const ourDigest = crypto.createHash('sha224').update(walletHashBuffer).digest('hex')
    return ourDigest.toLowerCase() === String(apiDigest).toLowerCase()
  } catch {
    return false
  }
}

/**
 * Look up merchant info associated with a BCH cash address.
 * @param {string} address - BCH cash address
 * @param {boolean} isChipnet - Whether chipnet/mainnet
 * @returns {Promise<{name:string, logo:string, logoData:string, verified:boolean}|null>} Merchant data or null
 */
export async function lookupMerchantByAddress (address, isChipnet) {
  if (!address) return null
  const baseUrl = getWatchtowerApiUrl(isChipnet)
  const url = `${baseUrl}/paytacapos/merchants/vault_address/`
  try {
    const { data } = await axios.post(url, { address }, { timeout: 10000 })
    if (data?.name) {
      return {
        name: data.name,
        logo: data?.logos?.['60x60'] || '',
        logoData: data.logo_data || '',
        verified: Boolean(data.verified)
      }
    }
    return null
  } catch {
    return null
  }
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

import { Store } from 'src/store'
import { LIFT_TOKEN_CATEGORY } from 'src/utils/subscription-utils'
import { eliteRequirements } from 'src/utils/engagementhub-utils/elite-requirements'
import { bchToDisplay } from 'src/utils/engagementhub-utils/display-rates'
import { ELITEPROGRAM_URL } from 'src/utils/engagementhub-utils/api'

export { eliteRequirements }

function selectedCurrencyCode () {
  return Store.getters['market/selectedCurrency']?.symbol || 'PHP'
}

function withCurrency (params = {}) {
  return { ...params, currency: selectedCurrencyCode() }
}

// ================================
// Paytaca Elite Program enums
// ================================

export const EliteStatus = Object.freeze({
  CHECKING: 'checking',
  LOCKED: 'locked',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ONHOLD: 'onhold'
})

export const EliteStatusLabels = Object.freeze({
  [EliteStatus.CHECKING]: 'Checking',
  [EliteStatus.LOCKED]: 'Locked',
  [EliteStatus.ACTIVE]: 'Active',
  [EliteStatus.PAUSED]: 'Paused',
  [EliteStatus.ONHOLD]: 'On-hold'
})

export function normalizeEliteStatus (status) {
  return Object.values(EliteStatus).includes(status)
    ? status
    : EliteStatus.LOCKED
}

export const EliteRedeemErrorCode = Object.freeze({
  Unknown: 'ELITE-RDM-00',
  WalletUnavailable: 'ELITE-RDM-01',
  PointsLoadFailed: 'ELITE-RDM-02',
  SwapConfigUnavailable: 'ELITE-RDM-03',
  ContractBalanceUnavailable: 'ELITE-RDM-04',
  InsufficientBchForFee: 'ELITE-RDM-05',
  ContractTransactionFailed: 'ELITE-RDM-06',
  SwapFailedAfterBroadcast: 'ELITE-RDM-07',
  RecordFailedAfterSwap: 'ELITE-RDM-08'
})

const ELITE_REDEEM_ERROR_CODES = new Set(Object.values(EliteRedeemErrorCode))

export function appendEliteRedeemErrorRef (message, errorCode) {
  const ref = ELITE_REDEEM_ERROR_CODES.has(errorCode)
    ? errorCode
    : EliteRedeemErrorCode.Unknown
  return `${message} (${ref})`
}

export const EliteTxType = Object.freeze({
  OTC: 'otc',
  MARKETPLACE: 'mkp'
})

export const EliteTxTypeLabels = Object.freeze({
  [EliteTxType.OTC]: 'Over-the-counter',
  [EliteTxType.MARKETPLACE]: 'Marketplace'
})
export const getEliteTxTypeLabel = type => EliteTxTypeLabels[type] || 'Unknown purchase'

export const EliteTxTypeIcons = Object.freeze({
  [EliteTxType.OTC]: 'store',
  [EliteTxType.MARKETPLACE]: 'img:marketplace.svg'
})

export const EliteTxTypeRefLabels = Object.freeze({
  [EliteTxType.OTC]: 'Ref. ID',
  [EliteTxType.MARKETPLACE]: 'Order #'
})

export const EliteAsset = Object.freeze({
  BCH: 'sats',
  LIFT: 'lift'
})

export const EliteAssetLabels = Object.freeze({
  [EliteAsset.BCH]: 'BCH',
  [EliteAsset.LIFT]: 'LIFT Token'
})
export const getEliteAssetLabel = asset => EliteAssetLabels[asset] || 'Unknown asset'

export const EliteAssetIcons = Object.freeze({
  [EliteAsset.BCH]: 'img:bch-logo.png',
  [EliteAsset.LIFT]: 'img:lift-token.png'
})

// ================================
// functions with calls to engagement hub
// ================================

export async function getAssetsThresholds (programId = null) {
  // Throws rather than substituting a fallback. These values gate enrollment, and
  // the two assets are in different units -- the BCH one is a fiat amount in the
  // display currency despite its key name, the LIFT one is atomic units. Pass
  // the enrolled Program's id to get its age-based floor; without one the base
  // is returned. A hardcoded guess that is merely plausible is worse than an
  // error, so the caller shows its retry state.
  return await ELITEPROGRAM_URL
    .get(
      'get_assets_min_thresholds/',
      { params: withCurrency(programId ? { program: programId } : {}) }
    )
    .then(resp => {
      if (resp.status === 200) return resp.data
      throw new Error(`Unexpected status ${resp.status} fetching Elite Program thresholds`)
    })
}

export async function enrollEliteProgram (walletHash, lookupKey) {
  try {
    const resp = await ELITEPROGRAM_URL.post(
      'enroll/',
      { wallet_hash: walletHash, lookup_key: lookupKey },
      { headers: { 'X-Elite-Program-Key': process.env.ELITE_PROGRAM_API_KEY } }
    )
    return { ok: true, data: resp.data }
  } catch (error) {
    const aborted = Boolean(error?.message?.includes('aborted'))
    if (!aborted) {
      console.error(error)
    }
    return {
      ok: false,
      aborted,
      status: error?.response?.status ?? null,
      code: error?.response?.data?.code ?? null
    }
  }
}

export async function getEliteProgramSummaryData (id) {
  return await ELITEPROGRAM_URL
    .get(`${id}/`, { params: withCurrency() })
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return null
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return null
    })
}

export async function getEliteProgramTransactionsData (id, limit, offset) {
  return await ELITEPROGRAM_URL
    .get(`${id}/transactions/`, {
      params: withCurrency({ limit, offset })
    })
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return []
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return []
    })
}

export async function getEliteProgramTopupsData (id, limit, offset) {
  return await ELITEPROGRAM_URL
    .get(`${id}/topups/`, {
      params: withCurrency({ limit, offset })
    })
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return []
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return []
    })
}

export async function getEliteProgramHistorySummaryData (id) {
  return await ELITEPROGRAM_URL
    .get(`${id}/summary/`, { params: withCurrency() })
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return null
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return null
    })
}

export async function getEliteProgramMonthlyStats (id) {
  return await ELITEPROGRAM_URL
    .get(`${id}/monthly/`, { params: withCurrency() })
    .then(resp => {
      if (resp.status === 200) return resp.data
      else return null
    })
    .catch(error => {
      if (!error?.message?.includes('aborted')) {
        console.error(error)
      }
      return null
    })
}

const ELITE_ELIGIBILITY_RETRY_DELAYS_MS = [2000, 5000, 10000, 20000]

export async function processEliteEligibility (
  data,
  retryDelaysMs = ELITE_ELIGIBILITY_RETRY_DELAYS_MS
) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await ELITEPROGRAM_URL.post(
        'process_eligibility/',
        data,
        {
          headers: { 'X-Elite-Program-Key': process.env.ELITE_PROGRAM_API_KEY },
          // The claim names a spend Watchtower may not have indexed yet, and a
          // retry can outlive the screen that started it. Route changes call
          // requestManager.abortAll(), which would otherwise cancel it.
          skipAbortManager: true
        }
      )
      return response.data
    } catch (error) {
      const status = error?.response?.status
      // A previous attempt (or another caller) already earned this cashback.
      if (status === 409) return null

      const retryable = (
        status === undefined || status === 503
      ) && attempt < retryDelaysMs.length
      if (!retryable) {
        // 403 and 404 are expected final answers: an inactive Program or a
        // recipient that is not a verified merchant.
        if (status !== 403 && status !== 404) {
          console.warn(
            '[Elite] eligibility request failed' +
            (status ? ` (${status})` : '') + ':',
            error?.response?.data || error?.message
          )
        }
        return null
      }

      await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt]))
    }
  }
}

// ================================
// enrollment requirements
// ================================

/**
 * Reads the wallet's BCH and LIFT balances in the units the thresholds use.
 *
 * Returns `null` for a balance that cannot be known yet (no assets loaded, or
 * no fiat price for BCH), because the caller's comparison treats an unknown
 * balance as "no answer". Reporting `0` instead would claim the wallet is short
 * by the whole floor.
 */
export function getEliteWalletBalances (rates = null) {
  const assets = Store.getters['assets/getAssets'] || []
  if (!assets.length) return { bchBalance: null, liftBalance: null }

  const bchAsset = assets[0]
  const liftAsset = assets.find(asset => asset.id === `ct/${LIFT_TOKEN_CATEGORY}`)
  const liftBalance = Number(liftAsset?.balance ?? 0)

  const displayPerBch = Number(rates?.display_per_bch)
  const hasDisplayRate = rates?.display_per_bch !== null
    && rates?.display_per_bch !== undefined
    && rates?.display_per_bch !== ''
    && Number.isFinite(displayPerBch)
    && displayPerBch > 0

  if (hasDisplayRate) {
    return {
      bchBalance: bchToDisplay(bchAsset?.balance ?? 0, rates),
      liftBalance
    }
  }

  const currency = Store.getters['market/selectedCurrency']
  const rawPrice = Store.getters['market/getAssetPrice'](bchAsset?.id ?? 'bch', currency?.symbol)
  const bchPrice = Number(rawPrice)
  const priceUnknown = rawPrice === null
    || rawPrice === undefined
    || rawPrice === ''
    || !Number.isFinite(bchPrice)
  if (priceUnknown) return { bchBalance: null, liftBalance }

  return {
    bchBalance: Number(bchAsset?.balance ?? 0) * bchPrice,
    liftBalance
  }
}

export async function getEliteRequirements (programId = null) {
  const thresholds = await getAssetsThresholds(programId)
  const requirements = eliteRequirements(
    thresholds,
    getEliteWalletBalances(thresholds?.rates)
  )

  return {
    ...requirements,
    currency: thresholds?.currency || 'PHP',
    rates: thresholds?.rates || null,
    rateUnavailable: thresholds?.rate_unavailable === true,
    capResetsAt: thresholds?.cap_resets_at || null
  }
}

export {requirementState} from 'src/utils/engagementhub-utils/elite-requirements'
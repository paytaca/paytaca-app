export function availabilityError (code = 'p2p_availability_unverified', feature) {
  return Object.assign(new Error(code), { response: { status: 503, data: { code, feature } } })
}

export function assertP2PAvailable (controls, feature) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) throw availabilityError()
  if (controls.P2P_MAINTENANCE === true) throw availabilityError('p2p_maintenance', 'P2P_MAINTENANCE')
  if (controls.P2P_MAINTENANCE !== false) throw availabilityError()
  const legacySpendControl = ['RELEASE_BCH', 'REFUND_BCH'].includes(feature) &&
    !Object.prototype.hasOwnProperty.call(controls, feature)
  if (feature && !legacySpendControl && controls[feature] !== true) throw availabilityError('p2p_feature_disabled', feature)
  return controls
}

// Cache-busting nonce only; this counter does not represent application state.
let requestId = 0

export async function fetchP2PAvailability (client, feature, { skipAbortManager = false, userType = true } = {}) {
  try {
    const response = await client.get('/ramp-p2p/feature-control/', {
      authorize: userType,
      params: { _fresh: `${Date.now()}-${++requestId}` },
      timeout: 10000,
      skipAbortManager,
      cache: false
    })
    if (response.status !== 200 || response.cached === true) throw availabilityError()
    return assertP2PAvailable(response.data, feature)
  } catch (error) {
    if (isP2PAvailabilityError(error)) throw error
    const failure = availabilityError()
    if (!error?.response && (error?.isAxiosError || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code))) {
      failure.response.data.reason = /timeout/i.test(error?.message || '') || error?.code === 'ETIMEDOUT' ? 'timeout' : 'connection'
    }
    throw failure
  }
}

export function isP2PAvailabilityError (error) {
  return ['p2p_maintenance', 'p2p_feature_disabled', 'p2p_availability_unverified'].includes(error?.response?.data?.code)
}

export function p2pAvailabilityMessage (t, error) {
  if (error?.response?.data?.code === 'p2p_availability_unverified') {
    if (error.response.data.reason === 'timeout') {
      return t('P2PAvailabilityCheckTimedOut', {}, 'The P2P availability check timed out. Please retry.')
    }
    if (error.response.data.reason === 'connection') {
      return t('P2PAvailabilityConnectionFailed', {}, 'Could not reach P2P to check availability. Please retry.')
    }
  }
  if (error?.response?.data?.code === 'p2p_maintenance') {
    return t('P2PUnderMaintenance', {}, 'P2P is temporarily under maintenance. Please try again later.')
  }
  if (error?.response?.data?.code === 'p2p_feature_disabled') {
    if (error.response.data.feature === 'RELEASE_BCH') {
      return t('P2PReleaseUnavailable', {}, 'Escrow releases are temporarily unavailable. Please try again later.')
    }
    if (error.response.data.feature === 'REFUND_BCH') {
      return t('P2PRefundUnavailable', {}, 'Escrow refunds are temporarily unavailable. Please try again later.')
    }
    return t('P2PFeatureUnavailable', {}, 'This P2P action is temporarily unavailable. Do not fund previously generated contracts. Please try again later.')
  }
  return t('P2PTemporarilyUnavailable', {}, 'P2P is temporarily unavailable. Please check back later. You can continue using the rest of your wallet.')
}

export function p2pRequestFeature (config) {
  const path = String(config.url || '').split('?')[0]
  const method = String(config.method || 'get').toLowerCase()
  if (method === 'post' && /\/ramp-p2p\/order\/$/.test(path)) return 'ORDER_CREATE'
  if (method === 'post' && /\/ramp-p2p\/order\/(contract|\d+\/pending-escrow)\/$/.test(path)) return 'ORDER_ESCROW'
  if (method === 'post' && /\/ramp-p2p\/ad\/$/.test(path)) return 'AD_CREATE'
  if (['put', 'patch'].includes(method) && /\/ramp-p2p\/ad\/\d+\/$/.test(path)) return 'AD_UPDATE'
  return null
}

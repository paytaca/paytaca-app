export function updatePaymentMethod (state, data) {
  state.paymentMethod = data
}

export function updateLastPaymentMethod (state, data) {
  state.lastPaymentMethod = data
}

/**
 * @param {Object} state
 * @param {Object} data
 * @param {Number} data.id
 * @param {Number} data.index
 * @param {String} data.name
 * @param {String} data.wallet_hash
 * @param {String} data.primary_contact_number
 * @param {String} data.branch_count
 * @param {String} data.pos_device_count
 * @param {Object} [data.location]
 * @param {String} data.location.landmark
 * @param {String} data.location.location
 * @param {String} data.location.street
 * @param {String} data.location.city
 * @param {String} data.location.country
 * @param {String} data.location.longitude
 * @param {String} data.location.latitude
 *
 */
function parseMerchantData(data) {
  return {
    id: data?.id,
    index: data?.index,
    walletHash: data?.wallet_hash,
    name: data?.name,
    verificationTokenCategory: data?.minter?.category,
    primaryContactNumber: data?.primary_contact_number,
    branchCount: data?.branch_count,
    posDeviceCount: data?.pos_device_count,
    location: {
      landmark: data?.location?.landmark,
      location: data?.location?.location,
      street: data?.location?.street,
      city: data?.location?.city,
      country: data?.location?.country,
      longitude: data?.location?.longitude,
      latitude: data?.location?.latitude,
    },
  }
}

/**
 * @param {Object} state
 * @param {Object[]} data
 */
export function storeMerchantsListInfo(state, data) {
  data?.forEach(rawMerchantData => {
    const merchantData = parseMerchantData(rawMerchantData)
    if (!merchantData.id || !merchantData.walletHash) return

    const index = state?.merchants?.findIndex(_merchantData => _merchantData?.id == merchantData.id)
    if (index >= 0) state.merchants[0] = merchantData
    else state.merchants.push(merchantData)
  })
}

/**
 * @param {Object} state
 * @param {Number} merchantId
 */
export function removeMerchantInfo(state, merchantId) {
  if (!Array.isArray(state.merchants)) return
  state.merchants = state.merchants.filter(merchantData => merchantData?.id !== merchantId)
}

export function clearMerchantsInfo(state) {
  state.merchants = []
}

/**
 * @param {Object} state
 * @param {Object} data
 * @param {Number} data.id
 * @param {String} data.name
 * @param {Boolean} data.is_main
 * @param {Object} data.merchant
 * @param {Number} data.merchant.id
 * @param {String} data.merchant.name
 * @param {String} data.merchant.wallet_hash
 * @param {Object} [data.location]
 * @param {String} data.location.landmark
 * @param {String} data.location.location
 * @param {String} data.location.street
 * @param {String} data.location.city
 * @param {String} data.location.country
 * @param {String} data.location.longitude
 * @param {String} data.location.latitude
 */
 export function updateBranchInfo(state, data) {
  if (!data?.id) return
  if (!Array.isArray(state.branches)) state.branches = []

  const _branchInfo = {
    id: data?.id,
    merchantId: data?.merchant?.id,
    merchantWalletHash: data?.merchant?.wallet_hash,
    isMain: data?.is_main,
    name: data?.name,
    location: {
      landmark: data?.location?.landmark,
      location: data?.location?.location,
      street: data?.location?.street,
      city: data?.location?.city,
      country: data?.location?.country,
      longitude: data?.location?.longitude,
      latitude: data?.location?.latitude,
    },
  }

  Object.assign(_branchInfo, data)
  const index = state.branches.findIndex(branchInfo => branchInfo?.id === _branchInfo?.id)
  if (index >=0) state.branches[index] = _branchInfo
  else state.branches.push(_branchInfo)

  if (_branchInfo?.isMain) state.branches.forEach(branch => {
    if (_branchInfo?.id != branch?.id) branch.isMain = false
  })
}

/**
 * @param {Object} state
 * @param {Number} branchId
 */
export function removeBranchInfo(state, branchId) {
  if (!Array.isArray(state.branches)) return
  state.branches = state.branches.filter(branchInfo => branchInfo?.id !== branchId)
}

export function clearBranchInfo(state) {
  state.branches = []
}

/**
 * @param {Object} state
 * @param {Object} data
 * @param {String} data.walletHash
 * @param {Number} data.posid
 * @param {String} data.code
 * @param {Number} data.expiresAt
 * @param {Number} data.decryptKey
 * @param {Number} data.nonce
 */
export function saveLinkCode(state, data) {
  if (!data.walletHash || !data.code || !data.expiresAt || !data.decryptKey || !Number.isSafeInteger(data.nonce)) return
  if (!Array.isArray(state.linkCodes)) state.linkCodes = []

  const _linkCode = {
    walletHash: data?.walletHash || '',
    posid: data?.posid,
    code: data?.code || '',
    expiresAt: data?.expiresAt || 0,
    decryptKey: data?.decryptKey || '',
    nonce: data?.nonce || 0,
  }

  const index = state.linkCodes.findIndex(
    linkCode => linkCode?.walletHash === _linkCode.walletHash && linkCode?.posid === _linkCode?.posid
  )

  if (index >= 0) state.linkCodes[index] = _linkCode
  else state.linkCodes.push(_linkCode)
}

/**
 * @param {Object} state
 * @param {Object} data
 * @param {String} [data.code]
 * @param {String} [data.walletHash]
 * @param {Number} [data.posid]
 */
export function removeLinkCode(state, data) {
  if (!Array.isArray(state.linkCodes)) return

  state.linkCodes = state.linkCodes
    .filter(linkCode => {
      if (data?.code && data?.code === linkCode?.code) return false
      if (data?.walletHash && isFinite(data?.posid)) {
        if (linkCode?.walletHash === data.walletHash && linkCode?.posid === data?.posid) return false
      }
      return true
    })
}

/**
 * @param {Object} state
 * @param {Object} data
 * @param {String} data.walletHash
 * @param {Number} data.posid
 * @param {Number} [data.lastActive]
 */
export function setDeviceLastActive(state, data) {
  const index = state.devicesLastActive.findIndex(
    deviceLastActive => deviceLastActive?.walletHash === data.walletHash && deviceLastActive?.posid === data?.posid
  )

  if (index >= 0) state.devicesLastActive[index].lastActive = data?.lastActive
  else state.devicesLastActive.push(data)

  state.devicesLastActive = state.devicesLastActive.filter(deviceLastActive => deviceLastActive?.lastActive)
}

/**
 *
 * @param {Object} state
 * @param {Object} data
 * @param {String} data.txid
 * @param {String} data.otp
 * @param {Number} data.otpTimestamp
 * @param {String} data.rawPaymentUri
 */
export function saveOTPCache(state, data) {
  if (!data?.txid || !data?.otp || !data?.otpTimestamp || !data?.rawPaymentUri) return

  if (!state.paymentOTPCache) state.paymentOTPCache = {}
  state.paymentOTPCache[data.txid] = {
    _added_at: Math.floor(Date.now()/1000),
    otp: data.otp,
    otpTimestamp: data.otpTimestamp,
    rawPaymentUri: data.rawPaymentUri,
  }
}

/**
 *
 * @param {Object} state
 * @param {String} txid
 */
export function removeTxOTPCache(state, txid) {
  if (!state.paymentOTPCache) return

  delete state.paymentOTPCache?.[txid]
}


/**
 * Remove qr data older than age specified in seconds
 * @param {Number} age seconds
 */
export function removeOldPaymentOTPCache(state, age=86400) {
  const now = Math.floor(Date.now()/1000)
  const cutoffTimestamp = now - age
  for (const txid in state.paymentOTPCache) {
    const timestamp = state.paymentOTPCache?.[txid]?._added_at
    if (cutoffTimestamp > timestamp || !Number.isSafeInteger(timestamp)) delete state.paymentOTPCache?.[txid]
  }
}

export function updateCashoutMerchant (state, data) {
  state.cashoutMerchant = data
}

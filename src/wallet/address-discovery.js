/**
 * Shared BIP44 gap-limit address discovery for BCH and SLP wallets.
 *
 * The backend checks each receiving/change address for on-chain history. A
 * missing `has_history` value must fail the scan instead of being treated as
 * an unused address, otherwise a failed backend lookup looks like a completed
 * scan and silently stops before hidden funds are discovered.
 *
 * @param {Object} deps
 * @param {Function} deps.getAddressSetAt - Returns { receiving, change } for an index
 * @param {Object} deps.watchtower - Watchtower client
 * @param {string} deps.walletHash - Wallet hash
 * @param {string} deps.projectId - Watchtower project id
 * @param {Object} [opts]
 * @param {number} [opts.gapLimit=200] - Consecutive empty addresses before stopping a chain
 * @param {number} [opts.batchSize=50] - Addresses per batch API request
 * @param {number} [opts.maxScans=2000] - Safety cap on total addresses to scan
 * @param {Function} [opts.onProgress] - Progress callback
 * @returns {Promise<Object>} Discovery result with discovered indices and subscription status
 */
export async function discoverWalletAddresses (deps, opts = {}) {
  const {
    gapLimit = 200,
    batchSize = 50,
    maxScans = 2000,
    onProgress,
  } = opts

  const result = {
    success: false,
    discoveredReceiving: [],
    discoveredChange: [],
    highestReceivingIndex: -1,
    highestChangeIndex: -1,
    subscribed: 0,
    scanned: 0,
    complete: false,
    hitScanLimit: false,
    error: null,
    status: null,
  }

  const chains = {
    receiving: { gapCount: 0, done: false },
    change: { gapCount: 0, done: false },
  }
  let currentIndex = 0
  let totalScanned = 0
  const scanAddressSets = []

  const allChainsDone = () => chains.receiving.done && chains.change.done

  while (totalScanned < maxScans && !allChainsDone()) {
    const batchEnd = Math.min(currentIndex + batchSize, maxScans)
    const addressSets = []

    for (let i = currentIndex; i < batchEnd; i++) {
      const addresses = await deps.getAddressSetAt(i)
      addressSets.push({
        address_index: i,
        receiving: addresses.receiving,
        change: addresses.change,
      })
      scanAddressSets.push({ address_index: i, addresses })
    }

    let apiResponse
    try {
      apiResponse = await deps.watchtower.BCH._api.post(
        'wallet/address-discover/',
        {
          address_sets: addressSets,
          wallet_hash: deps.walletHash,
          project_id: deps.projectId,
        }
      )
    } catch (error) {
      result.error = error?.message || String(error)
      result.status = error?.response?.status || null
      return result
    }

    const discoveryResults = apiResponse.data?.results
    if (!Array.isArray(discoveryResults)) {
      result.error = 'Address discovery returned an invalid response'
      return result
    }

    const resultsByIndex = new Map()
    for (const discovery of discoveryResults) {
      resultsByIndex.set(discovery.address_index, discovery)
    }

    // An address the backend could not check must not be treated as unused:
    // doing so silently ends the scan and reports success.
    const hasHistory = (discovery, chain) => {
      const detail = discovery[chain]
      if (!detail || typeof detail.has_history !== 'boolean') {
        throw new Error(`Address discovery returned no ${chain} history for index ${discovery.address_index}`)
      }
      return detail.has_history
    }

    try {
      for (let i = currentIndex; i < batchEnd; i++) {
        const discovery = resultsByIndex.get(i)
        if (!discovery) {
          throw new Error(`Address discovery returned no result for index ${i}`)
        }

        if (!chains.receiving.done) {
          if (hasHistory(discovery, 'receiving')) {
            chains.receiving.gapCount = 0
            result.discoveredReceiving.push({
              address_index: i,
              address: discovery.receiving.address,
            })
            result.highestReceivingIndex = Math.max(result.highestReceivingIndex, i)
          } else if (++chains.receiving.gapCount >= gapLimit) {
            chains.receiving.done = true
          }
        }

        if (!chains.change.done) {
          if (hasHistory(discovery, 'change')) {
            chains.change.gapCount = 0
            result.discoveredChange.push({
              address_index: i,
              address: discovery.change.address,
            })
            result.highestChangeIndex = Math.max(result.highestChangeIndex, i)
          } else if (++chains.change.gapCount >= gapLimit) {
            chains.change.done = true
          }
        }
      }
    } catch (error) {
      result.error = error?.message || String(error)
      return result
    }

    totalScanned += addressSets.length
    currentIndex = batchEnd

    if (onProgress) {
      onProgress({
        scanned: totalScanned,
        discoveredReceiving: result.discoveredReceiving.length,
        discoveredChange: result.discoveredChange.length,
        phase: 'discovering',
      })
    }
  }

  result.scanned = totalScanned
  result.complete = allChainsDone()
  result.hitScanLimit = !result.complete && totalScanned >= maxScans

  const highestIndex = Math.max(
    result.highestReceivingIndex,
    result.highestChangeIndex
  )

  if (highestIndex >= 0) {
    const subscribeSets = scanAddressSets.filter(set => set.address_index <= highestIndex)
    const subscribeCount = subscribeSets.length

    if (onProgress) {
      onProgress({
        scanned: totalScanned,
        discoveredReceiving: result.discoveredReceiving.length,
        discoveredChange: result.discoveredChange.length,
        phase: 'subscribing',
      })
    }

    // Subscribing a large range in one request can exceed the API timeout and
    // leave the scan half-applied. Send manageable chunks instead.
    const subscribeBatchSize = 50
    for (let i = 0; i < subscribeSets.length; i += subscribeBatchSize) {
      const subscribePayload = {
        address_sets: subscribeSets.slice(i, i + subscribeBatchSize),
        wallet_hash: deps.walletHash,
        project_id: deps.projectId,
      }

      try {
        await deps.watchtower.BCH._api.post('wallet/address-scan/', subscribePayload)
      } catch (error) {
        result.error = error?.message || String(error)
        result.status = error?.response?.status || null
        return result
      }
    }

    result.subscribed = subscribeCount
  }

  result.success = true
  return result
}

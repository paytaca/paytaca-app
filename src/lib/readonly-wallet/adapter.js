/**
 * ============================================================================
 * READ-ONLY WALLET - adapter
 * ============================================================================
 * Provides a thin adapter that exposes the single-sig wallet interface that
 * the rest of the app already consumes (loadWallet/cachedLoadWallet ->
 * getWalletByNetwork(wallet, 'bch')) backed by a ReadOnlyWallet. This lets
 * existing pages (history, receive, asset list, dashboard) work with read-only
 * wallets without modifying them, while never touching the private-key code
 * paths.
 */

import { cashAddressToLockingBytecode } from 'bitauth-libauth-v3'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { getXpubFingerprint, toFullDerivationPath } from './readonly-wallet'

const projectId = {
  mainnet: process.env.WATCHTOWER_PROJECT_ID,
  chipnet: process.env.WATCHTOWER_CHIP_PROJECT_ID
}

const UNSUPPORTED_ERROR = 'Read-only wallets do not support SLP tokens'

export class ReadOnlyBchWallet {
  /**
   * @param {Object} opts
   * @param {import('./readonly-wallet').default} opts.wallet - Shared ReadOnlyWallet
   * @param {'mainnet'|'chipnet'} opts.network
   */
  constructor ({ wallet, network }) {
    this._wallet = wallet
    this.network = network
    this.isChipnet = network === 'chipnet'
    this.derivationPath = wallet.derivationPath
    this.xpub = wallet.xpub
    this.projectId = projectId[network]
    this.walletHash = wallet.walletHashFor(network)
    this.baseUrl = getWatchtowerApiUrl(this.isChipnet)
  }

  /** Read-only wallets never hold a mnemonic. */
  get mnemonic () {
    return null
  }

  get watchtower () {
    return this._wallet.watchtowerFor(this.network)
  }

  getWalletHash () {
    return this.walletHash
  }

  getXPubKey () {
    return this.xpub
  }

  getAddressSetAt (addressIndex) {
    return this._wallet.getAddressSet(addressIndex, this.network)
  }

  getNewAddressSet (addressIndex) {
    const addressSet = this._wallet.getAddressSet(addressIndex, this.network)
    const data = {
      addresses: addressSet,
      projectId: this.projectId,
      walletHash: this.walletHash,
      addressIndex
    }
    return this.watchtower.subscribe(data).then(result => {
      if (result?.success) {
        return { addresses: addressSet }
      }
      return null
    })
  }

  getLastAddressIndex (opts = {}) {
    const params = {
      with_tx: opts?.with_tx || false,
      exclude_pos: opts?.exclude_pos || false,
      posid: opts?.posid || undefined
    }
    return this.watchtower.BCH._api.get(
      `last-address-index/wallet/${this.walletHash}/`,
      { params }
    ).then(apiResponse => {
      if (Number.isInteger(apiResponse?.data?.address?.address_index)) {
        return apiResponse.data.address.address_index
      }
    })
  }

  scanUtxos (opts = {}) {
    const queryParams = {}
    if (opts?.background) queryParams.background = true
    return this.watchtower.BCH._api.get(
      `utxo/wallet/${this.walletHash}/scan/`,
      { params: queryParams }
    )
  }

  getUtxos (opts = {}) {
    const params = {}
    let url = `utxo/wallet/${this.walletHash}/`
    if (opts?.category) {
      url += opts.category + '/'
      params.is_cashtoken = true
      params.is_cashtoken_nft = Boolean(opts?.nft)
    }
    return this.watchtower.BCH._api.get(url, { params }).then(response => {
      if (!Array.isArray(response?.data?.utxos)) return Promise.reject({ response })
      return response.data.utxos
    })
  }

  scanAddresses (opts = {}) {
    const response = { success: false, error: '' }
    const startIndex = opts?.startIndex
    const count = opts?.count

    if (!Number.isSafeInteger(startIndex) || !Number.isSafeInteger(count)) {
      response.success = false
      response.error = 'Invalid scan range'
      return Promise.resolve(response)
    }

    const addressSets = []
    const endIndex = startIndex + count
    for (let addressIndex = startIndex; addressIndex < endIndex; addressIndex++) {
      const addresses = this._wallet.getAddressSet(addressIndex, this.network)
      addressSets.push({ address_index: addressIndex, addresses })
    }

    const data = {
      address_sets: addressSets,
      wallet_hash: this.walletHash,
      project_id: this.projectId
    }

    return this.watchtower.BCH._api.post('wallet/address-scan/', data)
      .then(apiResponse => {
        response.success = true
        response.subscriptionResponses = apiResponse.data
        return response
      })
      .catch(error => {
        response.success = false
        response.error = error
        return response
      })
  }

  /**
   * Discover addresses with transaction history using a gap-limit scan.
   * @param {Object} opts
   * @param {number} [opts.gapLimit=20]
   * @param {number} [opts.batchSize=50]
   * @param {number} [opts.maxScans=500]
   * @param {Function} [opts.onProgress]
   * @returns {Promise<Object>}
   */
  async discoverAddresses (opts = {}) {
    const {
      gapLimit = 20,
      batchSize = 50,
      maxScans = 500
    } = opts

    const result = {
      success: false,
      discoveredReceiving: [],
      discoveredChange: [],
      highestReceivingIndex: -1,
      highestChangeIndex: -1,
      subscribed: 0,
      scanned: 0,
      error: null
    }

    let receivingGapCount = 0
    let changeGapCount = 0
    let receivingDone = false
    let changeDone = false
    let currentIndex = 0
    let totalScanned = 0
    const scanAddressSets = []

    while (totalScanned < maxScans && !(receivingDone && changeDone)) {
      const batchEnd = Math.min(currentIndex + batchSize, maxScans)
      const addressSets = []

      for (let i = currentIndex; i < batchEnd; i++) {
        const addresses = this._wallet.getAddressSet(i, this.network)
        addressSets.push({ address_index: i, receiving: addresses.receiving, change: addresses.change })
        scanAddressSets.push({ address_index: i, addresses: { receiving: addresses.receiving, change: addresses.change } })
      }

      try {
        const apiResponse = await this.watchtower.BCH._api.post(
          'wallet/address-discover/',
          {
            address_sets: addressSets,
            wallet_hash: this.walletHash,
            project_id: this.projectId
          }
        )

        const discoveryResults = apiResponse.data?.results || []
        for (const discovery of discoveryResults) {
          const idx = discovery.address_index

          if (!receivingDone) {
            const receivingHasHistory = discovery.receiving?.has_history === true
            if (receivingHasHistory) {
              receivingGapCount = 0
              result.discoveredReceiving.push({ address_index: idx, address: discovery.receiving.address })
              if (idx > result.highestReceivingIndex) result.highestReceivingIndex = idx
            } else {
              receivingGapCount++
              if (receivingGapCount >= gapLimit) receivingDone = true
            }
          }

          if (!changeDone) {
            const changeHasHistory = discovery.change?.has_history === true
            if (changeHasHistory) {
              changeGapCount = 0
              result.discoveredChange.push({ address_index: idx, address: discovery.change.address })
              if (idx > result.highestChangeIndex) result.highestChangeIndex = idx
            } else {
              changeGapCount++
              if (changeGapCount >= gapLimit) changeDone = true
            }
          }
        }

        totalScanned += addressSets.length
        currentIndex = batchEnd
      } catch (error) {
        result.error = error?.message || String(error)
        return result
      }
    }

    result.scanned = totalScanned

    const highestIndex = Math.max(result.highestReceivingIndex, result.highestChangeIndex)
    if (highestIndex >= 0) {
      try {
        const subscribePayload = {
          address_sets: scanAddressSets.slice(0, highestIndex + 1),
          wallet_hash: this.walletHash,
          project_id: this.projectId
        }
        await this.watchtower.BCH._api.post('wallet/address-scan/', subscribePayload)
        result.subscribed = highestIndex + 1
      } catch (error) {
        result.error = error?.message || String(error)
      }
    }

    result.success = true
    return result
  }

  getBalance (tokenId = '', txid = '', index = 0) {
    return this._wallet.getBalance({ tokenId, txid, index }, this.network)
  }

  getTransactions (opts = {}) {
    return this._wallet.getWalletTransactionHistory(opts, this.network)
  }

  getTokenDetails (tokenId) {
    return this._wallet.getTokenDetails(tokenId, this.network)
  }

  /**
   * Resolve the public key hex at a relative path (e.g. '0/0').
   */
  getPublicKey (addressPath) {
    const relativePath = String(addressPath || '').replace(/^.*\/\d+\/m\//, '')
    return this._wallet.getPubkeyAt(relativePath)
  }

  /** Returns the xpub node (public) — useful for PSBT derivation info. */
  getPublicKeyWithPath (addressPath) {
    const relativePath = String(addressPath || '')
    return {
      publicKey: this._wallet.getPubkeyAt(relativePath),
      masterFingerprint: getXpubFingerprint(this.xpub),
      path: toFullDerivationPath(relativePath, this.derivationPath),
      xpub: this.xpub
    }
  }

  _assertReadOnly () {
    throw new Error('This is a read-only wallet: signing and sending are unavailable')
  }

  getPrivateKey () {
    return this._assertReadOnly()
  }

  signMessage () {
    return this._assertReadOnly()
  }

  sendBch () {
    return this._assertReadOnly()
  }

  sendBchMultiple () {
    return this._assertReadOnly()
  }

  sendSlp () {
    return this._assertReadOnly()
  }

  _sendBch () {
    return this._assertReadOnly()
  }
}

export class ReadOnlySlpWallet {
  constructor () {
    this.isChipnet = false
    this.walletHash = ''
    this.derivationPath = ''
  }

  get addressLockingScript () {
    return cashAddressToLockingBytecode
  }

  getWalletHash () {
    return ''
  }

  _assertUnsupported () {
    throw new Error(UNSUPPORTED_ERROR)
  }

  getXPubKey () { return this._assertUnsupported() }
  getAddressSetAt () { return this._assertUnsupported() }
  getNewAddressSet () { return this._assertUnsupported() }
  getLastAddressIndex () { return this._assertUnsupported() }
  scanUtxos () { return this._assertUnsupported() }
  getUtxos () { return this._assertUnsupported() }
  getBalance () { return this._assertUnsupported() }
  getTransactions () { return this._assertUnsupported() }
  getPrivateKey () { return this._assertUnsupported() }
  signMessage () { return this._assertUnsupported() }
  sendSlp () { return this._assertUnsupported() }
  getTokenDetails () { return this._assertUnsupported() }
}

/**
 * Build a wallet-shaped object compatible with getWalletByNetwork().
 * @param {import('./readonly-wallet').default} readonlyWallet
 * @returns {{ BCH: ReadOnlyBchWallet, BCH_CHIP: ReadOnlyBchWallet, SLP: ReadOnlySlpWallet, SLP_TEST: ReadOnlySlpWallet }}
 */
export function buildReadOnlyWallet (readonlyWallet) {
  return {
    BCH: new ReadOnlyBchWallet({ wallet: readonlyWallet, network: 'mainnet' }),
    BCH_CHIP: new ReadOnlyBchWallet({ wallet: readonlyWallet, network: 'chipnet' }),
    SLP: new ReadOnlySlpWallet(),
    SLP_TEST: new ReadOnlySlpWallet()
  }
}

export default buildReadOnlyWallet
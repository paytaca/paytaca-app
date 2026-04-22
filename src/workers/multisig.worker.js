import { CashAddressNetworkPrefix } from "bitauth-libauth-v3"
import axios from 'axios'
import { getDepositAddress, getChangeAddress } from "../lib/multisig/wallet-address"

const DEFAULT_TIMEOUT = 30000
const MINIMUM_NUMBER_OF_ADDRESSES = 200
const DEFAULT_GAP_LIMIT = 20
async function startAddressDiscovery(data) {
  const {
    id,
    multisigWallet,
    options,
  } = data

  let depositAddrGapLimit = Number(options.gapLimit || DEFAULT_GAP_LIMIT) 
  let changeAddrGapLimit = Number(options.gapLimit || DEFAULT_GAP_LIMIT)
  let lastUsedDepositAddressIndex = multisigWallet.networks[options.network]?.di ?? -1
  let lastUsedChangeAddressIndex = multisigWallet.networks[options.network]?.ci ?? -1
  let depositAddrNextIndex = lastUsedDepositAddressIndex + 1
  let changeAddrNextIndex = lastUsedChangeAddressIndex + 1

  let applyRateLimit = options.applyRateLimit ?? true
  let minimumNumberOfAddresses = options.minimumNumberOfAddresses || MINIMUM_NUMBER_OF_ADDRESSES
  let nextIndex = options.fullScan ? 0: Math.min(depositAddrNextIndex, changeAddrNextIndex)

  while (depositAddrGapLimit > 0 || changeAddrGapLimit > 0 || minimumNumberOfAddresses > 0) {
    const addressSets = []
    let nextDepositAddr = ''
    let nextChangeAddr = ''
    try {
      for (let i = 0; i < options.gapLimit; i++) {

        const addressSet = {
          address_index: nextIndex
        }
  
        const addressPrefix = options.network === 'mainnet' ? CashAddressNetworkPrefix.mainnet : CashAddressNetworkPrefix.testnet
        
        nextDepositAddr = getDepositAddress({ 
          multisigWallet, 
          addressIndex: nextIndex, 
          prefix: addressPrefix
        })
        addressSet.receiving = nextDepositAddr

        nextChangeAddr = getChangeAddress({ 
          multisigWallet, 
          addressIndex: nextIndex, 
          prefix: addressPrefix
        })
        addressSet.change = nextChangeAddr
        addressSets.push(addressSet)
        nextIndex++
      }

      const response = await axios.post(`${options.watchtowerBaseUrl}/api/wallet/address-discover/`, {
        wallet_hash: multisigWallet.walletHash,
        address_sets: addressSets
      }, { timeout: DEFAULT_TIMEOUT })

      const results = response.data?.results
      results?.sort((a, b) => b.address_index - a.address_index)

      let newLastUsedDepositIndex = -1
      let newLastUsedChangeIndex = -1
      let depositUnusedCount = 0
      let changeUnusedCount = 0
      let reportProgress = false
      for (const result of results) {
        const hasDepositHistory = result.receiving?.has_history
        const hasChangeHistory = result.change?.has_history
        reportProgress = hasDepositHistory || hasChangeHistory
        if (hasDepositHistory) {
          if (result.address_index > newLastUsedDepositIndex) {
            newLastUsedDepositIndex = result.address_index
          }
          depositUnusedCount = 0
        } else {
          depositUnusedCount++
        }

        if (hasChangeHistory) {
          if (result.address_index > newLastUsedChangeIndex) {
            newLastUsedChangeIndex = result.address_index
          }
          changeUnusedCount = 0
        } else {
          changeUnusedCount++
        }
      }

      if (newLastUsedDepositIndex > lastUsedDepositAddressIndex) {
        lastUsedDepositAddressIndex = newLastUsedDepositIndex
      }
      if (newLastUsedChangeIndex > lastUsedChangeAddressIndex) {
        lastUsedChangeAddressIndex = newLastUsedChangeIndex
      }

      depositAddrGapLimit = Math.max(0, options.gapLimit - depositUnusedCount)
      changeAddrGapLimit = Math.max(0, options.gapLimit - changeUnusedCount)

      if (reportProgress) {
        // Exhaust min number of address even if gaplimit is reached
        self.postMessage({
          id,
          success: true,
          final: depositAddrGapLimit === 0 && changeAddrGapLimit === 0 && minimumNumberOfAddresses === 0,
          lastUsedDepositAddressIndex,
          lastUsedChangeAddressIndex
        })
      }
      
      minimumNumberOfAddresses -= options.gapLimit
    } catch (error) {
      self.postMessage({
        id,
        success: false,
        final: depositAddrGapLimit === 0 && changeAddrGapLimit === 0 && minimumNumberOfAddresses === 0,
        lastUsedDepositAddressIndex,
        lastUsedChangeAddressIndex
      })
      return
    }
    
    if (applyRateLimit) {
      await new Promise((resolve) => setTimeout(() => { resolve() }, 500))
    }
  }
  
  self.postMessage({
    id,
    success: true,
    final: depositAddrGapLimit === 0 && changeAddrGapLimit === 0 && minimumNumberOfAddresses === 0,
    lastUsedDepositAddressIndex,
    lastUsedChangeAddressIndex
  })
}



self.onmessage = async (event) => {
  const { type, data } = event.data
  if (!data.multisigWallet?.walletHash) {
    return self.postMessage({ error: 'Multisig Wallet Hash Required', success: false })
  }
  try {
    if (type === 'START_ADDRESS_DISCOVERY') {
      await startAddressDiscovery(data)
    }
  } catch (error) {
    self.postMessage({ error: error.message, success: false })
  }
}

self.onerror = (error) => {
  self.postMessage({ error: error.message, success: false })
}

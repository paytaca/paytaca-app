import { CashAddressNetworkPrefix } from "bitauth-libauth-v3"
import axios from 'axios'
import { getDepositAddress, getChangeAddress } from "src/lib/multisig/address"

const DEFAULT_TIMEOUT = 30000

async function startAddressDiscovery(data) {
  console.log('DATA', data)
  const {
    id,
    multisigWallet,
    options,
  } = data

  let depositAddrGapLimit = options.gapLimit
  let changeAddrGapLimit = options.gapLimit
  let lastUsedDepositAddressIndex = multisigWallet.networks[options.network]?.di ?? -1
  let lastUsedChangeAddressIndex = multisigWallet.networks[options.network]?.ci ?? -1
  let depositAddrNextIndex = lastUsedDepositAddressIndex + 1
  let changeAddrNextIndex = lastUsedChangeAddressIndex + 1

  let applyRateLimit = true
  let limit = 1000
  
  let nextIndex = options.fullScan ? 0: Math.min(depositAddrNextIndex, changeAddrNextIndex)

  while (depositAddrGapLimit > 0 || changeAddrGapLimit > 0 && limit > 0) {
    const addressSets = []
    let nextDepositAddr = ''
    let nextChangeAddr = ''
    try {
      for (let i = 0; i < options.gapLimit; i++) {

        const addressSet = {
          address_index: nextIndex
        }
  
        const addressPrefix = options.network === 'mainnet' ? CashAddressNetworkPrefix.mainnet : CashAddressNetworkPrefix.testnet
        
        // if (depositAddrGapLimit > 0) {
        //   nextDepositAddr = getDepositAddress({ 
        //     multisigWallet, 
        //     addressIndex: depositAddrNextIndex, 
        //     prefix: addressPrefix
        //   })
        //   addressSet.receiving = nextDepositAddr
        //   depositAddrNextIndex++
        // }
  
        // if (changeAddrGapLimit > 0) {
        //   nextChangeAddr = getChangeAddress({ 
        //     multisigWallet, 
        //     addressIndex: changeAddrNextIndex, 
        //     prefix: addressPrefix
        //   })
  
        //   addressSet.receiving = nextChangeAddr
        //   changeAddrNextIndex++
        // }

        
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
      const depositWithHistory = results.filter(r => r.receiving?.has_history).length 
      const changeWithHistory = results.filter(r => r.change?.has_history).length 
      
      depositAddrGapLimit = depositWithHistory 
      changeAddrGapLimit = changeWithHistory 

      console.log('results', depositAddrGapLimit, changeAddrGapLimit)  

      lastUsedDepositAddressIndex = depositWithHistory[0]?.address_index || nextIndex
      lastUsedChangeAddressIndex = changeWithHistory[0]?.address_index || nextIndex
      self.postMessage({
        id,
        success: true,
        final: depositAddrGapLimit > 0 || changeAddrGapLimit > 0,
        lastUsedDepositAddressIndex,
        lastUsedChangeAddressIndex
      })

      
    //   limit--
    //   break
    //   // lastUsedDepositAddressIndex = results.find(r => r.receiving && r.has_history)?.address_index ?? lastUsedDepositAddressIndex
    //   // lastUsedChangeAddressIndex = results.find(r => r.change && r.has_history)?.address_index ?? lastUsedChangeAddressIndex
    //   // for (const r of results) {}

    //   // if (failedReqCount >= stopOnFailedNetworkReqAttempts ) {
    //   //   self.postMessage({
    //   //     type: 'MULTISIG_ADDRESS_DISCOVERY_UPDATE',
    //   //     data: {
    //   //       lastUsedDepositAddressIndex,
    //   //       lastUsedChangeAddressIndex,
    //   //       depositAddrNextIndex,
    //   //       changeAddrNextIndex,
    //   //       final: false,
    //   //       stopped: true,
    //   //       stoppedBecause: 'Stopped on max number of failed network request attempts'
    //   //     }
    //   //   })
    //   //   break
    //   // }

    //   const now = Date.now()
    //   const timeSinceLastEmit = now - lastEmitTime;
    //   const isBatchMilestone = (seenAddressCount % milestoneNumber === 0);
    //   if (timeSinceLastEmit > updateThrottleMs || isBatchMilestone) {
    //     self.postMessage({
    //       type: 'MULTISIG_ADDRESS_DISCOVERY_UPDATE',
    //       data: {
    //         lastUsedDepositAddressIndex,
    //         lastUsedChangeAddressIndex,
    //         depositAddrNextIndex,
    //         changeAddrNextIndex,
    //         final: false,
    //         walletHash: multisigWallet.walletHash
    //       }
    //     })
    //     lastEmitTime = now
    //   }

      
    } catch (error) {
      console.log('error', error)
      break
      // self.postMessage({
      //   type: 'MULTISIG_ADDRESS_DISCOVERY_UPDATE',
      //   data: {
      //     lastUsedDepositAddressIndex,
      //     lastUsedChangeAddressIndex,
      //     depositAddrNextIndex,
      //     changeAddrNextIndex,
      //     final: false,
      //     error,
      //     walletHash: multisigWallet.walletHash
      //   }
      // })
    }
    
    if (applyRateLimit) {
      await new Promise((resolve) => setTimeout(() => { resolve() }, 500))
    }
  }
  
  self.postMessage({
    type: 'MULTISIG_ADDRESS_DISCOVERY_UPDATE',
    data: {
      lastUsedDepositAddressIndex,
      lastUsedChangeAddressIndex,
      final: true,
      walletHash: multisigWallet.walletHash
    }
  })
}



self.onmessage = async (event) => {
  const { type, data } = event.data

  console.log('TYPE DATA', type, data)

  if (!data.multisigWallet?.walletHash) {
    return self.postMessage({ error: 'Multisig Wallet Hash Required', success: false })
  }
  try {
    switch (type) {
      case 'START_ADDRESS_DISCOVERY':
        await startAddressDiscovery(data)
        break
      case 'DETECT_NEW_DEPOSIT':
        if (!data.address) return // Ignore if address isn't provided
        await detectNewDeposit(data.address)
        break
      default:
        throw new Error(`Unknown worker message type: ${type}`)
    }
    
  } catch (error) {
    self.postMessage({ error: error.message, success: false })
  }
}

self.onerror = (error) => {
  self.postMessage({ error: error.message, success: false })
}

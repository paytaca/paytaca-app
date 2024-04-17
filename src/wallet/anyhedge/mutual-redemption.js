import { AnyHedgeManager, ContractData } from '@generalprotocols/anyhedge'
import { castBigIntSafe } from './utils'

/**
 * 
 * @param {ContractData} contractData 
 * @param {String} privateKey 
 */
export async function signMutualRefund(contractData, privateKey) {
  const response = { success: false, error: undefined, proposal: undefined }
  const manager = new AnyHedgeManager()

  const signMutualRefundData = {
    privateKeyWIF: privateKey,
    contractFunding: contractData?.fundings?.[0],
    contractParameters: contractData?.parameters,
    contractMetadata: contractData?.metadata,
    shortRefundAddress: contractData?.metadata?.shortPayoutAddress,
    longRefundAddress: contractData?.metadata?.longPayoutAddress,
  }

  try {
    response.proposal = await manager.signMutualRefund(signMutualRefundData)
    response.success = true
  } catch(error) {
    console.error(error)
    response.success = false
    response.error = error
  }
  return response
}

/**
 * 
 * @param {ContractData} contractData 
 * @param {String} privateKey 
 * @param {Number} settlementPrice 
 */
export async function signMutualEarlyMaturation(contractData,  privateKey, settlementPrice) {
  const response = { success: false, error: undefined, proposal: undefined }
  const manager = new AnyHedgeManager()

  const signMutualEarlyMaturationData = {
    privateKeyWIF: privateKey,
    contractFunding: contractData?.fundings?.[0],
    settlementPrice: castBigIntSafe(settlementPrice),
    contractParameters: contractData?.parameters,
    contractMetadata: contractData?.metadata,
  }

  try {
    response.proposal = await manager.signMutualEarlyMaturation(signMutualEarlyMaturationData)
    response.success = true
  } catch(error) {
    console.error(error)
    response.success = false
    response.error = error
  }
  return response
}


/**
 * 
 * @param {ContractData} contractData 
 * @param {String} privateKey 
 * @param {Number} shortSatoshis 
 * @param {Number} longSatoshis 
 */
 export async function signArbitraryPayout(contractData, privateKey, shortSatoshis, longSatoshis) {
  const response = { success: false, error: undefined, proposal: undefined }
  const manager = new AnyHedgeManager()

  const transactionProposal = {
    inputs: [{
      txid: contractData?.fundings?.[0]?.fundingTransactionHash,
      vout: parseInt(contractData?.fundings?.[0]?.fundingOutputIndex),
      satoshis: contractData?.fundings?.[0]?.fundingSatoshis,
    }],
    outputs: [
      { to: contractData?.metadata?.shortPayoutAddress, amount: castBigIntSafe(shortSatoshis) },
      { to: contractData?.metadata?.longPayoutAddress, amount: castBigIntSafe(longSatoshis) },
    ],
  }

  try {
    response.proposal = await manager.signMutualArbitraryPayout(
      privateKey,
      transactionProposal,
      contractData?.parameters,
    )
    response.success = true
  } catch(error) {
    console.error(error)
    response.success = false
    response.error = error
  }
  return response
}

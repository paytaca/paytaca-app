import { AnyHedgeManager, ContractData } from '@generalprotocols/anyhedge'

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
    contractFunding: contractData?.funding?.[0],
    contractParameters: contractData?.parameters,
    contractMetadata: contractData?.metadata,
    hedgeRefundAddress: contractData?.metadata?.hedgeAddress,
    longRefundAddress: contractData?.metadata?.longAddress,
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
    contractFunding: contractData?.funding?.[0],
    settlementPrice: settlementPrice,
    contractParameters: contractData?.parameters,
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
 * @param {Number} hedgeSatoshis 
 * @param {Number} longSatoshis 
 */
 export async function signArbitraryPayout(contractData,  privateKey, hedgeSatoshis, longSatoshis) {
  const response = { success: false, error: undefined, proposal: undefined }
  const manager = new AnyHedgeManager()

  const transactionProposal = {
    inputs: [{
      txid: contractData?.funding?.[0]?.fundingTransaction,
      vout: contractData?.funding?.[0]?.fundingOutput,
      satoshis: contractData?.funding?.[0]?.fundingSatoshis,
    }],
    outputs: [
      { to: contractData?.metadata?.hedgeAddress, amount: hedgeSatoshis },
      { to: contractData?.metadata?.longAddress, amount: longSatoshis },
    ],
  }

  try {
    response.proposal = await manager.signMutualEarlyMaturation(
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

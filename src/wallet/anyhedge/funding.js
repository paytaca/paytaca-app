import axios from 'axios'
import BCHJS from '@psf/bch-js'
import { AnyHedgeManager, ContractData } from '@generalprotocols/anyhedge'
import Watchtower from 'watchtower-cash-js'
import { Wallet } from '../index'
import { generalProtocolLPBackend, generalProtocolLPAuthToken } from './backend'
import { getContractAccessKeys, getContractStatus } from './utils'

const bchjs = new BCHJS()

export const LIQUIDITY_FEE_NAME = 'Liquidity Premium'

/**
 * @param {Number} satoshis 
 * @param {Number} lowLiquidationMultiplier 
 * @param {Number} assetPrice 
 */
export function calculateHedgePositionOfferInputs(satoshis, lowLiquidationMultiplier, assetPrice) {
  const _hedgeNominalUnitSats = satoshis * assetPrice
  const  hedgeNominalUnits = _hedgeNominalUnitSats / 10 ** 8
  const lowLiquidationPrice = Math.round(assetPrice * lowLiquidationMultiplier)
  const totalSats = Math.round(_hedgeNominalUnitSats / lowLiquidationPrice)
  const longSats = totalSats - satoshis
  const longNominalUnits = (longSats * assetPrice) / 10 ** 8

  return {
    hedgeNominalUnits,
    longNominalUnits,
    hedgeSats: satoshis,
    longSats,
    totalSats,
  }
}


/**
 * 
 * @param {Object} intent - Contract creation parameters
 * @param {Number} intent.amount - Amount of BCH to hedge
 * @param {Number} intent.lowPriceMult - The USD/BCH price drop percentage to trigger liquidation
 * @param {Number} intent.highPriceMult - The USD/BCH price increase percentage to trigger liquidation
 * @param {Number} intent.duration - The number of seconds from the starting time of the hedge position
 * @param {Object} pubkeys - Necessary credentials for hedge and short
 * @param {String} [pubkeys.hedgeAddress] - Destination address of hedger's funds on maturity/liquidation
 * @param {String} [pubkeys.hedgePubkey] - Public key of hedger
 * @param {String} [pubkeys.longAddress] - Destination address of long's funds on maturity/liquidation
 * @param {String} [pubkeys.longPubkey] - Public key of long
 * @param {Object} priceData
 * @param {Number} priceData.messageSequence
 * @param {Number} priceData.priceValue
 * @param {Number} priceData.messageTimestamp
 * @param {String} priceData.oraclePubkey
 * @param {String} priceData.message
 * @param {String} priceData.signature
 * @param {Object} liquidityServiceInfo
 * @param {String} privateKey
 * @param {'hedge' | 'long'} position - Position that the user will take
 */
export async function calculateGeneralProtocolsLPFee(intent, pubkeys, priceData, liquidityServiceInfo, privateKey, position='hedge') {
  const response = {
    success: false,
    contractData: {},
    liquidityFee: { fee: 0, recalculateAfter: 0 },
    accessKeys: { signature: '', publicKey: '', authenticationToken: '' },
    error: null,
    errorMessages: [],
  }

  try {
    const contractInputs = calculateHedgePositionOfferInputs(intent.amount * 10 ** 8, intent.lowPriceMult, priceData.priceValue)
    const _managerConfig = {
      serviceScheme: liquidityServiceInfo?.settlementService?.scheme,
      serviceDomain: liquidityServiceInfo?.settlementService?.host,
      servicePort: liquidityServiceInfo?.settlementService?.port,
      authenticationToken: generalProtocolLPAuthToken,
    }
    const manager = new AnyHedgeManager(_managerConfig)

    if (!generalProtocolLPBackend.defaults.headers) generalProtocolLPBackend.defaults.headers = {}
    generalProtocolLPBackend.defaults.headers.Authentication = _managerConfig.authenticationToken

    const prepareContractPositionData = {
      oraclePublicKey: priceData.oraclePubkey,
      poolSide: position === 'hedge' ? 'long': 'hedge',
    }
    const contractPosition = await generalProtocolLPBackend.post('/api/v1/prepareContractPosition', prepareContractPositionData)
      .catch(error => {
        if (error) error.name = 'PrepareContractPositionError'
        return Promise.reject(error)
      })
      

    const hasLiquidity = contractInputs?.longSats < contractPosition?.data?.availableLiquidityInSatoshis
    if (!hasLiquidity) {
      const error = new Error('Not enough liquidity to support hedge position')
      error.name = 'PrepareContractPositionError'
      throw error
    }

    const nominalUnits = intent.amount * priceData.priceValue
    const contractCreationParameters = {
      takerSide: position,
      makerSide: position === 'hedge' ? 'long' : 'hedge',
      nominalUnits: nominalUnits,
      oraclePublicKey: priceData.oraclePubkey,
      startingOracleMessage: priceData.message,
      startingOracleSignature: priceData.signature,
      maturityTimestamp: priceData.messageTimestamp + intent.duration,
      highLiquidationPriceMultiplier: intent.highPriceMult,
      lowLiquidationPriceMultiplier: intent.lowPriceMult,
      hedgeMutualRedeemPublicKey: pubkeys.hedgePubkey,
      longMutualRedeemPublicKey: contractPosition?.data?.liquidityProvidersMutualRedemptionPublicKey,
      hedgePayoutAddress: pubkeys.hedgeAddress,
      longPayoutAddress: contractPosition?.data?.liquidityProvidersPayoutAddress,
      enableMutualRedemption: 1,
    }

    if (position === 'long') {
      contractCreationParameters.hedgeMutualRedeemPublicKey = contractPosition?.data?.liquidityProvidersMutualRedemptionPublicKey
      contractCreationParameters.hedgePayoutAddress = contractPosition?.data?.liquidityProvidersPayoutAddress
      contractCreationParameters.longMutualRedeemPublicKey = pubkeys.longPubkey
      contractCreationParameters.longPayoutAddress = pubkeys.longAddress
    }
    const localContractData = await manager.createContract(contractCreationParameters)
      .catch(error => {
        if (error) error.name = 'ContractCompileError'
        return Promise.reject(error)
      })

    // NOTE: Populating properties expected from old implementation. Remove after stable
    contractCreationParameters.duration = intent.duration
    contractCreationParameters.startPrice = priceData.priceValue
    contractCreationParameters.startTimestamp = priceData.messageTimestamp
    contractCreationParameters.hedgeAddress = contractCreationParameters.hedgePayoutAddress
    contractCreationParameters.hedgePublicKey = contractCreationParameters.hedgeMutualRedeemPublicKey
    contractCreationParameters.longAddress = contractCreationParameters.longPayoutAddress
    contractCreationParameters.longPublicKey = contractCreationParameters.longMutualRedeemPublicKey

    const proposeContractData = {
      contractCreationParameters,
      contractStartingOracleMessageSequence: priceData.messageSequence
    }
    const proposeContractResponse = await generalProtocolLPBackend.post('/api/v1/proposeContract', proposeContractData)
      .catch(error => {
        if (error) error.name = 'ContractProposalError'
        return Promise.reject(error)
      })

    response.liquidityFee.fee = proposeContractResponse?.data?.liquidityProviderFeeInSatoshis
    response.liquidityFee.recalculateAfter = proposeContractResponse?.data?.renegotiateAfterTimestamp

    // response.long.address = contractCreationParameters.longAddress
    // response.long.pubkey = contractCreationParameters.longPublicKey

    const contractAccessKeys = await getContractAccessKeys(localContractData.address, privateKey)
    const contractData = await getContractStatus(
      localContractData.address,
      contractAccessKeys.signature,
      contractAccessKeys.publicKey,
      _managerConfig,
    ).catch(error => {
      if (error) error.name = 'ContractStatusError'
      return Promise.reject(error)
    })
    response.accessKeys = {
      signature: contractAccessKeys.signature,
      publicKey: contractAccessKeys.publicKey,
      authenticationToken: _managerConfig.authenticationToken,
    }
    response.contractData = contractData
    response.success = true
  } catch(error) {
    console.error(error)
    let errors = []
    if (typeof error?.response?.data === 'string') errors = [error?.response?.data]
    else if (typeof error?.response?.data?.error === 'string') errors = [error?.response?.data?.error]
    else if (Array.isArray(error?.response?.data?.errors)) errors = error?.response?.data?.errors
    else if(typeof error === 'string') errors = [error]
    else if(typeof error?.message === 'string') errors = [error?.message]
    response.success = false
    response.error = error
    response.errorMessages = errors
  } finally {
    return response
  }
}

/**
 * 
 * @param {Number} amount 
 * @param {Wallet} wallet 
 * @param {Object} addressSet
 * @param {String} addressSet.receiving
 * @param {String} addressSet.change
 * @param {Number} addressSet.index
 */
export async function getOrFindUtxo(amount, wallet, addressSet) {
  const fundingUtxo = { txid: '', vout: -1, amount: 0, address_path: '', dependencyTxids: [] }

  const utxo = await searchUtxo(amount, wallet.BCH.getWalletHash())
  if (utxo) {
    fundingUtxo.txid = utxo.tx_hash
    fundingUtxo.vout = utxo.tx_pos
    fundingUtxo.amount = utxo.value
    fundingUtxo.address_path = utxo.address_path
  } else {
    const { success, error, txid, dependencyTxids } = await createUtxo(amount, addressSet.receiving, addressSet.change, wallet)
    if (!success) {
      throw new Error(error || 'Encountered error in generating funding utxo')
    }
    fundingUtxo.txid = txid
    fundingUtxo.vout = 0
    fundingUtxo.amount = amount
    fundingUtxo.address_path = `0/${addressSet.index}`
    fundingUtxo.dependencyTxids = dependencyTxids
  }

  return fundingUtxo
}

/**
 * 
 * @param {Number} amount 
 * @param {Wallet} wallet 
 */
async function createUtxo(amount, recipient, changeAddress, wallet) {
  const response = {
    success: false,
    txid: '',
    dependencyTxids: [],
    error: ''
  }

  const data = {
    sender: {
      walletHash: wallet.BCH.getWalletHash(),
      mnemonic: wallet.BCH.mnemonic,
      derivationPath: wallet.BCH.derivationPath
    },
    recipients: [
      { address: recipient, amount: amount / 10 ** 8 }
    ],
    changeAddress: changeAddress,
    broadcast: false
  }

  const result = await wallet.BCH.watchtower.BCH.send(data)
  if (!result?.success) {
    response.success = false
    if (result.error.indexOf('not enough balance in sender') > -1) {
      response.error = 'Not enough balance to cover the send amount and transaction fee'
    } else if (result.error.indexOf('has insufficient priority') > -1) {
      response.error = 'Not enough balance to cover the transaction fee'
    } else {
      response.error = result?.error || 'Error generating transaction'
    }
    return response
  }

  let decodedTx = await bchjs.RawTransactions.decodeRawTransaction(result.transaction);
  if(!Array.isArray(decodedTx?.vin)) {
    response.success = false
    response.error = 'Transaction error reading transaction'
    return response
  }

  response.dependencyTxids = decodedTx.vin.map(inp => inp?.txid)
  response.txid = decodedTx.hash

  const broadcastResponse = await wallet.BCH.watchtower.BCH.broadcastTransaction(result.transaction)
  if (!broadcastResponse?.data?.success) {
    response.success = false
    response.error = broadcastResponse?.data?.error || 'Error in broadcasting transaction'
    return response
  }

  response.success = true
  return response
}

export async function searchUtxo(amount, walletHash) {
  const watchtower = new Watchtower()
  const utxos = await watchtower.BCH.getBchUtxos(`wallet:${walletHash}`)
  return utxos.utxos.find(utxo => utxo.value == amount)
}

/**
 * 
 * @param {ContractData} contractData 
 * @param {'hedge' || 'long'} position
 * @param {*} liquidityProviderFeeInSatoshis 
 * @returns 
 */
export function calculateFundingAmounts(contractData, position, liquidityProviderFeeInSatoshis=0) {
  // NOTE: handles both old & new implementation
  const localContractMetadata = contractData.metadata
  const takerPayoutAddress = position === 'hedge'?
    localContractMetadata.hedgePayoutAddress : localContractMetadata.longPayoutAddress

  const makerInputSats = position === 'long' ? localContractMetadata.hedgeInputInSatoshis : localContractMetadata.longInputInSatoshis;

  const manager = new AnyHedgeManager()
  const totalRequiredFundingSatoshis = manager.calculateTotalRequiredFundingSatoshis(contractData)

  const takerTotalFeesAndPremiumsToDeduct = contractData.fees
    .reduce((total, fee) => {
      // If the fee is going to the taker's address, add it to the amount that must
      // be deducted from the total that taker should pay ..
      // must check the fee name to verify that it is really the liquidity premium
      if (fee.name === LIQUIDITY_FEE_NAME && fee.address === takerPayoutAddress) {
        return total += fee.satoshis;
      }

      // Return the previous total.
      return total;
    }, 0);

  const takerRequiredFundingSatoshis = totalRequiredFundingSatoshis - makerInputSats + liquidityProviderFeeInSatoshis - takerTotalFeesAndPremiumsToDeduct;

  // Calculate the amounts necessary to fund the contract.
  const contractAmount = {
    hedge: 0,
    long: 0,
  }

  if (position == 'hedge') {
    contractAmount.hedge = takerRequiredFundingSatoshis
    contractAmount.long = totalRequiredFundingSatoshis - takerRequiredFundingSatoshis
  } else if (position == 'long') {
    contractAmount.hedge = totalRequiredFundingSatoshis - takerRequiredFundingSatoshis
    contractAmount.long = takerRequiredFundingSatoshis
  }

  return contractAmount
}

/**
 * @param {Object} data 
 * @param {Number} data.amountSats
 * @param {String} data.startingOracleMessage
 * @param {String} data.startingOracleSignature
 * @param {Number} data.lowLiquidationMultiplier
 * @param {Number} data.startingPriceValue
 * @param {{ satoshis: Number }[]} data.fees
 * @param {Number} data.liquidityFee
 * @param {'hedge' | 'long'} data.position
 */
 export async function calculateFundingAmountsWithFees(data) {
  // these data are necessary for generating contracts but doesnt affect the funding amounts
  const dummyData = {
    oraclePublicKey: '03994dc2c759375e98afbf5049383cd987001c346d0f11aa262c105874fb1390c1',
    maturityTimestamp: Math.floor(Date.now() / 1000) + 86400,
    hedgePublicKey: '0242ce009d64bd58c3a11b7c37f33c35177cf093b287ec4db96775381d4903be1d',
    longPublicKey: '02df07732b3b3fbfb71be46a2393bc07f5d65a0a6d25eb1809fd7a1675cd2d646d',
    hedgeAddress: 'bitcoincash:qp6nn4uztqqdts0gjzhqgvtp582xd85lyqkayhd0a7',
    longAddress: 'bitcoincash:qpqkl0wm95tnz3xqndmznv6e8dk5204lzvaukyg4c3',
    highLiquidationPriceMultiplier: 5,
    feeAddress: 'bitcoincash:qpqkl0wm95tnz3xqndmznv6e8dk5204lzvaukyg4c3',
  }

  const units = (data.amountSats * data.startingPriceValue) / 10**8
  const contractCreationParameters = {
    takerSide: data.position,
    makerSide: data.position == 'hedge' ? 'long' : 'hedge',
    nominalUnits: units,
    oraclePublicKey: dummyData.oraclePublicKey,
    startingOracleMessage: data.startingOracleMessage,
    startingOracleSignature: data.startingOracleSignature,
    maturityTimestamp: dummyData.maturityTimestamp,
    highLiquidationPriceMultiplier: dummyData.highLiquidationPriceMultiplier,
    lowLiquidationPriceMultiplier: data.lowLiquidationMultiplier,
    hedgeMutualRedeemPublicKey: dummyData.hedgePublicKey,
    longMutualRedeemPublicKey: dummyData.longPublicKey,
    hedgePayoutAddress: dummyData.hedgeAddress,
    longPayoutAddress: dummyData.longAddress,
    enableMutualRedemption: 1,
  }
  console.log(contractCreationParameters)
  const manager = new AnyHedgeManager()
  const contractData = await manager.createContract(contractCreationParameters)
  if (Array.isArray(data.fees)) {
    contractData.fees = data.fees.filter(fee => fee?.satoshis)
  }
  console.log(contractData)

  return calculateContractFundingWithFees(Object.assign({}, data, { contractData }))
}

/**
 * @param {Object} data
 * @param {ContractData} data.contractData
 * @param {'hedge' | 'long'} data.position 
 * @param {Number} [data.liquidityFee]
 * @returns 
 */
export function calculateContractFundingWithFees(data) {
  const contractData = data?.contractData
  const fundingAmounts = calculateFundingAmounts(contractData, data.position, data.liquidityFee || 0)
  const response = {
    hedge: {
      nominalUnits: contractData.metadata.nominalUnits,
      sats: contractData.metadata.hedgeInputInSatoshis,
      fees: { premium: 0, network: 0, service: 0, serviceFees: [] },
      total: fundingAmounts.hedge,
      calculatedTotal: 0,
    },
    long: {
      nominalUnits: contractData.metadata.longInputInOracleUnits,
      sats: contractData.metadata.longInputInSatoshis,
      fees: { premium: 0, network: 0, service: 0, serviceFees: [] },
      total: fundingAmounts.long,
      calculatedTotal: 0,
    },
    totalSats: 0,
  }

  if (data.position === 'hedge') {
    response.hedge.fees.premium = data.liquidityFee || 0
    response.long.fees.premium = response.hedge.fees.premium * -1
    if (Array.isArray(contractData?.fees)) {
      response.hedge.fees.serviceFees = contractData?.fees.filter(fee => fee?.address && fee?.satoshis)
      response.hedge.fees.service = contractData?.fees
        .map(fee => fee?.satoshis)
        .filter(satoshis => !isNaN(satoshis))
        .reduce((subtotal, satoshis) => subtotal + satoshis, 0)
    }
    response.hedge.fees.network = response.hedge.total - (response.hedge.sats + response.hedge.fees.premium + response.hedge.fees.service)
  } else if (data.position === 'long') {
    response.long.fees.premium = data.liquidityFee || 0
    response.hedge.fees.premium = response.long.fees.premium * -1
    if (Array.isArray(contractData?.fees)) {
      response.long.fees.serviceFees = contractData?.fees.filter(fee => fee?.address && fee?.satoshis)
      response.long.fees.service = contractData?.fees
        .map(fee => fee?.satoshis)
        .filter(satoshis => !isNaN(satoshis))
        .reduce((subtotal, satoshis) => subtotal + satoshis, 0)
    }
    response.long.fees.network = response.long.total - (response.long.sats + response.long.fees.premium + response.long.fees.service)
  }

  const calculateTotal = (_data) => {
    return _data.sats + _data.fees.premium + _data.fees.network + _data.fees.service
  }
  response.hedge.calculatedTotal = calculateTotal(response.hedge)
  response.long.calculatedTotal = calculateTotal(response.long)

  response.totalSats = response.hedge.total + response.long.total

  return response
}
/**
 * 
 * @param {Object} contractData 
 * @param {'hedge' | 'long'} position 
 * @param {Wallet} wallet 
 * @param {Object} addressSet
 * @param {String} addressSet.receiving
 * @param {String} addressSet.change
 * @param {Number} addressSet.index
 * @param {Number} liquidityProviderFeeInSatoshis
 * @param {'hedge' | 'long'} taker
 */
export async function createFundingProposal(contractData, position, wallet, addressSet, liquidityProviderFeeInSatoshis=0, taker='hedge') {
  const { hedge, long } = calculateFundingAmounts(contractData, taker, liquidityProviderFeeInSatoshis)
  let amount
  if (position === 'hedge') amount = hedge
  else if (position === 'long') amount = long

  const fundingUtxo = await getOrFindUtxo(amount, wallet, addressSet)

  const manager = new AnyHedgeManager()
  const fundingProposal = manager.createFundingProposal(contractData, fundingUtxo.txid, fundingUtxo.vout, fundingUtxo.amount)
  const wif = await wallet.BCH.watchtower.BCH.retrievePrivateKey(wallet.BCH.mnemonic, wallet.BCH.derivationPath, fundingUtxo.address_path)
  const signedFundingProposal = await manager.signFundingProposal(wif, fundingProposal)

  return { fundingUtxo, signedFundingProposal }
}

export async function isUtxoSpent(txHash, index) {
  const response = { success: false, spent: false, error: undefined, spendingTx: '' }
  const query = {
    "v": 3,
    "q": {
      "find": { "in.e.h": txHash, "in.e.i": index },
      "project": { "tx.h": 1 }
    }
  }
  const url = `https://bitdb.bch.sx/q/${btoa(JSON.stringify(query))}`
  try {
    const queryResp = await axios.get(url)
    let spendingTx = ''
    // console.log(Array.isArray(queryResp?.data?.u))
    // console.log(Array.isArray(queryResp?.data?.c))
    // console.log(queryResp?.data?.u)
    // console.log(queryResp?.data?.c)
    if (Array.isArray(queryResp?.data?.u)) spendingTx = queryResp.data.u.find(tx => tx?.tx?.h)?.tx?.h || spendingTx
    if (Array.isArray(queryResp?.data?.c)) spendingTx = queryResp.data.c.find(tx => tx?.tx?.h)?.tx?.h || spendingTx

    response.spent = Boolean(spendingTx)
    response.spendingTx = spendingTx
    response.success = true
  } catch(error) {
    console.error(error)
    response.success = false
    response.error = error
    return response
  }
  return response
}

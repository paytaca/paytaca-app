import axios from 'axios'
import BCHJS from '@psf/bch-js'
import { binToHex, decodeTransactionBCH, hexToBin } from '@bitauth/libauth'
import { AnyHedgeManager, ContractData, encodeExtendedJson } from '@generalprotocols/anyhedge'
import Watchtower from 'watchtower-cash-js'
import { Wallet } from '../index'
import { generalProtocolLPBackend, generalProtocolLPAuthToken, anyhedgeBackend } from './backend'
import { castBigIntSafe, getContractAccessKeys, getContractStatus, txHexToHash } from './utils'
import { encodePrivateKeyWif } from '@bitauth/libauth'

const bchjs = new BCHJS()

export const LIQUIDITY_FEE_NAME = 'Liquidity premium'

/**
 * @param {Number} satoshis 
 * @param {Number} lowLiquidationMultiplier 
 * @param {Number} assetPrice 
 */
export function calculateHedgePositionOfferInputs(satoshis, lowLiquidationMultiplier, assetPrice) {
  const _shortNominalUnitSats = satoshis * assetPrice
  const  shortNominalUnits = _shortNominalUnitSats / 10 ** 8
  const lowLiquidationPrice = Math.round(assetPrice * lowLiquidationMultiplier)
  const totalSats = Math.round(_shortNominalUnitSats / lowLiquidationPrice)
  const longSats = totalSats - satoshis
  const longNominalUnits = (longSats * assetPrice) / 10 ** 8

  return {
    shortNominalUnits,
    longNominalUnits,
    shortSats: satoshis,
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
 * @param {String} [pubkeys.shortAddress] - Destination address of short's funds on maturity/liquidation
 * @param {String} [pubkeys.shortPubkey] - Public key of short
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
 * @param {'short' | 'long'} position - Position that the user will take
 */
export async function calculateGeneralProtocolsLPFee(intent, pubkeys, priceData, liquidityServiceInfo, privateKey, position='short') {
  if (position == 'hedge') position = 'short'

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
      poolSide: position === 'short' ? 'long': 'short',
    }
    const contractPosition = await generalProtocolLPBackend.post('/api/v2/prepareContractPosition', prepareContractPositionData)
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
      makerSide: position === 'short' ? 'long' : 'short',
      nominalUnits: nominalUnits,
      oraclePublicKey: priceData.oraclePubkey,
      startingOracleMessage: priceData.message,
      startingOracleSignature: priceData.signature,
      maturityTimestamp: castBigIntSafe(priceData.messageTimestamp + intent.duration),
      highLiquidationPriceMultiplier: intent.highPriceMult,
      lowLiquidationPriceMultiplier: intent.lowPriceMult,
      shortMutualRedeemPublicKey: pubkeys.shortPubkey,
      longMutualRedeemPublicKey: contractPosition?.data?.liquidityProvidersMutualRedemptionPublicKey,
      shortPayoutAddress: pubkeys.shortAddress,
      longPayoutAddress: contractPosition?.data?.liquidityProvidersPayoutAddress,
      enableMutualRedemption: 1n,
      isSimpleHedge: 1n, // NOTE: from v2 migration, not sure yet if to keep static
    }

    if (position === 'long') {
      contractCreationParameters.shortMutualRedeemPublicKey = contractPosition?.data?.liquidityProvidersMutualRedemptionPublicKey
      contractCreationParameters.shortPayoutAddress = contractPosition?.data?.liquidityProvidersPayoutAddress
      contractCreationParameters.longMutualRedeemPublicKey = pubkeys.longPubkey
      contractCreationParameters.longPayoutAddress = pubkeys.longAddress
    }
    const localContractData = await manager.createContract(contractCreationParameters)
      .catch(error => {
        if (error) error.name = 'ContractCompileError'
        return Promise.reject(error)
      })

    const customFee = await anyhedgeBackend.get('anyhedge/hedge-positions/gp_lp_contract_fee/')
      .then(response => {
        if (!response?.data?.address || !response?.data?.satoshis) return
        return response?.data
      })
      .catch(error => console.error(error))

    const proposeContractData = {
      contractCreationParameters,
      fees: [].map(() => {
        return { name: '', description: '', address: '', satoshis: 0n }
      }),
      contractStartingOracleMessageSequence: priceData.messageSequence
    }
    if (customFee) proposeContractData.fees.push(customFee)
    proposeContractData.fees.forEach(fee => fee.satoshis = castBigIntSafe(fee.satoshis))
    const proposeContractResponse = await generalProtocolLPBackend.post('/api/v2/proposeContract', encodeExtendedJson(proposeContractData))
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

  
  const decodedTx = decodeTransactionBCH(hexToBin(result.transaction));
  
  if(!Array.isArray(decodedTx?.inputs)) {
    response.success = false
    response.error = 'Transaction error reading transaction'
    return response
  }

  response.dependencyTxids = decodedTx.inputs.map(inp => binToHex(inp?.outpointTransactionHash))
  response.txid = txHexToHash(result.transaction)

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
 * @param {'short' | 'long'} position 
 */
export function splitContractFees(contractData, position) {
  const localContractMetadata = contractData.metadata
  const takerPayoutAddress = position === 'long'?
    localContractMetadata.longPayoutAddress : localContractMetadata.shortPayoutAddress

  const makerFees = contractData?.fees.filter(fee => {
    return fee?.name === LIQUIDITY_FEE_NAME && fee?.address === takerPayoutAddress
  })
  const takerFees = contractData?.fees.filter(fee => makerFees.indexOf(fee) < 0)

  return {
    totalTakerFees: takerFees.reduce((subtotal, fee) => subtotal + fee?.satoshis, 0n),
    totalMakerFees: makerFees.reduce((subtotal, fee) => subtotal + fee?.satoshis, 0n),
    takerFees,
    makerFees,
  }
}

/**
 * 
 * @param {ContractData} contractData 
 * @param {'short' || 'long'} position
 * @param {*} liquidityProviderFeeInSatoshis 
 * @returns 
 */
export function calculateFundingAmounts(contractData, position, liquidityProviderFeeInSatoshis=0) {
  const localContractMetadata = contractData.metadata
  const takerPayoutAddress = position === 'short' ?
    localContractMetadata.shortPayoutAddress : localContractMetadata.longPayoutAddress

  const makerInputSats = position === 'long' ? localContractMetadata.shortInputInSatoshis : localContractMetadata.longInputInSatoshis;

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
    }, 0n);

  const takerRequiredFundingSatoshis = totalRequiredFundingSatoshis - makerInputSats + castBigIntSafe(liquidityProviderFeeInSatoshis) - takerTotalFeesAndPremiumsToDeduct;

  // Calculate the amounts necessary to fund the contract.
  const contractAmount = {
    short: 0n,
    long: 0n,
  }

  if (position == 'short') {
    contractAmount.short = takerRequiredFundingSatoshis
    contractAmount.long = totalRequiredFundingSatoshis - takerRequiredFundingSatoshis
  } else if (position == 'long') {
    contractAmount.short = totalRequiredFundingSatoshis - takerRequiredFundingSatoshis
    contractAmount.long = takerRequiredFundingSatoshis
  }

  return contractAmount
}

/**
 * @param {Object} data 
 * @param {Number} data.amountSats
 * @param {String} data.oraclePublicKey
 * @param {String} data.startingOracleMessage
 * @param {String} data.startingOracleSignature
 * @param {Number} data.lowLiquidationMultiplier
 * @param {Number} data.startingPriceValue
 * @param {String} data.shortAddress
 * @param {String} data.longAddress
 * @param {{ satoshis: Number }[]} data.fees
 * @param {Number} data.liquidityFee
 * @param {'short' | 'long'} data.position
 */
 export async function calculateFundingAmountsWithFees(data) {
  // these data are necessary for generating contracts but doesnt affect the funding amounts
  const dummyData = {
    maturityTimestamp: Math.floor(Date.now() / 1000) + 86400,
    shortPublicKey: '0242ce009d64bd58c3a11b7c37f33c35177cf093b287ec4db96775381d4903be1d',
    longPublicKey: '02df07732b3b3fbfb71be46a2393bc07f5d65a0a6d25eb1809fd7a1675cd2d646d',
    highLiquidationPriceMultiplier: 5,
  }

  const units = (data.amountSats * data.startingPriceValue) / 10**8
  const contractCreationParameters = {
    takerSide: data.position,
    makerSide: data.position == 'short' ? 'long' : 'short',
    nominalUnits: units,
    oraclePublicKey: data.oraclePublicKey,
    startingOracleMessage: data.startingOracleMessage,
    startingOracleSignature: data.startingOracleSignature,
    maturityTimestamp: castBigIntSafe(dummyData.maturityTimestamp),
    highLiquidationPriceMultiplier: dummyData.highLiquidationPriceMultiplier,
    lowLiquidationPriceMultiplier: data.lowLiquidationMultiplier,
    shortMutualRedeemPublicKey: dummyData.shortPublicKey,
    longMutualRedeemPublicKey: dummyData.longPublicKey,
    shortPayoutAddress: data.shortAddress,
    longPayoutAddress: data.longAddress,
    enableMutualRedemption: 1n,
    isSimpleHedge: 1n,
  }
  const manager = new AnyHedgeManager()
  const contractData = await manager.createContract(contractCreationParameters)
  if (Array.isArray(data.fees)) {
    contractData.fees = data.fees.filter(fee => fee?.satoshis)
  }

  return calculateContractFundingWithFees(Object.assign({}, data, { contractData }))
}

/**
 * @param {Object} data
 * @param {ContractData} data.contractData
 * @param {'short' | 'long'} data.position 
 * @param {Number} [data.liquidityFee]
 * @returns 
 */
export function calculateContractFundingWithFees(data) {
  const contractData = data?.contractData
  const fundingAmounts = calculateFundingAmounts(contractData, data.position, data.liquidityFee || 0)
  const parseFeeData = data => {
    return {
      name: data?.name || '',
      description: data?.description || '',
      address: data?.address || '',
      satoshis: parseInt(data?.satoshis),
    }
  }
  const response = {
    short: {
      nominalUnits: contractData.metadata.nominalUnits,
      sats: parseInt(contractData.metadata.shortInputInSatoshis),
      fees: { premium: 0, network: 0, service: 0, serviceFees: [].map(parseFeeData) },
      total: parseInt(fundingAmounts.short),
      calculatedTotal: 0,
    },
    long: {
      nominalUnits: contractData.metadata.longInputInOracleUnits,
      sats: parseInt(contractData.metadata.longInputInSatoshis),
      fees: { premium: 0, network: 0, service: 0, serviceFees: [].map(parseFeeData) },
      total: parseInt(fundingAmounts.long),
      calculatedTotal: 0,
    },
    totalSats: 0,
  }

  const contractFees = splitContractFees(contractData, data.position)
  let takerFunding, makerFunding
  if (data.position === 'short') {
    takerFunding = response.short
    makerFunding = response.long
  } else if (data.position === 'long') {
    takerFunding = response.long
    makerFunding = response.short
  }
  if (takerFunding && makerFunding) {
    takerFunding.fees.premium = data.liquidityFee || 0
    makerFunding.fees.premium = takerFunding.fees.premium * -1
    if (Array.isArray(contractData?.fees)) {
      takerFunding.fees.serviceFees = contractFees.takerFees.map(parseFeeData)
      takerFunding.fees.service = parseInt(contractFees.totalTakerFees)
      makerFunding.fees.serviceFees = contractFees.makerFees.map(parseFeeData)
      makerFunding.fees.service = parseInt(contractFees.totalMakerFees)
    }
    takerFunding.fees.network = takerFunding.total - (takerFunding.sats + takerFunding.fees.premium + takerFunding.fees.service)
  }

  const calculateTotal = (_data) => {
    return _data.sats + _data.fees.premium + _data.fees.network + _data.fees.service
  }
  response.short.calculatedTotal = calculateTotal(response.short)
  response.long.calculatedTotal = calculateTotal(response.long)

  response.totalSats = response.short.total + response.long.total

  return response
}
/**
 * 
 * @param {Object} contractData 
 * @param {'short' | 'long'} position 
 * @param {Wallet} wallet 
 * @param {Object} addressSet
 * @param {String} addressSet.receiving
 * @param {String} addressSet.change
 * @param {Number} addressSet.index
 * @param {Number} liquidityProviderFeeInSatoshis
 * @param {'short' | 'long'} taker
 */
export async function createFundingProposal(contractData, position, wallet, addressSet, liquidityProviderFeeInSatoshis=0, taker='short') {
  const { short, long } = calculateFundingAmounts(contractData, taker, liquidityProviderFeeInSatoshis)
  let amount
  if (position === 'short') amount = parseInt(short)
  else if (position === 'long') amount = parseInt(long)

  const fundingUtxo = await getOrFindUtxo(amount, wallet, addressSet)

  const manager = new AnyHedgeManager()
  const fundingProposal = manager.createFundingProposal(contractData, fundingUtxo.txid, fundingUtxo.vout, castBigIntSafe(fundingUtxo.amount))
  let wif = await wallet.BCH.watchtower.BCH.retrievePrivateKey(wallet.BCH.mnemonic, wallet.BCH.derivationPath, fundingUtxo.address_path)
  wif = encodePrivateKeyWif(wif, 'mainnet')
  const signedFundingProposal = await manager.signFundingProposal(wif, fundingProposal)

  return { fundingUtxo, signedFundingProposal }
}

export async function isUtxoSpent(txHash, index) {
  const response = { success: false, spent: false, error: undefined }
  try {
    const result = await axios.get(`https://api.fullstack.cash/v5/blockchain/getTxOut/${txHash}/${index}/`)
    if (result.data === null) {
      response.spent = true
    }
    response.success = true
    return response
  } catch(error) {
    console.error(error)
    response.success = false
    response.error = error
    return response
  }
}

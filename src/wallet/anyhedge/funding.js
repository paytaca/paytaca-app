import BCHJS from '@psf/bch-js'
import { AnyHedgeManager } from '@generalprotocols/anyhedge'
import Watchtower from 'watchtower-cash-js'
import { Wallet } from '../index'
import { generalProtocolLPBackend, generalProtocolLPAuthToken } from './backend'
import { getContractAccessKeys, getContractStatus } from './utils'

const bchjs = new BCHJS()

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
 * @param {String} pubkeys.hedgeAddress - Destination address of hedger's funds on maturity/liquidation
 * @param {String} pubkeys.hedgePubkey - Public key of hedger
 * @param {Object} priceData
 * @param {Number} priceData.messageSequence
 * @param {Number} priceData.priceValue
 * @param {Number} priceData.messageTimestamp
 * @param {Number} priceData.oraclePubkey
 * @param {Object} liquidityServiceInfo
 * @param {String} privateKey
 */
export async function calculateGeneralProtocolsLPFee(intent, pubkeys, priceData, liquidityServiceInfo, privateKey) {
  const response = {
    success: false,
    contractData: {},
    liquidityFee: { fee: 0, recalculateAfter: 0 },
    accessKeys: { signature: '', publicKey: '' },
    error: null
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

    const prepareContractPositionData = { oraclePublicKey: priceData.oraclePubkey, poolSide: 'hedge' }
    const contractPosition = await generalProtocolLPBackend.post('/api/v1/prepareContractPosition', prepareContractPositionData)

    const hasLiquidity = contractInputs?.longSats < contractPosition?.data?.availableLiquidityInSatoshis
    if (!hasLiquidity) throw 'Not enough liquidity to support hedge position'

    const nominalUnits = intent.amount * priceData.priceValue
    const contractCreationParameters = {
      nominalUnits: nominalUnits,
      duration: intent.duration,
      startPrice: priceData.priceValue,
      startTimestamp: priceData.messageTimestamp,
      oraclePublicKey: priceData.oraclePubkey,
      highLiquidationPriceMultiplier: intent.highPriceMult,
      lowLiquidationPriceMultiplier: intent.lowPriceMult,
      hedgePublicKey: pubkeys.hedgePubkey,
      longPublicKey: contractPosition?.data?.liquidityProvidersMutualRedemptionPublicKey,
      hedgeAddress: pubkeys.hedgeAddress,
      longAddress: contractPosition?.data?.liquidityProvidersPayoutAddress,

      // oraclePublicKey: priceData.oraclePubkey,
      // hedgePublicKey: pubkeys.hedgePubkey,
      // longPublicKey: contractPosition?.data?.liquidityProvidersMutualRedemptionPublicKey,
      // hedgeUnits: nominalUnits,
      // startPrice: priceData.priceValue,
      // startTimestamp: priceData.messageTimestamp,
      // earliestLiquidationModifier: 0,
      // maturityModifier: intent.duration,
      // highLiquidationPriceMultiplier: intent.highPriceMult,
      // lowLiquidationPriceMultiplier: intent.lowPriceMult,
    }
    const localContractData = await manager.createContract(contractCreationParameters)

    const proposeContractData = {
      contractCreationParameters,
      contractStartingOracleMessageSequence: priceData.messageSequence
    }
    const proposeContractResponse = await generalProtocolLPBackend.post('/api/v1/proposeContract', proposeContractData)
    response.liquidityFee.fee = proposeContractResponse?.data?.liquidityProviderFeeInSatoshis
    response.liquidityFee.recalculateAfter = proposeContractResponse?.data?.renegotiateAfterTimestamp

    // response.long.address = contractCreationParameters.longAddress
    // response.long.pubkey = contractCreationParameters.longPublicKey
    response.success = true

    const contractAccessKeys = await getContractAccessKeys(localContractData.address, privateKey)
    const contractData = await getContractStatus(
      localContractData.address,
      contractAccessKeys.signature,
      contractAccessKeys.publicKey,
      _managerConfig,
    );
    response.accessKeys = contractAccessKeys
    response.contractData = contractData
  } catch(error) {
    console.error(error)
    response.success = false
    response.error = error
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
    const { txid, dependencyTxids } = await createUtxo(amount, addressSet.receiving, addressSet.change, wallet)

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
    response.error = result?.error || 'Error generating transaction'
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
  if (!broadcastResponse?.sucess) {
    response.success = false
    response.error = broadcastResponse?.error || 'Error in broadcasting transaction'
    return response
  }

  return response
}

export async function searchUtxo(amount, walletHash) {
  const watchtower = new Watchtower()
  const utxos = await watchtower.BCH.getBchUtxos(`wallet:${walletHash}`)
  return utxos.utxos.find(utxo => utxo.value == amount)
}


function calculateFundingAmounts(contractData) {
  // Extract relevant data from contract metadata.
  const { hedgeInputSats, longInputSats, minerCost, dustCost } = contractData.metadata;
  const { fee } = contractData;

  const INPUT_SIZE = 148;
	const OUTPUT_SIZE = 34;
  const fixedFee = 10 + (4 * OUTPUT_SIZE);


  // Calculate the amounts necessary to fund the contract.
  const contractAmount = {
    hedge: hedgeInputSats + (fee?.satoshis | 0) + INPUT_SIZE + (fixedFee / 2),
    long: longInputSats + minerCost + dustCost + INPUT_SIZE + (fixedFee / 2),
  }

  return contractAmount
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
 * @param {Number} additionalFees
 */
export async function createFundingProposal(contractData, position, wallet, addressSet, additionalFees=0) {
  const { hedge, long } = calculateFundingAmounts(contractData)
  let amount
  if (position === 'hedge') amount = hedge
  else if (position === 'long') amount = long

  amount = amount + additionalFees
  const fundingUtxo = await getOrFindUtxo(amount, wallet, addressSet)

  const manager = new AnyHedgeManager()
  const fundingProposal = manager.createFundingProposal(contractData, fundingUtxo.txid, fundingUtxo.vout, fundingUtxo.amount)
  const wif = await wallet.BCH.watchtower.BCH.retrievePrivateKey(wallet.BCH.mnemonic, wallet.BCH.derivationPath, fundingUtxo.address_path)
  const signedFundingProposal = await manager.signFundingProposal(wif, fundingProposal)

  return { fundingUtxo, signedFundingProposal }
}
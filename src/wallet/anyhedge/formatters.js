import { AnyHedgeManager, SettlementType, ContractData } from '@generalprotocols/anyhedge'
import ago from 's-ago'
import { capitalize } from 'vue'

export function formatPositionOfferStatus(value='') {
  if (!value) return ''
  switch(value) {
    case 'pending':
      return 'Pending'
    case 'accepted':
      return 'Accepted'
    case 'settled':
    case 'agreed':
      return 'Agreed'
    default:
      return capitalize(value)
  }
}

export function resolvePositionOfferColor(value='') {
  const statusColorMap = { pending: 'amber', accepted: 'teal', settled: 'green', agreed: 'green', cancelled: 'red' }
  return statusColorMap[value]
}

export function formatTimestampToText(timestamp) {
  const dateObj = new Date(timestamp)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
}
export function formatDate (date) {
  return ago(new Date(date))
}

export function formatUnits(value, decimals) {
  return Math.round(Number(value)) / 10 ** decimals
}

export function formatCentsToUSD(value) {
  return formatUnits(value, 2)
}

export function formatDuration(duration) {
  const unitOptions = [
    {label: 'second', multiplier: 1,               max: 60 },
    {label: 'minute', multiplier: 60,              max: 3600 },
    {label: 'hour',   multiplier: 3600,            max: 86400 },
    {label: 'day',    multiplier: 86400,           max: 86400 * 10 },
    {label: 'week',   multiplier: 86400 * 7,       max: 86400 * 30 },
    {label: '~month', multiplier: 86400 * 30,      max: 86400 * 30 * 12 },
    {label: '~year',  multiplier: 86400 * 30 * 12, max: Infinity },
  ]
  if (!isFinite(duration) || duration <= 0) return ''
  const unit = unitOptions.find(unit => duration <= unit.max)
  if (!unit) return ''
  
  const durationValue = duration/unit.multiplier
  let label = unit.label
  if (durationValue > 1) {
    label += 's'
  }
  return `${durationValue} ${label}`
}

/**
 * 
 * @param {String} value 
 * @param {{ start: Number, end: Number }} config 
 */
export function ellipsisText (value, config) {
  const _config = Object.assign({
    start: 15,
    end: 10,
  }, config)
  _config.breakLength = _config.start + _config.end - 5
  if (typeof value !== 'string') return ''
  if (value.length <= _config.breakLength) return value
  return value.substr(0, _config.start) + '...' + value.substr(value.length - _config.end, value.length)
}

/**
 * 
 * @typedef {Object} FundingProposalAPI
 * @property {String} tx_hash
 * @property {Number} tx_index
 * @property {Number} tx_value
 * @property {String} script_sig
 * 
 * @typedef {Object} SettlementAPI
 * @property {String} spending_transaction
 * @property {SettlementType} settlement_type
 * @property {Number} hedge_satoshis
 * @property {Number} long_satoshis
 * @property {String} oracle_pubkey
 * @property {Number} settlement_price
 * @property {Number} settlement_price_sequence
 * @property {Number} settlement_message_sequence
 * @property {Number} settlement_message_timestamp
 * 
 * @typedef {Object} FundingAPI
 * @property {String} tx_hash
 * @property {Number} funding_satoshis
 * @property {Number} funding_output
 * @property {Number|undefined|null} fee_satoshis
 * @property {Number|undefined|null} fee_output
 * 
 * @typedef {Object} MutualRedemptionAPI
 * @property {'refund' | 'early_maturation' | 'arbitrary'} redemption_type
 * @property {Number} hedge_satoshis
 * @property {Number} long_satoshis
 * @property {String|undefined|null} hedge_schnorr_sig
 * @property {String|undefined|null} long_schnorr_sig
 * @property {Number|undefined|null} settlement_price
 * @property {String|undefined|null} tx_hash
 * 
 * @typedef {Object} MetadataAPI
 * @property {String} [position_taker]
 * @property {Number} [liquidity_fee]
 * @property {Number} [network_fee]
 * @property {Number} [total_hedge_funding_sats]
 * @property {Number} [total_long_funding_sats]
 * 
 * 
 * @typedef {Object} HedgePositionOfferAPI
 * @property {Number} id
 * @property {String} status
 * @property {String} position
 * @property {String} wallet_hash
 * @property {Number} satoshis
 * @property {Number} duration_seconds
 * @property {Number} low_liquidation_multiplier
 * @property {Number} high_liquidation_multiplier
 * @property {String} oracle_pubkey
 * @property {String} address
 * @property {String} pubkey
 * @property {String} address_path
 * @property {Object} [hedge_position]
 * @property {String} [expires_at]
 * @property {String} created_at
 * @property {HedgePositionOfferCounterPartyInfoAPI} [data.counter_party_info]
 * 
 * @typedef {Object} HedgePositionOfferCounterPartyInfoAPI
 * @property {String} settlement_deadline
 * @property {String} contract_address
 * @property {String} anyhedge_contract_version
 * @property {String} wallet_hash
 * @property {String} address
 * @property {String} pubkey
 * @property {String} address_path
 * @property {String} price_message_timestamp
 * @property {Number} price_value
 * @property {Number} oracle_message_sequence
 * @property {String} settlement_service_fee
 * @property {String} settlement_service_fee_address
 * @property {Number} [calculated_hedge_sats]
*/

/**
 * 
 * @param {Object} data 
 * @param {String} data.address - Address of hedge position contract
 * @param {String} data.anyhedge_contract_version - Version used for hedge contract
 * @param {Number} data.satoshis - Hedge value in satoshis
 * @param {Number} data.start_timestamp
 * @param {Number} data.maturity_timestamp
 * @param {String} [data.hedge_wallet_hash]
 * @param {String} data.hedge_address
 * @param {String} data.hedge_pubkey
 * @param {String} [data.hedge_address_path]
 * @param {String} [data.long_wallet_hash]
 * @param {String} data.long_address
 * @param {String} data.long_pubkey
 * @param {String} [data.long_address_path]
 * @param {String} data.oracle_pubkey
 * @param {Number} data.start_price
 * @param {Number} data.low_liquidation_multiplier
 * @param {Number} data.high_liquidation_multiplier
 * @param {Number} [data.cancelled_at]
 * @param {String} [data.cancelled_by]
 * @param {String|null} data.funding_tx_hash
 * @param {Boolean|null} data.funding_tx_hash_validated
 * @param {{ address: String, satoshis: Number }} data.fee
 * @param {FundingProposalAPI|null} data.hedge_funding_proposal
 * @param {FundingProposalAPI|null} data.long_funding_proposal
 * @param {SettlementAPI|null} data.settlement
 * @param {FundingAPI|null} data.funding
 * @param {MutualRedemptionAPI|null} data.mutual_redemption
 * @param {MetadataAPI|null} data.metadata
 * 
 * @returns 
 */
export async function parseHedgePositionData(data) {
  const units = (data.satoshis * data.start_price) / 10**8
  const contractCreationParameters = {
    nominalUnits: units,
    duration: data.maturity_timestamp - data.start_timestamp,
    startPrice: data.start_price,
    startTimestamp: data.start_timestamp,
    oraclePublicKey: data.oracle_pubkey,
    highLiquidationPriceMultiplier: data.high_liquidation_multiplier,
    lowLiquidationPriceMultiplier: data.low_liquidation_multiplier,
    hedgePublicKey: data.hedge_pubkey,
    longPublicKey: data.long_pubkey,
    hedgeAddress: data.hedge_address,
    longAddress: data.long_address,
  }
  // const contractCreationParameters = {
  //   oraclePublicKey: data.oracle_pubkey,
  //   hedgePublicKey: data.hedge_pubkey,
  //   longPublicKey: data.long_pubkey,
  //   hedgeUnits: units,
  //   startPrice: data.start_price,
  //   startTimestamp: data.start_timestamp,
  //   earliestLiquidationModifier: 0,
  //   maturityModifier: data.maturity_timestamp - data.start_timestamp,
  //   highLiquidationPriceMultiplier: data.high_liquidation_multiplier,
  //   lowLiquidationPriceMultiplier: data.low_liquidation_multiplier,
  // }

  const contractData = await compileContract(contractCreationParameters, data.anyhedge_contract_version)
  if (contractData.address !== data.address) {
    console.warn(
      `Address mismatch when parsing hedge position got: "${contractData.address}" instead of "${data.address}"`,
      data,
      contractData,
    )
  }

  contractData.hedgeWalletHash = data.hedge_wallet_hash
  contractData.hedgeAddressPath = data.hedge_address_path
  contractData.longWalletHash = data.long_wallet_hash
  contractData.longAddressPath = data.long_address_path
  contractData.fundingTxHash = data.funding_tx_hash
  // contractData.fundingTxHash = 'bb743a47d81e8da85e2a0aebd03fd1be29d9703f23c0f431caf714c3e8588498'
  if (data?.funding_tx_hash) {
    contractData.funding = [{
      fundingTransaction: data.funding_tx_hash,
      // some data is actually missing here
    }]
  }


  // const fundingProposal = {
  //   tx_hash: 'bb743a47d81e8da85e2a0aebd03fd1be29d9703f23c0f431caf714c3e8588498',
  //   tx_index: 0,
  //   tx_value: 1000000,
  //   script_sig: '',
  // }
  contractData.hedgeFundingProposal = data.hedge_funding_proposal
  contractData.longFundingProposal = data.long_funding_proposal
  // contractData.hedgeFundingProposal = Object.assign({}, fundingProposal)
  // contractData.longFundingProposal = Object.assign({}, fundingProposal)

  if (data?.fee?.address && data?.fee?.satoshis) {
    contractData.fee = {
      address: data.fee.address,
      satoshis: data.fee.satoshis,
    }
  }

  if (data?.funding?.tx_hash && data?.funding?.funding_satoshis) {
    contractData.funding = [{
      fundingTransaction: data.funding.tx_hash,
      fundingSatoshis: data.funding.funding_satoshis,
      fundingOutput: data.funding.funding_output,
      feeSatoshis: data.funding.fee_satoshis || undefined,
      feeOutput: data.funding.fee_output || undefined,
    }]
  }

  if (data?.settlement) {
    contractData.settlement = [{
      spendingTransaction: data.settlement.spending_transaction,
      settlementType: data.settlement.settlement_type,
      hedgeSatoshis: data.settlement.hedge_satoshis,
      longSatoshis: data.settlement.long_satoshis,
      oraclePublicKey: data.settlement.oracle_pubkey,
      settlementPrice: data.settlement.settlement_price,

      // Not actually part of ContractDataV1's settlement interface in anyhedge
      settlementPriceSequence: data.settlement.settlement_price_sequence,
      settlementMessageSequence: data.settlement.settlement_message_sequence,
      settlementMessageTimestamp: data.settlement.settlement_message_timestamp,
    }]
  }

  if (data?.mutual_redemption) {
    contractData.mutualRedemption = data.mutual_redemption
  } else {
    contractData.mutualRedemption = null
  }

  if (data?.metadata) {
    contractData.apiMetadata = {
      hedgeAddressPath:       data?.hedge_address_path,
      longAddressPath:        data?.long_address_path,
      positionTaker:          data?.metadata?.position_taker,
      liquidityFee:           data?.metadata?.liquidity_fee,
      networkFee:             data?.metadata?.network_fee,
      totalHedgeFundingSats:  data?.metadata?.total_hedge_funding_sats,
      totalLongFundingSats:   data?.metadata?.total_long_funding_sats,
    }
  }

  if (data?.cancelled_at) {
    contractData.cancelled = { at: data.cancelled_at, by: data?.cancelled_by }
  } else {
    contractData.cancelled = null
  }

  return contractData
}

export async function compileContract(contractCreationParameters, contractVersion) {
  const manager = new AnyHedgeManager({ contractVersion: contractVersion })
  const contractData = await manager.createContract(contractCreationParameters)
  return contractData
}

/**
 * 
 * @param {ContractData} contract 
 */
export function parseSettlementMetadata(contract) {
  const data = {
    settlementType: '',
    settlementTypeText: '',
    mutualRedemptionTypeText: '',

    settlementPriceValue: 0,
    settlementTimestamp: -1,
    txid: '',
    hedge: { nominalUnits: 0, satoshis: 0, assetChangePctg: 0, bchChangePctg: 0 },
    long: { nominalUnits: 0, satoshis: 0, assetChangePctg: 0, bchChangePctg: 0 },

    summary: {
      hedge: { assetChangePctg: 0, actualSatsChange: 0 },
      long: { actualSatsChange: 0 },
    }
  }

  const settlement = contract?.settlement?.[0]
  if (settlement?.hedgeSatoshis >= 0 && settlement?.longSatoshis >= 0) {
    data.txid = settlement?.spendingTransaction || ''
    data.settlementPriceValue = settlement?.settlementPrice
    data.settlementTimestamp = settlement?.settlementMessageTimestamp

    data.settlementType = settlement?.settlementType || ''
    data.settlementTypeText = capitalize(data.settlementType).replace('_', ' ').trim()

    if (data.settlementType === 'mutual' && settlement?.spendingTransaction === contract?.mutualRedemption?.tx_hash) {
      data.mutualRedemptionTypeText = contract?.mutualRedemption?.redemption_type || ''
      data.mutualRedemptionTypeText = capitalize(data.mutualRedemptionTypeText).replace('_', ' ').trim()
      if (!data.settlementPriceValue && contract?.mutualRedemption?.settlement_price) {
        data.settlementPriceValue = contract?.mutualRedemption?.settlement_price
      }
    }

    const { hedgeSatoshis, longSatoshis } = settlement
    const hedgeUnits = (hedgeSatoshis * data.settlementPriceValue) / 10 ** 8
    const longUnits = (longSatoshis * data.settlementPriceValue) / 10 ** 8

    data.hedge.nominalUnits = hedgeUnits
    data.hedge.satoshis = hedgeSatoshis
    data.long.nominalUnits = longUnits
    data.long.satoshis = longSatoshis

    data.hedge.assetChangePctg = Math.round((hedgeUnits / contract?.metadata?.nominalUnits) * 10000)
    data.hedge.bchChangePctg = Math.round((hedgeSatoshis / contract?.metadata?.hedgeInputSats) * 10000)
    data.long.assetChangePctg = Math.round((longUnits / contract?.metadata?.longInputUnits) * 10000)
    data.long.bchChangePctg = Math.round((longSatoshis / contract?.metadata?.longInputSats) * 10000)

    data.hedge.assetChangePctg = -(10000 - data.hedge.assetChangePctg) / 100
    data.hedge.bchChangePctg = -(10000 - data.hedge.bchChangePctg) / 100
    data.long.assetChangePctg = -(10000 - data.long.assetChangePctg) / 100
    data.long.bchChangePctg = -(10000 - data.long.bchChangePctg) / 100

    if (contract?.apiMetadata?.totalHedgeFundingSats) {
      data.summary.hedge.actualSatsChange = hedgeSatoshis - contract.apiMetadata.totalHedgeFundingSats
      data.summary.hedge.assetChangePctg = data.hedge.assetChangePctg
    } else {
      data.summary.hedge = null
    }

    if (contract?.apiMetadata?.totalLongFundingSats) {
      data.summary.long.actualSatsChange = longSatoshis - contract.apiMetadata.totalLongFundingSats
    } else {
      data.summary.long = null
    }
  }
  return data
}

/**
 * @param {HedgePositionOfferAPI} data
 */
export function parseHedgePositionOffer(data) {
  const parsedData = {
    id: data?.id,
    status: data?.status,
    position: data?.position,
    walletHash: data?.wallet_hash,
    satoshis: data?.satoshis,
    durationSeconds: data?.duration_seconds,
    lowLiquidationPriceMultiplier: data?.low_liquidation_multiplier,
    highLiquidationPriceMultiplier: data?.high_liquidation_multiplier,
    oraclePubkey: data?.oracle_pubkey,
    address: data?.address,
    pubkey: data?.pubkey,
    addressPath: data?.address_path,
    hedgePosition: data?.hedge_position ?
      parseHedgePositionData(data.hedge_position) :
      null,
    expiresAt: data?.expires_at ? new Date(data?.expires_at) / 1000 : null,
    createdAt: data?.created_at ? new Date(data?.created_at) / 1000 : null,
    counterPartyInfo: data?.counter_party_info ?
      parseCounterPartyInfo(data.counter_party_info) :
      null,
  }
  return parsedData
}

/**
 * @param {HedgePositionOfferCounterPartyInfoAPI} counterPartyInfo 
 */
export function parseCounterPartyInfo(counterPartyInfo) {
  return {
    settlementDeadline: counterPartyInfo?.settlement_deadline ? new Date(counterPartyInfo?.settlement_deadline) / 1000 : null,
    contractAddress: counterPartyInfo?.contract_address,
    contractVersion: counterPartyInfo?.anyhedge_contract_version,
    walletHash: counterPartyInfo?.wallet_hash,
    address: counterPartyInfo?.address,
    pubkey: counterPartyInfo?.pubkey,
    addressPath: counterPartyInfo?.address_path,
    priceMessageTimestamp: counterPartyInfo?.price_message_timestamp ? new Date(counterPartyInfo?.price_message_timestamp) / 1000 : null,
    priceValue: counterPartyInfo?.price_value,
    oracleMessageSequence: counterPartyInfo?.oracle_message_sequence,
    settlementServiceFee: counterPartyInfo?.settlement_service_fee,
    settlementServiceFeeAddress: counterPartyInfo?.settlement_service_fee_address,
    calculatedHedgeSats: counterPartyInfo?.calculated_hedge_sats,
  }
}

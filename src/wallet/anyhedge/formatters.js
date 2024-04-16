import { AnyHedgeManager, SettlementType, castContractDataV1toContractDataV2 } from '@generalprotocols/anyhedge'
import { AnyHedgeArtifacts } from '@generalprotocols/anyhedge-contracts';
import { AnyHedgeManager as AnyHedgeManagerOld } from '@generalprotocols/anyhedge-old';
import ago from 's-ago'
import { capitalize } from 'vue'
import { castBigIntSafe } from './utils'

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

export function formatUnits(value, decimals=0) {
  return Math.round(Number(value)) / 10 ** decimals
}

export function formatCentsToUSD(value) {
  return formatUnits(value, 2)
}

export function formatDuration(durationInSeconds) {
  const unitOptions = [
    {label: 'second', multiplier: 1,               max: 60 },
    {label: 'minute', multiplier: 60,              max: 3600 },
    {label: 'hour',   multiplier: 3600,            max: 86400 },
    {label: 'day',    multiplier: 86400,           max: 86400 * 10 },
    {label: 'week',   multiplier: 86400 * 7,       max: 86400 * 30 },
    {label: '~month', multiplier: 86400 * 30,      max: 86400 * 30 * 12 },
    {label: '~year',  multiplier: 86400 * 30 * 12, max: Infinity },
  ]
  if (!isFinite(durationInSeconds) || durationInSeconds <= 0) return ''
  const unit = unitOptions.find(unit => durationInSeconds <= unit.max)
  if (!unit) return ''
  
  const durationValue = durationInSeconds/unit.multiplier
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
 * @typedef {Object} FeeAPI
 * @property {String} name
 * @property {String} description
 * @property {String} address
 * @property {Number} satoshis
 * 
 * @typedef {Object} PriceOracleMessageAPI
 * @property {String} pubkey
 * @property {Number} message_timestamp
 * @property {Number} price_value
 * @property {Number} price_sequence
 * @property {Number} message_sequence
 * @property {String} message
 * @property {String} signature
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
 * @property {Number} short_satoshis
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
 * 
 * @typedef {Object} MutualRedemptionAPI
 * @property {'refund' | 'early_maturation' | 'arbitrary'} redemption_type
 * @property {Number} short_satoshis
 * @property {Number} long_satoshis
 * @property {String|undefined|null} short_schnorr_sig
 * @property {String|undefined|null} long_schnorr_sig
 * @property {Number|undefined|null} settlement_price
 * @property {String|undefined|null} tx_hash
 * 
 * @typedef {Object} MetadataAPI
 * @property {String} [position_taker]
 * @property {Number} [liquidity_fee]
 * @property {Number} [network_fee]
 * @property {Number} [total_short_funding_sats]
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
 * @property {String} starting_oracle_message
 * @property {String} starting_oracle_signature
 * @property {Number} oracle_message_sequence
 * @property {String} settlement_service_fee
 * @property {String} settlement_service_fee_address
 * @property {Number} [calculated_short_sats]
 * @property {PriceOracleMessageAPI} [price_oracle_message]
*/

/**
 * 
 * @param {Object} data 
 * @param {String} data.address - Address of hedge position contract
 * @param {String} data.anyhedge_contract_version - Version used for hedge contract
 * @param {Number} data.satoshis - Hedge value in satoshis
 * @param {Number} data.start_timestamp
 * @param {Number} data.maturity_timestamp
 * @param {String} [data.short_wallet_hash]
 * @param {String} data.short_address
 * @param {String} data.short_pubkey
 * @param {String} [data.short_address_path]
 * @param {String} [data.long_wallet_hash]
 * @param {String} data.long_address
 * @param {String} data.long_pubkey
 * @param {String} [data.long_address_path]
 * @param {String} data.oracle_pubkey
 * @param {Number} data.start_price
 * @param {Number} data.low_liquidation_multiplier
 * @param {Number} data.high_liquidation_multiplier
 * @param {String} [data.starting_oracle_message]
 * @param {String} [data.starting_oracle_signature]
 * @param {Number} [data.cancelled_at]
 * @param {String} [data.cancelled_by]
 * @param {String|null} data.funding_tx_hash
 * @param {Boolean|null} data.funding_tx_hash_validated
 * @param {FeeAPI[]} data.fees
 * @param {FundingProposalAPI|null} data.short_funding_proposal
 * @param {FundingProposalAPI|null} data.long_funding_proposal
 * @param {SettlementAPI[]} data.settlements
 * @param {FundingAPI[]} data.fundings
 * @param {MutualRedemptionAPI|null} data.mutual_redemption
 * @param {MetadataAPI|null} data.metadata
 * @param {PriceOracleMessageAPI} [data.price_oracle_message]
 * 
 * @returns 
 */

export async function parseHedgePositionData(data) {
  const units = (data.satoshis * data.start_price) / 10**8
  const contractCreationParameters = {
    takerSide: data.metadata?.position_taker == 'hedge' ? 'short': data.metadata?.position_taker,
    makerSide: data.metadata?.position_taker == 'long' ? 'short' : 'long',
    nominalUnits: units,
    oraclePublicKey: data.oracle_pubkey,
    startingOracleMessage: data.starting_oracle_message || data.price_oracle_message?.message,
    startingOracleSignature: data.starting_oracle_signature || data.price_oracle_message?.signature,
    maturityTimestamp: castBigIntSafe(data?.maturity_timestamp),
    highLiquidationPriceMultiplier: data.high_liquidation_multiplier,
    lowLiquidationPriceMultiplier: data.low_liquidation_multiplier,
    shortMutualRedeemPublicKey: data.short_pubkey,
    longMutualRedeemPublicKey: data.long_pubkey,
    shortPayoutAddress: data.short_address,
    longPayoutAddress: data.long_address,
    enableMutualRedemption: 1n,
    isSimpleHedge: 1n, // NOTE: from v2 migration, not sure yet if to keep static
  }

  const contractData = await compileContract(contractCreationParameters, data.anyhedge_contract_version)
  if (contractData.address == "bitcoincash:pd233wda673dycvvt9kgnn2m2gvt22zw559k28rn4sem5hs39wzpy6txepqs0") {
    window.d = contractData
  }
  if (contractData.address !== data.address) {
    console.warn(
      `Address mismatch when parsing hedge position got: "${contractData.address}" instead of "${data.address}"`,
      data,
      contractData,
    )
  }

  contractData.shortWalletHash = data.short_wallet_hash
  contractData.shortAddressPath = data.short_address_path
  contractData.longWalletHash = data.long_wallet_hash
  contractData.longAddressPath = data.long_address_path
  contractData.fundingTxHash = data.funding_tx_hash

  if (Array.isArray(data?.fundings)) {
    if (!Array.isArray(contractData.fundings)) contractData.fundings = []
    data?.fundings.forEach(funding => {
      contractData.fundings.push({
        fundingTransactionHash: funding?.tx_hash,
        fundingOutputIndex: castBigIntSafe(funding?.funding_output),
        fundingSatoshis: castBigIntSafe(funding?.funding_satoshis),
      })
    })
  }

  // might remove after upgrade is stable
  if (data?.funding_tx_hash) {
    if (!Array.isArray(contractData.fundings)) contractData.fundings = []
    const index = contractData.fundings.findIndex(funding => funding.fundingTransactionHash == data.funding_tx_hash)
    if (index < 0) contractData.fundings.push({
      fundingTransactionHash: data.funding_tx_hash,
      fundingOutputIndex: castBigIntSafe(data?.funding?.funding_satoshis),
      fundingSatoshis: castBigIntSafe(data?.funding?.funding_output),
    })
  }

  contractData.shortFundingProposal = data.short_funding_proposal
  contractData.longFundingProposal = data.long_funding_proposal

  if (Array.isArray(data?.fees)) {
    contractData.fees = data.fees.map(fee => Object({
      name: fee?.name,
      description: fee?.description,
      address: fee?.address,
      satoshis: castBigIntSafe(fee?.satoshis),
    })).filter(fee => fee.address && fee.satoshis)
  }

  if (Array.isArray(data?.settlements)) {
    const settlementTxFee = contractData?.version?.includes?.('v0.11') ? 1175n : 1967n
    data?.settlements?.forEach(settlement => {
      const fundingSats = settlementTxFee + // fixed tx fee
                          castBigIntSafe(settlement.short_satoshis) +
                          castBigIntSafe(settlement.long_satoshis)
      const txid = settlement.spending_transaction
      const fundingIndex = contractData?.fundings?.findIndex?.(funding => {
        if (funding?.fundingSatoshis !== fundingSats) return false
        if (funding?.settlement && funding?.settlement?.settlementTransactionHash === txid) return true

        return !funding?.settlement
      })
      if (fundingIndex >= 0) {
        contractData.fundings[fundingIndex].settlement = {
          settlementType: settlement.settlement_type,
          settlementTransactionHash: settlement.spending_transaction,
          shortPayoutInSatoshis: castBigIntSafe(settlement.short_satoshis),
          longPayoutInSatoshis: castBigIntSafe(settlement.long_satoshis),
          settlementPrice: castBigIntSafe(settlement.settlement_price),
          settlementMessage: settlement?.settlement_message || '',
          settlementSignature: settlement?.settlement_signature || '',
          previousMessage: settlement?.previous_message || '',
          previousSignature: settlement?.previous_signature || '',

          // Not actually part of ContractDataV2's settlement interface in anyhedge
          oraclePublicKey: settlement.oracle_pubkey,
          settlementPriceSequence: settlement.settlement_price_sequence,
          settlementMessageSequence: settlement.settlement_message_sequence,
          settlementMessageTimestamp: settlement.settlement_message_timestamp,
        }
      }
    })
  }

  if (data?.mutual_redemption) {
    const mutualRedemption = data.mutual_redemption
    contractData.mutualRedemption = mutualRedemption
    contractData.mutualRedemption = {
      initiator: mutualRedemption?.initiator === 'hedge'
        ? 'short' : mutualRedemption?.initiator,
      redemptionType: mutualRedemption?.redemption_type,
      shortSatoshis: castBigIntSafe(mutualRedemption?.short_satoshis),
      longSatoshis: castBigIntSafe(mutualRedemption?.long_schnorr_sig),
      shortSchnorrSig: mutualRedemption?.short_schnorr_sig,
      longSchnorrSig: mutualRedemption.long_schnorr_sig,
      settlementPrice: castBigIntSafe(mutualRedemption.settlement_price),
      txHash: mutualRedemption.tx_hash,
    }
  } else {
    contractData.mutualRedemption = null
  }

  if (data?.metadata) {
    contractData.apiMetadata = {
      shortAddressPath:       data?.short_address_path,
      longAddressPath:        data?.long_address_path,
      positionTaker:          data?.metadata?.position_taker  === 'hedge' ? 'short' : data?.metadata?.position_taker,
      liquidityFee:           castBigIntSafe(data?.metadata?.liquidity_fee),
      networkFee:             castBigIntSafe(data?.metadata?.network_fee),
      totalShortFundingSats:  castBigIntSafe(data?.metadata?.total_short_funding_sats),
      totalLongFundingSats:   castBigIntSafe(data?.metadata?.total_long_funding_sats),
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
  if (contractVersion && !AnyHedgeArtifacts[contractVersion]) {
    const _castedCreationParams = Object.assign({}, contractCreationParameters)
    if (_castedCreationParams?.takerSide === 'short') _castedCreationParams.takerSide = 'hedge'
    if (_castedCreationParams?.makerSide === 'short') _castedCreationParams.makerSide = 'hedge'
    _castedCreationParams.maturityTimestamp = parseInt(_castedCreationParams?.maturityTimestamp)
    _castedCreationParams.enableMutualRedemption = parseInt(_castedCreationParams?.enableMutualRedemption)
    _castedCreationParams.hedgeMutualRedeemPublicKey = _castedCreationParams?.shortMutualRedeemPublicKey
    _castedCreationParams.hedgePayoutAddress = _castedCreationParams?.shortPayoutAddress
    const managerOld = new AnyHedgeManagerOld({ contractVersion: contractVersion })
    const contractDataV1 = await managerOld.createContract(_castedCreationParams)
    const contractDataV2 = castContractDataV1toContractDataV2(contractDataV1)
    return contractDataV2
  }

  const manager = new AnyHedgeManager({ contractVersion: contractVersion })
  const contractData = await manager.createContract(contractCreationParameters)
  return contractData
}

/**
 * 
 * @param {import('@generalprotocols/anyhedge').ContractDataV2} contract 
 */
export function parseSettlementMetadata(contract) {
  const data = {
    settlementType: '',
    settlementTypeText: '',
    mutualRedemptionTypeText: '',

    settlementPriceValue: 0n,
    settlementTimestamp: -1,
    txid: '',
    short: { nominalUnits: 0, satoshis: 0n, assetChangePctg: 0, bchChangePctg: 0 },
    long: { nominalUnits: 0, satoshis: 0n, assetChangePctg: 0, bchChangePctg: 0 },

    summary: {
      short: { assetChangePctg: 0, actualSatsChange: 0n },
      long: { actualSatsChange: 0n },
    }
  }

  const settlement = contract?.fundings.find(funding => funding?.settlement)?.settlement
  if (settlement?.shortPayoutInSatoshis >= 0n && settlement?.longPayoutInSatoshis >= 0n) {
    data.txid = settlement?.settlementTransactionHash || ''
    data.settlementPriceValue = settlement?.settlementPrice || 0n
    data.settlementTimestamp = settlement?.settlementMessageTimestamp

    data.settlementType = settlement?.settlementType || ''
    data.settlementTypeText = capitalize(data.settlementType).replace('_', ' ').trim()

    if (data.settlementType === 'mutual' && settlement?.settlementTransactionHash === contract?.mutualRedemption?.tx_hash) {
      data.mutualRedemptionTypeText = contract?.mutualRedemption?.redemption_type || ''
      data.mutualRedemptionTypeText = capitalize(data.mutualRedemptionTypeText).replace('_', ' ').trim()
      if (!data.settlementPriceValue && contract?.mutualRedemption?.settlement_price) {
        data.settlementPriceValue = contract?.mutualRedemption?.settlement_price
      }
    }

    const { shortPayoutInSatoshis, longPayoutInSatoshis } = settlement
    const shortUnits = formatUnits(shortPayoutInSatoshis * data.settlementPriceValue, 8)
    const longUnits = formatUnits(longPayoutInSatoshis * data.settlementPriceValue, 8)

    data.short.nominalUnits = shortUnits
    data.short.satoshis = shortPayoutInSatoshis
    data.long.nominalUnits = longUnits
    data.long.satoshis = longPayoutInSatoshis

    data.short.assetChangePctg = Math.round((shortUnits / contract?.metadata?.nominalUnits) * 10000)
    data.short.bchChangePctg = Math.round((formatUnits(shortPayoutInSatoshis) / formatUnits(contract?.metadata?.shortInputInSatoshis)) * 10000)
    data.long.assetChangePctg = Math.round((longUnits / contract?.metadata?.longInputInOracleUnits) * 10000)
    data.long.bchChangePctg = Math.round((formatUnits(longPayoutInSatoshis) / formatUnits(contract?.metadata?.longInputInSatoshis)) * 10000)

    data.short.assetChangePctg = -(10000 - data.short.assetChangePctg) / 100
    data.short.bchChangePctg = -(10000 - data.short.bchChangePctg) / 100
    data.long.assetChangePctg = -(10000 - data.long.assetChangePctg) / 100
    data.long.bchChangePctg = -(10000 - data.long.bchChangePctg) / 100

    if (contract?.apiMetadata?.totalShortFundingSats) {
      data.summary.short.actualSatsChange = shortPayoutInSatoshis - contract.apiMetadata.totalShortFundingSats
      data.summary.short.assetChangePctg = data.short.assetChangePctg
    } else {
      data.summary.short = null
    }

    if (contract?.apiMetadata?.totalLongFundingSats) {
      data.summary.long.actualSatsChange = longPayoutInSatoshis - contract.apiMetadata.totalLongFundingSats
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
    startingOracleMessage: counterPartyInfo?.starting_oracle_message || counterPartyInfo?.price_oracle_message?.message,
    startingOracleSignature: counterPartyInfo?.starting_oracle_signature || counterPartyInfo?.price_oracle_message?.signature,
    oracleMessageSequence: counterPartyInfo?.oracle_message_sequence,
    settlementServiceFee: counterPartyInfo?.settlement_service_fee,
    settlementServiceFeeAddress: counterPartyInfo?.settlement_service_fee_address,
    calculatedShortSats: counterPartyInfo?.calculated_short_sats,
  }
}

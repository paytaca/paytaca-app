import { AnyHedgeManager } from '@generalprotocols/anyhedge'
import ago from 's-ago'

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
*/

/**
 * 
 * @param {Object} data 
 * @param {String} data.address - Address of hedge position contract
 * @param {String} data.anyhedge_contract_version - Version used for hedge contract
 * @param {Number} data.satoshis - Hedge value in satoshis
 * @param {Number} data.start_timestamp
 * @param {Number} data.maturity_timestamp
 * @param {String} data.hedge_address
 * @param {String} data.hedge_pubkey
 * @param {String} data.long_address
 * @param {String} data.long_pubkey
 * @param {String} data.oracle_pubkey
 * @param {Number} data.start_price
 * @param {Number} data.low_liquidation_multiplier
 * @param {Number} data.high_liquidation_multiplier
 * @param {String|null} data.funding_tx_hash
 * @param {{ address: String, satoshis: Number }} data.fee
 * @param {FundingProposalAPI|null} data.hedge_funding_proposal
 * @param {FundingProposalAPI|null} data.long_funding_proposal
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

  contractData.fundingTxHash = data.funding_tx_hash
  // contractData.fundingTxHash = 'bb743a47d81e8da85e2a0aebd03fd1be29d9703f23c0f431caf714c3e8588498'

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
  return contractData
}

export async function compileContract(contractCreationParameters, contractVersion) {
  const manager = new AnyHedgeManager({ contractVersion: contractVersion })
  const contractData = await manager.createContract(contractCreationParameters)
  return contractData
}

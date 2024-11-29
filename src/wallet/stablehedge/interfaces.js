
/**
 *
 * @typedef {import("@generalprotocols/anyhedge").ContractDataV2} ContractData
 * 
 * @typedef {Object} SettlementServiceSignature
 * @property {String} [short_signature]
 * @property {String} [long_signature]
 * @typedef {import("@generalprotocols/anyhedge").SettlementServiceConfiguration & SettlementServiceSignature} SettlementService
 * 
 * @typedef {Object} FundingAmounts
 * @property {Number} short
 * @property {Number} long
 * @property {Number} liquidity_fee
 * @property {Number} recalculate_after
 * @property {Number} settlement_service_fee
 * @property {Number} satoshis_to_fund
 * @property {Number} total_sats
 * 
 * 
 * @typedef {{sighash: String, signature: String, pubkey?: String}[]} SignatureData
 * @typedef {Object} MultiSigTx
 * @property {String} [txid]
 * @property {Number} locktime
 * @property {Boolean} [is_multisig]
 * @property {import("cashscript").Utxo[]} inputs
 * @property {import("cashscript").Output[]} outputs
 * @property {SignatureData} [sig1]
 * @property {SignatureData} [sig2]
 * @property {SignatureData} [sig3]
 * 
 * @typedef {Object} ShortProposalData
 * @property {ContractData} contract_data 
 * @property {SettlementService} settlement_service 
 * @property {FundingAmounts} funding_amounts
 * @property {MultiSigTx} [funding_utxo_tx]
 * 
 */

/** @type {ShortProposalData} */
export const ShortProposalData = {}

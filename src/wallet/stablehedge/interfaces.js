
/**
 * @typedef {Object} FiatTokenApiData
 * @property {String} category
 * @property {Number} genesis_supply
 * @property {Number} currency
 * @property {Number} decimals
 * 
 * 
 * @typedef {Object} RedemptionContractApiData
 * @property {String} address
 * @property {FiatTokenApiData} fiat_token
 * @property {String} auth_token_id
 * @property {String} price_oracle_pubkey
 * @property {String} [treasury_contract_address]
 * @property {Number | null} redeemable
 * @property {Number | null} reserve_supply
 * @property {Number} volume_24_hr
 * 
 * 
 * @typedef {Object} TreasuryContractApiData
 * @property {String} address
 * @property {String} auth_token_id
 * @property {String} pubkey1
 * @property {String} pubkey2
 * @property {String} pubkey3
 * @property {String} pubkey4
 * @property {String} pubkey5
 * @property {String} redemption_contract_address
 * @property {String} funding_wif_pubkey
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

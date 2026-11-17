import { hexToRef } from 'src/utils/reference-id-utils'
import { EliteTxType } from 'src/utils/engagementhub-utils/elite-program'

/**
 * Builds the OTC eligibility claim for a completed send, or `null` when the
 * send cannot earn cashback.
 *
 * Kept out of `send.vue` so the gates are testable under Node without mounting
 * the page. `isConsolidation` is supplied by the caller because it is decided
 * from the built transaction; every other gate is intrinsic to the send state.
 *
 * The recipient is the one whose `inputExtras` entry carries `merchantData`.
 * A single-recipient send without merchant data still claims -- the backend
 * verifies the merchant, so the client does not need to know it upfront.
 *
 * @param {Object} input
 * @param {Boolean} input.isChipnet - Testnet sends must never claim mainnet rewards.
 * @param {Boolean} input.isConsolidation - Own-wallet moves are not purchases.
 * @param {String} input.txid - Broadcast transaction id.
 * @param {String} input.assetId - Selected asset id; only `bch` earns cashback.
 * @param {Boolean} input.isNFT - NFT sends are not BCH spends.
 * @param {Array} [input.recipients] - Send recipients.
 * @param {Array} [input.inputExtras] - Per-recipient extras, parallel to recipients.
 * @param {String} [input.customerAddress] - Wallet address that made the spend.
 * @returns {Object|null} The claim body, or `null` when a gate rejects the send.
 */
export function buildEliteOtcClaim ({
  isChipnet,
  isConsolidation,
  txid,
  assetId,
  isNFT,
  recipients = [],
  inputExtras = [],
  customerAddress
} = {}) {
  if (isChipnet || isConsolidation || !txid || assetId !== 'bch' || isNFT) {
    return null
  }

  const merchantIndex = inputExtras.findIndex(extra => extra?.merchantData)
  const index = merchantIndex >= 0
    ? merchantIndex
    : (recipients.length === 1 ? 0 : -1)
  if (index < 0) return null

  const recipient = recipients[index]
  const bchSpent = Number(recipient?.amount)
  if (
    !customerAddress ||
    !recipient?.recipientAddress ||
    !Number.isFinite(bchSpent) ||
    bchSpent <= 0
  ) return null

  return {
    type: EliteTxType.OTC,
    customer_address: customerAddress,
    merchant_address: recipient.recipientAddress,
    bch_spent: bchSpent,
    ref_id: hexToRef(txid.substring(0, 6)),
    tx_id: txid
  }
}

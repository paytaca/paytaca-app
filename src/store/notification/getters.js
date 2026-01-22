export function types() {
  return Object.freeze({
    MAIN_TRANSACTION: 'transaction',
    PAYMENT_REQUEST: 'payment_request',
    ANYHEDGE_OFFER_SETTLED: 'anyhedge_offer_settled',
    ANYHEDGE_MATURED: 'anyhedge_matured',
    ANYHEDGE_CONTRACT_CANCELLED: 'anyhedge_contract_cancelled',
    ANYHEDGE_REQUIRE_FUNDING: 'anyhedge_require_funding',
    ANYHEDGE_MUTUAL_REDEMPTION_UPDATE: 'anyhedge_mutual_redemption_update',
    ANYHEDGE_MUTUAL_REDEMPTION_COMPLETE: 'anyhedge_mutual_redemption_complete',

    PENDING_ESCROW_SETTLEMENT_APPEAL: 'marketplace_pending_escrow_settlement_appeal',
    MARKETPLACE_ORDER_STATUS_UPDATE: 'marketplace_order_status_update',
    MARKETPLACE_ORDER_INCOMING_CALL: 'marketplace_order_incoming_call',
    MARKETPLACE_CHAT_UNREAD_MESSAGES: 'marketplace_chat_unread_messages'
  })
}

export function openedNotification(state) {
  return state?.openedNotification
}


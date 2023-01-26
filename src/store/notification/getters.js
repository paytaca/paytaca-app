export function types() {
  return {
    MAIN_TRANSACTION: 'transaction',
    SBCH_TRANSACTION: 'sbch_transaction',
    ANYHEDGE_OFFER_SETTLED: 'anyhedge_offer_settled',
    ANYHEDGE_MATURED: 'anyhedge_matured',
    ANYHEDGE_REQUIRE_FUNDING: 'anyhedge_require_funding',
    ANYHEDGE_MUTUAL_REDEMPTION_UPDATE: 'anyhedge_mutual_redemption_update',
    ANYHEDGE_MUTUAL_REDEMPTION_COMPLETE: 'anyhedge_mutual_redemption_complete',
  }
}

export function openedNotification(state) {
  return state?.openedNotification
}


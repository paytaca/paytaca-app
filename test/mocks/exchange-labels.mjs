const LABELS = {
  SBM: 'Submitted',
  CNF: 'Confirmed',
  ESCRW_PN: 'EscrowPending',
  ESCRW: 'Escrowed',
  PD_PN: 'PaidPending',
  PD: 'Paid',
  RLS: 'Released',
  RFN: 'Refunded',
  CNCL: 'Cancelled',
  APL: 'Appealed',
  RLS_PN: 'ReleasePending',
  RFN_PN: 'RefundPending',
}

export function formatOrderStatus (value) {
  return LABELS[value] || ''
}

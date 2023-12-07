export default function () {
  return {
    wallet: null,
    authHeaders: null,
    user: null,
    arbiter: null,
    itemsPerPage: 20,

    // store pagination
    storeBuyPageNumber: null,
    storeBuyTotalPages: null,
    storeBuyItemsCount: 0,
    storeBuyListings: [],

    storeSellPageNumber: null,
    storeSellTotalPages: null,
    storeSellItemsCount: 0,
    storeSellListings: [],

    // ads pagination
    adsBuyPageNumber: null,
    adsBuyTotalPages: null,
    adsBuyListings: [],

    adsSellPageNumber: null,
    adsSellTotalPages: null,
    adsSellListings: [],

    // orders pagination
    ongoingOrdersPageNumber: null,
    ongoingOrdersTotalPages: null,
    ongoingOrders: [],

    completedOrdersPageNumber: null,
    completedOrdersTotalPages: null,
    completedOrders: [],

    // appeals pagination
    pendingAppealsPageNumber: null,
    pendingAppealsTotalPages: null,
    pendingAppeals: [],

    resolvedAppealsPageNumber: null,
    resolvedAppealsTotalPages: null,
    resolvedAppeals: [],

    txids: {},

    // store filters
    storeBuyFilters: {
      price_order: 'descending',
      price_types: ['FIXED', 'FLOATING'],
      payment_types: [],
      time_limits: [5, 15, 30, 60, 300, 720, 1440]
    },
    storeSellFilters: {
      price_order: 'ascending',
      price_types: ['FIXED', 'FLOATING'],
      payment_types: [],
      time_limits: [5, 15, 30, 60, 300, 720, 1440]
    },
    paymentTypes: [],
    ongoingOrderFilters: {
      sort_type: 'ascending',
      sort_by: 'created_at',
      status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'RLS_PN', 'RFN_PN'],
      payment_types: [],
      time_limits: [5, 15, 30, 60, 300, 720, 1440],
      ownership: {
        owned: true,
        notOwned: true
      }
    },
    completedOrderFilters: {
      sort_type: 'descending',
      sort_by: 'resolved_at',
      status: ['CNCL', 'RLS', 'RFN'],
      payment_types: [],
      time_limits: [5, 15, 30, 60, 300, 720, 1440],
      ownership: {
        owned: true,
        notOwned: true
      }
    }
  }
}

export default function () {
  return {
    wallet: null,
    user: null,
    chatIdentity: {},
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

    // cashin orders

    // appeals pagination
    pendingAppealsPageNumber: null,
    pendingAppealsTotalPages: null,
    pendingAppeals: [],

    resolvedAppealsPageNumber: null,
    resolvedAppealsTotalPages: null,
    resolvedAppeals: [],

    txids: {},

    // store filters
    storeBuyFilters: {},
    storeSellFilters: {},
    paymentTypes: {},
    ongoingOrderFilters: {
      sort_type: 'descending',
      sort_by: 'created_at',
      status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
      appealable: true,
      not_appealable: true,
      payment_types: [],
      time_limits: [15, 30, 45, 60],
      ownership: {
        owned: true,
        notOwned: true
      },
      trade_type: {
        buy: true,
        sell: true
      }
    },
    completedOrderFilters: {
      sort_type: 'descending',
      sort_by: 'last_modified_at',
      status: ['CNCL', 'RLS', 'RFN'],
      appealable: true,
      not_appealable: true,
      payment_types: [],
      time_limits: [15, 30, 45, 60],
      ownership: {
        owned: true,
        notOwned: true
      },
      trade_type: {
        buy: true,
        sell: true
      }
    },
    migrateStoreOrderFilters: true,
    ordersCurrency: 'All',

    storeListingTab: 'SELL',
    adListingTab: 'BUY',
    orderListingTab: 'ONGOING',
    appealListingTab: 'PENDING',

    cashinOrderList: [],
    cashinOrderListPage: 1,
    cashinOrderListTotalPage: 1,

    showAdLimitMessage: true,
    featureToggles: null
  }
}

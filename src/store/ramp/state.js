export default function () {
  return {
    user: null,
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
    completedOrders: []
  }
}
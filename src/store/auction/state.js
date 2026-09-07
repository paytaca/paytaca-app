export default function () {
  return {    
    // Option Types
    auctionTypeOptions: ['English', 'Dutch', 'All'],
    lotTypeOptions: ['Physical', 'Digital', 'All'],

    // Index Page States
    auctionTypeIndex: 'All',
    auctionQueryIndex: '',
    listings: [],
    listingsLastFetched: 0,
    
    // Activity Page States
    activityType: 'My Bids',
    auctionTypeActivity: 'All',
    auctionQueryActivity: '',
    lotTypeActivity: 'All',
    lotQueryActivity: '',
    myBiddings: [],
    myAuctions: [],

    // Auction Details Page States
    auctionLots: [],
    auctionLotsLastFetched: 0,

    // Lot Details Page States
    lotData: {},
    lotDataLastFetched: 0,

    // Arbiter and Servicer Public Key States
    arbiterPublicKey: '',
    servicerPublicKey: '',

    // User Details States
    username: '',
    isArbiter: false,

    // Error-related States
    hasNetworkError: false,
  }
}
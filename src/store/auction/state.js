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
    myBiddingsLastFetched: 0,
    myAuctions: [],
    myAuctionsLastFetched: 0,

    // Auction Details Page States
    auctionId: null,
    auctionData: {},
    auctionLots: [],
    auctionLotsLastFetched: 0,
    lotTypeAuction: 'All' ,

    // Lot Details Page States
    lotId: null,
    lotData: {},
    lotImages: [],
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
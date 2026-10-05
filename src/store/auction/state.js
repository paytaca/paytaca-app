export default function () {
  return {    
    // Option Types
    auctionTypeOptions: ['English', 'Dutch', 'All'],
    lotCategoryOptions: ['Physical', 'Digital', 'All'],

    // Index Page States
    auctionTypeIndex: 'All',
    auctionQueryIndex: '',
    listings: [],
    listingsLastFetched: 0,
    
    // Activity Page States
    activityType: 'My Bids',
    auctionTypeActivity: 'All',
    auctionQueryActivity: '',
    lotCategoryActivity: 'All',
    lotQueryActivity: '',
    myBiddings: [],
    myBiddingsLastFetched: 0,
    myAuctions: [],
    myAuctionsLastFetched: 0,

    // Auction Details Page States
    auctionData: {},
    auctionDataLastFetched: 0,
    auctionLots: [],
    auctionLotsImages: [],
    auctionLotsLastFetched: 0,
    auctionLotCategory: 'All' ,

    // Lot Details Page States
    lotData: {},
    lotImages: [],
    lotDataLastFetched: 0,
    lotBids: [],
    lotBidsLastFetched: 0,
    highestBid: {},
    highestBidLastFetched: 0,
    deliveryData: {},
    deliveryDataLastFetched: 0,
    disputeData: {},
    disputeDataLastFetched: 0,

    // Arbiter and Servicer Public Key States
    arbiterPublicKey: '',
    arbiterLastFetched: 0,
    servicerPublicKey: '',
    servicerLastFetched: 0,

    // User Details States
    username: '',
    isArbiter: false,

    // Error-related States
    hasNetworkError: false,
  }
}
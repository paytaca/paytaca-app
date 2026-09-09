import { lotId } from "./getters";

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
    myAuctonsLastFetched: 0,

    // Auction Details Page States
    auctionId: null,
    auctionLots: [],
    auctionLotsLastFetched: 0,

    // Lot Details Page States
    lotId: null,
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
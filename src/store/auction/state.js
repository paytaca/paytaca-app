export default function () {
  return {
    listings: [],
    myBiddings: [],
    myAuctions: [],
    auctionTypeOptions: ['English', 'Dutch', 'All'],
    auctionTypeIndex: 'All',
    auctionTypeActivity: 'All',
    auctionQueryIndex: '',
    auctionQueryActivity: '',
    lotTypeOptions: ['Physical', 'Digital', 'All'],
    lotTypeActivity: 'All',
    lotQueryActivity: '',
    activityType: 'My Biddings',
    arbiterPublicKey: '',
    servicerPublicKey: '',
    username: '',
    isArbiter: false,
    hasNetworkError: false,
  }
}
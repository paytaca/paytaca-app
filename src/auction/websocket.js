const APIURL = new URL(process.env.AUCTION_HUB_API)

// change ws to ws if listening to HTTPS not HTTP
export function callIndexAuctionWebsocket(){
  return new WebSocket(`wss://${APIURL.hostname}/ws/all-auctions/`) 
}

export function callActivityWebsocket(username){
  return new WebSocket(`wss://${APIURL.hostname}/ws/activity/${username}/`) 
}

export function callAuctionWebsocket(auctionId){
  return new WebSocket(`wss://${APIURL.hostname}/ws/auction/${auctionId}/`) 
}

export function callLotWebsocket(lotId){
  return new WebSocket(`wss://${APIURL.hostname}/ws/lot/${lotId}/`)   
}

export function callRefundCountdownWebsocket(deliveryTrackingId){
  return new WebSocket(`wss://${APIURL.hostname}/ws/refund-countdown/${deliveryTrackingId}/`) 
} 
const APIURL = new URL(process.env.AUCTION_HUB_API)

// change ws to ws if listening to HTTPS not HTTP
export function callIndexAuctionWebsocket(){
  return new WebSocket(`ws://${APIURL.hostname}:8000/ws/index/`) 
}

export function callActivityWebsocket(username){
  return new WebSocket(`ws://${APIURL.hostname}:8000/ws/activity/${username}/`) 
}

export function callAuctionWebsocket(auctionId){
  return new WebSocket(`ws://${APIURL.hostname}:8000/ws/auction/${auctionId}/`) 
}

export function callLotWebsocket(lotId){
  return new WebSocket(`ws://${APIURL.hostname}:8000/ws/lot/${lotId}/`)   
}

export function callRefundCountdownWebsocket(deliveryTrackingId){
  return new WebSocket(`ws://${APIURL.hostname}:8000/ws/refund-countdown/${deliveryTrackingId}/`) 
} 
export function callIndexAuctionWebsocket(){
  return new WebSocket(`ws://localhost:8000/ws/all-auctions/`) 
}

export function callActivityWebsocket(username){
  return new WebSocket(`ws://localhost:8000/ws/activity/${username}/`) 
}

export function callAuctionWebsocket(auctionId){
  return new WebSocket(`ws://localhost:8000/ws/auction/${auctionId}/`) 
}

export function callLotWebsocket(lotId){
  return new WebSocket(`ws://localhost:8000/ws/lot/${lotId}/`)   
}

export function callRefundCountdownWebsocket(deliveryTrackingId){
  return new WebSocket(`ws://localhost:8000/ws/refund-countdown/${deliveryTrackingId}/`) 
}
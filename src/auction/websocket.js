export function callAuctionWebsocket(auctionId){
  return new WebSocket(`ws://localhost:8000/ws/auction/${auctionId}/`) 
}

export function callLotWebsocket(lotId){
  return new WebSocket(`ws://localhost:8000/ws/lot/${lotId}/`)   
}

export function callRefundCountdownWebsocket(deliveryTrackingId){
  return new WebSocket(`ws://localhost:8000/ws/refund-countdown/${deliveryTrackingId}/`) 
}
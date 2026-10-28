import { getAuthHeaders } from './bch-oauth'

const APIURL = new URL(process.env.AUCTION_HUB_API)
const websocketURL = (path) => {
  const protocol = APIURL.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${APIURL.host}/ws/${path}/`
}

// Opens the auction index websocket.
export function callIndexAuctionWebsocket(){
  return new WebSocket(websocketURL('index'))
}

// Opens the current user’s auction activity websocket.
export function callActivityWebsocket(username){
  return new WebSocket(websocketURL(`activity/${encodeURIComponent(username)}`))
}

// Opens the websocket for an auction.
export function callAuctionWebsocket(auctionId){
  return new WebSocket(websocketURL(`auction/${auctionId}`))
}

// Opens the websocket for a lot.
// NEEDS TO SEND ACCESS TOKEN TO PREVENT WEBSOCKET DISCONNECTIONS
export function callLotWebsocket(lotId){
  return getAuthHeaders().then(headers => new WebSocket(
    websocketURL(`lot/${lotId}`),
    [`bch-oauth.${headers.Authorization?.replace('Bearer ', '') || ''}`]
  ))
}

// Opens the refund countdown websocket for a delivery tracking record.
export function callRefundCountdownWebsocket(deliveryTrackingId){
  return new WebSocket(websocketURL(`refund-countdown/${encodeURIComponent(deliveryTrackingId)}`))
}

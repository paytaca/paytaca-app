const APIURL = new URL(process.env.AUCTION_HUB_API)
const websocketURL = (path) => {
  const protocol = APIURL.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${APIURL.host}/ws/${path}/`
}

export function callIndexAuctionWebsocket(){
  return new WebSocket(websocketURL('index'))
}

export function callActivityWebsocket(username){
  return new WebSocket(websocketURL(`activity/${encodeURIComponent(username)}`))
}

export function callAuctionWebsocket(auctionId){
  return new WebSocket(websocketURL(`auction/${auctionId}`))
}

export function callLotWebsocket(lotId){
  return new WebSocket(websocketURL(`lot/${lotId}`))
}

export function callRefundCountdownWebsocket(deliveryTrackingId){
  return new WebSocket(websocketURL(`refund-countdown/${encodeURIComponent(deliveryTrackingId)}`))
}

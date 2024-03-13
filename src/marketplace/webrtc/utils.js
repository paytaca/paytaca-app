export function isValidRoomName(roomName='') {
  return Boolean(roomName) && /([\w+]-?)+/.test(roomName)
}

/**
 * @param {RTCPeerConnection} peer 
 * @param {MediaStream} mediaStream 
 */
export function setOnTrack(peer, mediaStream) {
  peer.addEventListener('track', async (event) => {
    mediaStream.addTrack(event.track, mediaStream)
  })
}

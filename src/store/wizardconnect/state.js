export default function () {
  return {
    connections: {},
    pendingRequests: [],
    cancelledKeys: [],
    processedKeys: [],
    bufferCheckInterval: null,
    bufferCheckTimeout: null
  }
}

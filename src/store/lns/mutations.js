/**
 *
 * @param {Object} state vuex module state
 * @param {{name: String, coinType: Number: address: String}} data
 * @see {@link https://eips.ethereum.org/EIPS/eip-2304} for data.coinType
 */
export function setNodeAddress (state, data) {
  if (!state.nodeAddressMap) state.nodeAddressMap = {}
  if (!state.nodeAddressMap[data.name]) state.nodeAddressMap[data.name] = {}

  state.nodeAddressMap[data.name][data.coinType] = data.address
}

export function removeNode (state, name = '') {
  if (!name) return
  if (!state.nodeAddressMap) return
  if (!state.nodeAddressMap[name]) return
  state.nodeAddressMap[name] = null
}

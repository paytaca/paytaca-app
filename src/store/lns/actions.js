import { resolveName as _resolveName, resolveAddress as _resolveAddress } from '../../wallet/lns'

/**
 * 
 * @param {Object} context 
 * @param {{name: String, coinType: Number, ignoreCache: Boolean}} param1 
 * @returns {{address: String|null, _cache:Boolean }}
 * @see {@link https://eips.ethereum.org/EIPS/eip-2304#address-encoding} for coinType
 */
export async function resolveName(context, {name, coinType=60, ignoreCache=false}) {
  if (!coinType && coinType !== 0)  coinType = 60

  if (!ignoreCache && context.state.nodeAddressMap && context.state.nodeAddressMap[name] && context.state.nodeAddressMap[name][coinType]) {
    return {
      _cache: true,
      address: context.state.nodeAddressMap[name][coinType],
    }
  }

  const address = await _resolveName(name, coinType)
  if (address) context.commit('setNodeAddress', { name, coinType, address })
  return {
    _cache: false,
    address,
  }
}

/**
 * 
 * @param {Object} context 
 * @param {{address: String, ignoreCache: Boolean}} param1 
 */
export async function resolveAddress(context, { address, ignoreCache=false}) {
  if (!ignoreCache && context.state.nodeAddressMap) {
    for (var _name in context.state.nodeAddressMap) {
      if (!context.state.nodeAddressMap[_name]) continue
      if (context.state.nodeAddressMap[_name][60] !== address) continue // coinType for eth is 60

      return { _cache: true, name: _name }
    }
  }

  const name = await _resolveAddress(address)
  if (address) context.commit('setNodeAddress', { name, coinType: 60, address })
  return { _cache: false, name }
}

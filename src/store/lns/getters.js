export function resolveAddress (state) {
  return (address, coinType = 60) => {
    if (!address) return ''
    if (!state.nodeAddressMap) return ''
    const parsedAddress = String(address).toLowerCase()
    for (const name in state.nodeAddressMap) {
      if (!name.nodeAddressMap[name]) continue
      if (String(name.nodeAddressMap[name][coinType]).toLowerCase() !== parsedAddress) return ''

      return name
    }

    return ''
  }
}

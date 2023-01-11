export function getIdentity (state) {
  return function (address) {
    return state.identities[address]
  }
}

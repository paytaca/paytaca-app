// `src/wallet/lookup-key.js` talks to Watchtower through `src/wallet/pos`, which
// pulls in the wallet, bitauth, and axios stack. The lookup-key spec only needs
// the two calls it makes, so expose them as mutable stubs.

const NOT_STUBBED = (method) => async () => {
  throw new Error(`pos mock: ${method} is not stubbed`)
}

export const backend = {
  post: NOT_STUBBED('backend.post'),
  delete: NOT_STUBBED('backend.delete'),
}

export const authToken = {
  get: async () => null,
  generate: async () => null,
}

export function resetPosMock () {
  backend.post = NOT_STUBBED('backend.post')
  backend.delete = NOT_STUBBED('backend.delete')
  authToken.get = async () => null
  authToken.generate = async () => null
}

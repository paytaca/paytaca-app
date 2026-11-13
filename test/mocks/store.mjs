// `src/store/nostr-chat/mls-mutations.js` reaches for the active wallet hash
// through the Vuex singleton. Stand it in for unit tests so the pure mutation
// logic can run under Node without booting the app store.
export const Store = {
  getters: {
    'global/getWallet': () => ({ walletHash: 'test-wallet' }),
  },
}

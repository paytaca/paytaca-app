import { boot } from 'quasar/wrappers'
import { Store } from 'src/store'

export default boot(() => {
  const store = Store

  // Initialize Nostr relay subscription on app startup so the unread message
  // counter badge (apps hub tile, home page footer) is live without requiring
  // the user to first navigate to the chat page.
  //
  // Fire-and-forget: if the wallet is not yet ready (first-run onboarding), the
  // initializer silently fails and the chat pages will re-initialize when the
  // user opens them.
  store.dispatch('nostrChat/ensureSubscribed').catch(() => {
    // Wallet not ready — chat pages will init when navigated to
  })
})

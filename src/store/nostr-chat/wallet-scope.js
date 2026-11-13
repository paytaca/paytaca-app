// Wallet epoch guard for chat async work.
//
// Chat work is dispatched from long-lived callbacks: relay subscriptions,
// gift-wrap history/pull fetches, the active-status WebSocket, and read-receipt
// publishes. Those callbacks outlive the wallet they were started for, and the
// store resolves its per-wallet chat state from the *currently active* wallet
// hash at commit time. So a fetch or subscription opened for wallet A that
// resolves after the user switches to wallet B writes A's rooms, messages and
// block list into B's state: conversations and senders belonging to another
// wallet's Nostr identity show up in the active wallet.
//
// Bumping the epoch on every wallet switch and re-checking it after each await
// (or on every callback firing) drops that stale work instead of misfiling it.
export function createWalletScopeTracker (getActiveWalletHash, onBump = () => {}) {
  let epoch = 0

  return {
    // Invalidate every scope captured before this call. Returns the epoch so
    // callers can assert ordering in tests.
    bump () {
      epoch++
      onBump()
      return epoch
    },

    // Snapshot the wallet an async operation belongs to; the predicate must be
    // re-checked after every await and before every commit. `null` means the
    // operation started with no active wallet and cannot be attributed, so it
    // is treated as stale.
    capture () {
      const walletHash = getActiveWalletHash()
      if (!walletHash) return null
      const capturedEpoch = epoch
      return () => capturedEpoch === epoch && getActiveWalletHash() === walletHash
    },
  }
}

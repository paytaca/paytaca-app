export const ACTIVE_THRESHOLD_MS = 180000

export function getInitialWalletState () {
  return {
    // Identity (per-wallet; sensitive — derived from mnemonic)
    keys: {
      npub: null,
      nsec: null,
      pubKeyHex: null,
      privKeyHex: null,
    },

    // Conversations (per-wallet)
    // Active rooms cache (minimal fields: id, type, name, members, subject, updatedAt)
    // The full room list is stored server-side; this is a lightweight cache for the UI.
    rooms: [],
    // Server-backed block list caches (re-fetched on init)
    blockedContacts: [],
    // Server-backed deleted room IDs cache (re-fetched on init)
    deletedRooms: [],
    messages: {},
    // Newest known message timestamp (unix seconds). Persisted (unlike
    // `messages` itself) so subscribeToRelays can still compute a `since`
    // filter instead of re-downloading the whole gift-wrap history on every
    // app start.
    newestMessageAt: 0,
    readReceipts: {},
    readMessageIds: {},
    messageReadBy: {},
    reactions: {},

    // Ephemeral typing indicators: { [roomId]: { [pubKeyHex]: timestamp } }
    // Not persisted — auto-expires after 5s of no new typing events.
    typing: {},

    // Contact caches keyed by remote pubkey (per-wallet identity lookups)
    bchAddressCache: {},
    displayNameCache: {},
    avatarCache: {},

    // Own published profile (per-wallet)
    profile: {
      bchAddress: null,
      publishedAt: null,
      displayName: null,
      displayNamePublishedAt: null,
      avatar: null,
      avatarPublishedAt: null,
    },

    // Runtime/connection state for this identity
    isReady: false,
    initialized: false,
    isSubscribed: false,
    relayStatus: {},
    showActiveStatus: true,

    // MLS group chat state (per-wallet)
    mls: {
      ready: false,
      keyPackage: null, // { serialized, credentialIdentity, publishedAt }
      groupStates: {}, // { [mlsGroupIdHex]: serialized ClientState }
      roomMlsMap: {}, // { [roomId]: mlsGroupIdHex }
      roomMlsNostrMap: {}, // { [roomId]: nostrGroupIdHex } — NIP-EE public group id used in kind-445 h tags
      pendingInvitations: {}, // { [roomId]: { roomId, inviterPubKey, name, nostrGroupIdHex, welcomeEvent, welcomeRumor } }
      declinedWelcomeIds: {}, // { [welcomeEventId]: timestamp } — never re-surface these invites
      handledWelcomeIds: {}, // { [welcomeRumorId]: timestamp } — accepted welcomes; never re-surface these invites
      failedEventAttempts: {}, // { [eventId]: { count, lastError, lastAttemptAt } } — undecodable MLS events; dropped after MAX_EVENT_PROCESS_ATTEMPTS
      processedEventIds: {}, // { [mlsGroupIdHex]: { [eventId]: timestamp } } — events whose ratchet was already consumed (messages, edits, meta, commits); re-delivery is a no-op
      pendingInvitees: {}, // { [mlsGroupIdHex]: { [memberPubKeyHex]: timestamp } } — invited but not yet accepted; MLS adds land in the tree immediately, so this is the only invited-vs-joined signal
      kpHistory: [], // { ref: string, encoded: string (base64 raw KP bytes), publishedAt: number }
    },
  }
}

export default function () {
  return {
    byWallet: {},

    // Global (shared across wallets)
    relays: [
      'wss://relay.paytaca.com',
    ],
    contacts: [],
    activeStatus: {},
  }
}

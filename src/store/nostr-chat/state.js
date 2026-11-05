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
    // Room cache (minimal fields: id, type, name, members, subject, updatedAt).
    // Persisted so the chat list paints on first paint instead of waiting for
    // the server fetch; SET_ROOMS merges the server's authoritative list into it.
    rooms: [],
    // True once a room-list fetch has finished for this wallet in this session.
    // Session-only (never persisted): tells the UI whether an empty `rooms`
    // means "still loading" (skeletons) or "no chats yet".
    roomsLoaded: false,
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
    // Messages the user removed from this device ("Delete for me"):
    // { [roomId]: { [messageId]: timestamp } }. Persisted, and filtered out of
    // every read path (timeline, previews, unread counts) so a relay refetch or
    // history replay cannot resurrect a hidden message.
    hiddenMessageIds: {},

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
      joinedMembers: {}, // { [mlsGroupIdHex]: { [memberPubKeyHex]: timestamp } } — wire proof of acceptance (any message, join announce, or self); a member in here is never marked pending again
      kpHistory: [], // { content: string (hex serialized KP), publishedAt: number } — recent KPs, newest first; joined with relay-fetched KPs as { kp, ref } candidates
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

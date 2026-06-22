export default function () {
  return {
    keys: {
      npub: null,
      nsec: null,
      pubKeyHex: null,
      privKeyHex: null,
    },
    relays: [
      'wss://relay.paytaca.com',
    ],
    contacts: [],
    rooms: [],
    blockedContacts: [], // Hex pubkeys of blocked contacts — prevents room auto-creation
    messages: {},
    readReceipts: {}, // { roomId: { pubKeyHex: timestamp } }
    readMessageIds: {}, // { roomId: { msgId: true, ... } }
    messageReadBy: {}, // { roomId: { msgId: { [readerPubKey]: true } } }
    reactions: {}, // { roomId: { messageId: [ { emoji, reactorPubKey } ] } }
    isReady: false,
    initialized: false,
    isSubscribed: false,
    relayStatus: {},
    bchAddressCache: {}, // { [pubKeyHex]: { address, fetchedAt } }
    profile: {
      bchAddress: null,
      publishedAt: null,
      displayName: null,
      displayNamePublishedAt: null,
      avatar: null,
      avatarPublishedAt: null,
    },
  }
}

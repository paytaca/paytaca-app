export default function () {
  return {
    keys: {
      npub: null,
      nsec: null,
      pubKeyHex: null,
      privKeyHex: null,
    },
    relays: [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.bg',
    ],
    contacts: [],
    rooms: [],
    messages: {},
    isReady: false,
    initialized: false,
    relayStatus: {},
  }
}

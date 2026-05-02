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
    messages: {},
    readReceipts: {}, // { roomId: { pubKeyHex: timestamp } }
    isReady: false,
    initialized: false,
    relayStatus: {},
  }
}

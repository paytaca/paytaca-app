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
    readMessageIds: {}, // { roomId: { msgId: true, ... } }
    messageReadBy: {}, // { roomId: { msgId: { [readerPubKey]: true } } }
    isReady: false,
    initialized: false,
    relayStatus: {},
  }
}

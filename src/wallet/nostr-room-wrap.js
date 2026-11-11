import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools'
import { nip44, nip59 } from 'nostr-tools'

// Outer gift-wrap tag carrying the opaque room push token. The relay watcher
// uses it to attribute a NIP-17 gift-wrap to a conversation without the relay
// learning the room id or its members.
export const ROOM_PUSH_TOKEN_TAG = 'paytaca-room'

const TWO_DAYS = 2 * 24 * 60 * 60

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function createRoomGiftWrap(seal, recipientPubKey, extraTags = []) {
  const randomKey = generateSecretKey()
  const conversationKey = nip44.getConversationKey(randomKey, recipientPubKey)
  return finalizeEvent({
    kind: 1059,
    content: nip44.encrypt(JSON.stringify(seal), conversationKey),
    // NIP-59 recommends a randomized past timestamp so relay traffic does not
    // reveal when messages are actually sent.
    created_at: Math.round(Date.now() / 1000 - Math.random() * TWO_DAYS),
    tags: [['p', recipientPubKey], ...extraTags],
  }, randomKey)
}

/**
 * Wrap an event for every recipient, adding the room push token to the outer
 * gift-wrap. The token has to be present before the wrap is signed, so this
 * replaces nip59.wrapManyEvents for room messages instead of mutating signed
 * events afterwards.
 *
 * @param {import('nostr-tools').UnsignedEvent} event
 * @param {string} senderPrivKey - hex private key
 * @param {string[]} recipientPubKeys - recipient pubkeys
 * @param {string} [roomPushToken] - opaque token from the room list API
 * @returns {import('nostr-tools').NostrEvent[]}
 */
export function wrapManyEventsForRoom(event, senderPrivKey, recipientPubKeys, roomPushToken) {
  if (!recipientPubKeys || recipientPubKeys.length === 0) {
    throw new Error('At least one recipient is required.')
  }

  const senderPrivKeyBytes = hexToBytes(senderPrivKey)
  const senderPubKey = getPublicKey(senderPrivKeyBytes)
  const rumor = nip59.createRumor(event, senderPrivKeyBytes)

  return [senderPubKey, ...recipientPubKeys].map(recipientPubKey => {
    const seal = nip59.createSeal(rumor, senderPrivKeyBytes, recipientPubKey)
    const tags = []
    if (recipientPubKey === senderPubKey) tags.push(['self'])
    if (roomPushToken) tags.push([ROOM_PUSH_TOKEN_TAG, roomPushToken])
    return createRoomGiftWrap(seal, recipientPubKey, tags)
  })
}

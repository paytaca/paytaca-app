/**
 * Nostr crypto utilities for Paytaca Chat.
 * Derives Nostr identity from BCH wallet mnemonic (NIP-06)
 * and provides NIP-17 gift-wrap/unwrap primitives.
 */

import { mnemonicToSeedSync } from 'bip39'
import {
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
} from 'bitauth-libauth-v3'
import {
  getPublicKey,
  getEventHash,
  finalizeEvent,
  generateSecretKey,
} from 'nostr-tools'
import { nip44 } from 'nostr-tools'
import { nip59 } from 'nostr-tools'
import { nsecEncode, npubEncode } from 'nostr-tools/nip19'
import { sha256 } from 'js-sha256'

const NOSTR_DERIVATION_PATH = "m/44'/1237'/0'/0/0"

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Derive the Nostr nsec/npub from a BIP39 mnemonic using NIP-06 path.
 * @param {string} mnemonic - 12-word BIP39 seed phrase
 * @returns {{ privKeyHex: string, pubKeyHex: string, nsec: string, npub: string }}
 */
export function deriveNostrKeys(mnemonic) {
  const seed = new Uint8Array(mnemonicToSeedSync(mnemonic))
  const masterNode = deriveHdPrivateNodeFromSeed(seed)
  const nostrNode = deriveHdPath(masterNode, NOSTR_DERIVATION_PATH)
  if (typeof nostrNode === 'string') throw new Error(nostrNode)

  const privKeyBytes = nostrNode.privateKey
  const privKeyHex = binToHex(privKeyBytes)
  const pubKeyHex = getPublicKey(privKeyBytes)
  const nsec = nsecEncode(privKeyBytes)
  const npub = npubEncode(pubKeyHex)

  return { privKeyHex, pubKeyHex, nsec, npub }
}

/**
 * Create an unsigned kind:14 chat message (rumor).
 * @param {Object} opts
 * @param {string} opts.content - Plain text message
 * @param {string} opts.senderPubKey - Hex pubkey of sender
 * @param {string[]} opts.members - All room member pubkeys (including sender)
 * @param {string} [opts.subject] - Optional conversation subject. Pass an empty string to clear an existing subject.
 * @param {string} [opts.replyTo] - Optional kind:14 id being replied to
 * @param {string} [opts.editOf] - Optional kind:14 id being edited
 * @returns {import('nostr-tools').Rumor}
 */
export function createUnsignedKind14({ content, senderPubKey, members, subject, replyTo, editOf }) {
  const tags = []
  for (const member of members) {
    if (member !== senderPubKey) {
      tags.push(['p', member])
    }
  }
  if (subject !== undefined && subject !== null) tags.push(['subject', subject])
  if (replyTo) tags.push(['e', replyTo])
  if (editOf) tags.push(['edit', editOf])

  const event = {
    kind: 14,
    pubkey: senderPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags,
  }
  event.id = getEventHash(event)
  return event
}

/**
 * Create NIP-17 gift-wraps for every room member.
 * Uses nostr-tools nip59.wrapManyEvents internally.
 * @param {import('nostr-tools').UnsignedEvent} unsignedKind14
 * @param {string} senderPrivKey - Hex private key of sender
 * @param {string[]} receiverPubKeys - All member pubkeys to send to
 * @returns {Promise<import('nostr-tools').NostrEvent[]>}
 */
export async function createNip17GiftWraps(unsignedKind14, senderPrivKey, receiverPubKeys) {
  const senderPrivKeyBytes = hexToBytes(senderPrivKey)
  const giftWraps = nip59.wrapManyEvents(unsignedKind14, senderPrivKeyBytes, receiverPubKeys)
  return giftWraps
}

/**
 * Unwrap a kind:1059 gift-wrap back to the unsigned kind:14 rumor.
 * Verifies that the seal pubkey matches the inner rumor pubkey.
 * @param {import('nostr-tools').NostrEvent} giftWrap
 * @param {string} receiverPrivKey - Hex private key of recipient
 * @returns {{ rumor: import('nostr-tools').Rumor, sealPubkey: string }}
 */
export function unwrapGiftWrap(giftWrap, receiverPrivKey) {
  const receiverPrivKeyBytes = hexToBytes(receiverPrivKey)
  const rumor = nip59.unwrapEvent(giftWrap, receiverPrivKeyBytes)
  // nip59.unwrapEvent verifies the seal pubkey against the rumor pubkey internally.
  // The returned rumor.pubkey is the verified seal pubkey.
  return { rumor, sealPubkey: rumor.pubkey }
}

/**
 * Create a Kind 7 "seen" reaction (read receipt) and gift-wrap it to the original sender.
 * Uses NIP-59 gift-wrap for privacy.
 * @param {Object} opts
 * @param {string} opts.messageId - Event ID of the message being read
 * @param {string} opts.senderPubKey - Hex pubkey of the original message sender
 * @param {string} opts.receiverPubKey - Hex pubkey of the reader (us)
 * @param {string} opts.receiverPrivKey - Hex private key of the reader (us)
 * @param {string} [opts.relayHint] - Optional relay hint
 * @returns {Promise<import('nostr-tools').NostrEvent>} - Gift-wrapped Kind 7 event
 */
export async function createReactionGiftWraps({ messageId, senderPubKey, recipientPubKeys, emoji, reactorPubKey, reactorPrivKey, relayHint = '' }) {
  const kind7 = {
    kind: 7,
    pubkey: reactorPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: emoji,
    tags: [
      ['e', messageId, relayHint, senderPubKey],
      ['p', senderPubKey, relayHint],
      ['k', '14'],
    ],
  }
  kind7.id = getEventHash(kind7)

  const reactorPrivKeyBytes = hexToBytes(reactorPrivKey)
  const giftWraps = nip59.wrapManyEvents(kind7, reactorPrivKeyBytes, recipientPubKeys)
  return giftWraps
}

export async function createReadReceiptGiftWrap({ messageId, senderPubKey, receiverPubKey, receiverPrivKey, relayHint = '' }) {
  const kind7 = {
    kind: 7,
    pubkey: receiverPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: '👀',
    tags: [
      ['e', messageId, relayHint, senderPubKey],
      ['p', senderPubKey, relayHint],
      ['k', '14'],
    ],
  }
  kind7.id = getEventHash(kind7)

  const privKeyBytes = hexToBytes(receiverPrivKey)
  const TWO_DAYS = 2 * 24 * 60 * 60
  const randomStamp = () => Math.round(Date.now() / 1000 - Math.random() * TWO_DAYS)

  const seal = nip59.createSeal(kind7, privKeyBytes, senderPubKey)

  const randomKey = generateSecretKey()
  const conversationKey = nip44.getConversationKey(randomKey, senderPubKey)
  const giftWrap = finalizeEvent({
    kind: 1059,
    content: nip44.encrypt(JSON.stringify(seal), conversationKey),
    created_at: randomStamp(),
    tags: [
      ['p', senderPubKey],
      ['nonotif', 'read-receipt'],
    ],
  }, randomKey)

  return giftWrap
}

/**
 * Create a kind:5 deletion event and gift-wrap it to all room members.
 * @param {Object} opts
 * @param {string} opts.messageId - Event ID of the message being deleted
 * @param {string} opts.senderPubKey - Hex pubkey of the original message sender
 * @param {string[]} opts.members - All room member pubkeys to send the deletion to
 * @param {string} opts.senderPrivKey - Hex private key of the deleter
 * @returns {Promise<import('nostr-tools').NostrEvent[]>} - Gift-wrapped kind:5 events
 */
export async function createKind5DeletionGiftWraps({ messageId, senderPubKey, members, senderPrivKey }) {
  const kind5 = {
    kind: 5,
    pubkey: senderPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      ['e', messageId],
      ['k', '14'],
    ],
  }
  kind5.id = getEventHash(kind5)

  const senderPrivKeyBytes = hexToBytes(senderPrivKey)
  const giftWraps = nip59.wrapManyEvents(kind5, senderPrivKeyBytes, members)
  return giftWraps
}

/**
 * Create and sign a kind:10050 relay preference event.
 * @param {string[]} relays - Array of relay URLs
 * @param {string} privKey - Hex private key
 * @returns {import('nostr-tools').VerifiedEvent}
 */
export function createKind10050(relays, privKey) {
  const tags = relays.map(url => ['relay', url])
  const event = {
    kind: 10050,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  }
  const privKeyBytes = hexToBytes(privKey)
  return finalizeEvent(event, privKeyBytes)
}

/**
 * Compute a deterministic room ID from a set of pubkeys.
 * Sorts pubkeys before hashing for consistency.
 * @param {string[]} pubkeys - Array of hex pubkeys
 * @returns {string} - Hex sha256 hash
 */
export function computeRoomId(pubkeys) {
  const sorted = pubkeys.slice().sort()
  const hashInput = sorted.join(',')
  return sha256(hashInput)
}

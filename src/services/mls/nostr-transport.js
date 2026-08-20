import { encodeMlsMessage } from 'ts-mls'

export const MLS_EVENT_KINDS = [30078]
export const MLS_KP_KIND = 30078
export const MLS_KP_DTAG = 'paytaca:mls-kp'
export const MLS_MSG_DTAG_PREFIX = 'paytaca:mls-msg'

/**
 * Build a Nostr event for an MLS message.
 * The relay (NIP-78) only accepts kind 30078 with a "d" tag, a "p" tag,
 * and JSON content with `name` + object `data`. The original MLS kind
 * (30117, 30118, 30119) is carried inside `data.mlsKind` so receivers can
 * distinguish messages, commits, and welcomes. A unique "d" tag per event
 * prevents the relay from treating these as replaceable/addressable.
 * @param {Object} mlsMsg — MLSMessage from ts-mls
 * @param {number} kind — original MLS kind (30117 message, 30118 commit, 30119 welcome)
 * @param {string} mlsGroupIdHex — hex-encoded MLS group_id for the h-tag
 * @param {string} roomId — room UUID for the r-tag
 * @param {string} pubkeyHex — sender nostr pubkey hex
 * @param {string[]} [memberPubkeys=[]] — group member pubkeys to add as p-tags
 *   (relay requires a p-tag, and members' #p subscriptions match on them)
 * @returns {import('nostr-tools').UnsignedEvent}
 */
export function buildMlsNostrEvent(mlsMsg, kind, mlsGroupIdHex, roomId, pubkeyHex, memberPubkeys = []) {
  const encoded = encodeMlsMessage(mlsMsg)
  const payload = arrayBufToBase64(encoded)
  const content = JSON.stringify({
    name: 'Paytaca MLS Message',
    data: { mlsKind: kind, mlsMessage: payload },
  })

  const tags = [
    ['d', `${MLS_MSG_DTAG_PREFIX}:${kind}:${mlsGroupIdHex}:${crypto.randomUUID()}`],
    ['h', mlsGroupIdHex],
    ['r', roomId],
  ]
  for (const pk of memberPubkeys) {
    tags.push(['p', pk])
  }

  return {
    kind: MLS_KP_KIND,
    pubkey: pubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags,
  }
}

/**
 * Build a Nostr event for a KeyPackage.
 * @param {import('ts-mls').KeyPackage} keyPackage
 * @param {string} nostrPubkeyHex
 * @param {Uint8Array} signaturePrivateKey — Ed25519 signing key
 * @returns {import('nostr-tools').UnsignedEvent}
 */
export function buildMlsKeyPackageEvent(keyPackage, nostrPubkeyHex) {
  const encoded = encodeMlsMessage({
    version: 'mls10',
    wireformat: 'mls_key_package',
    keyPackage,
  })
  // The relay (NIP-78) requires JSON content for kind 30078, with `name` and
  // an object `data` field. Wrap the base64 MLS payload accordingly.
  const content = JSON.stringify({
    name: 'Paytaca MLS KeyPackage',
    data: { mlsKeyPackage: arrayBufToBase64(encoded) },
  })

  return {
    kind: MLS_KP_KIND,
    pubkey: nostrPubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags: [
      ['d', MLS_KP_DTAG],
      ['p', nostrPubkeyHex],
    ],
  }
}

function arrayBufToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export { arrayBufToBase64 }
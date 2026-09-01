import { finalizeEvent, generateSecretKey, getPublicKey, nip44 } from 'nostr-tools'
import { encodeMlsMessage } from 'ts-mls'
import { bytesToHex, hexToBytes, randomUUID } from 'src/utils/encoding'

export const MLS_EVENT_KINDS = [30078]
export const MLS_KP_KIND = 30078
export const MLS_KP_DTAG = 'paytaca:mls-kp'
export const MLS_MSG_DTAG_PREFIX = 'paytaca:mls-msg'

export const NIP_EE_KP_KIND = 443
export const NIP_EE_WELCOME_KIND = 444
export const NIP_EE_GROUP_EVENT_KIND = 445
export const NIP_EE_RELAY_LIST_KIND = 10051
export const NIP_EE_EVENT_KINDS = [
  NIP_EE_KP_KIND,
  NIP_EE_WELCOME_KIND,
  NIP_EE_GROUP_EVENT_KIND,
  NIP_EE_RELAY_LIST_KIND,
]
export const NIP_EE_MLS_PROTOCOL_VERSION = '1.0'
export const NIP_EE_CIPHERSUITE = '0x0001'
export const NOSTR_GROUP_DATA_EXTENSION_TYPE = 0xf2ee
const NOSTR_GROUP_DATA_VERSION = 2
const NOSTR_GROUP_ID_LENGTH = 32

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
    ['d', `${MLS_MSG_DTAG_PREFIX}:${kind}:${mlsGroupIdHex}:${randomUUID()}`],
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

function zeroBytes(bytes) {
  bytes.fill(0)
}

/**
 * NIP-EE: derive the NIP-44 conversation key from the MLS exporter secret.
 * The exporter secret (label "nostr") is used as a secp256k1 private key and
 * the derived public key is the receiver key, exactly like OPTN/Marmot does.
 * @param {Uint8Array} exporterSecretBytes
 * @returns {Uint8Array} conversation key
 */
export function nip44ConversationKeyFromExporter(exporterSecretBytes) {
  const receiverPubkey = getPublicKey(exporterSecretBytes)
  return nip44.v2.utils.getConversationKey(exporterSecretBytes, receiverPubkey)
}

/**
 * Encrypt serialized MLSMessage bytes with NIP-44 using the MLS exporter
 * secret as the conversation key. The plaintext is the hex string of the
 * serialized MLSMessage so receivers can decrypt to hex and parse.
 * @param {Uint8Array} mlsMessageBytes — serialized MLSMessage
 * @param {Uint8Array} exporterSecretBytes — current exporter secret
 * @returns {string} NIP-44 v2 ciphertext (base64)
 */
export function encryptMlsMessageWithExporter(mlsMessageBytes, exporterSecretBytes) {
  const conversationKey = nip44ConversationKeyFromExporter(exporterSecretBytes)
  const ciphertext = nip44.v2.encrypt(bytesToHex(mlsMessageBytes), conversationKey)
  zeroBytes(conversationKey)
  return ciphertext
}

/**
 * Decrypt a NIP-EE group event content back to serialized MLSMessage bytes.
 * @param {string} ciphertext — NIP-44 v2 ciphertext (base64)
 * @param {Uint8Array} exporterSecretBytes — receiver's exporter secret
 * @returns {Uint8Array} serialized MLSMessage
 */
export function decryptMlsMessageWithExporter(ciphertext, exporterSecretBytes) {
  const conversationKey = nip44ConversationKeyFromExporter(exporterSecretBytes)
  const plaintext = nip44.v2.decrypt(ciphertext, conversationKey)
  zeroBytes(conversationKey)
  return hexToBytes(plaintext)
}

/**
 * Build an unsigned NIP-EE KeyPackage event (kind 443).
 * Content is the hex-serialized KeyPackageBundle; the event MUST be signed
 * with the user's identity key per NIP-EE.
 * @param {Object} opts
 * @param {string} opts.keyPackageHex — hex-serialized KeyPackageBundle (MLSMessage)
 * @param {string} opts.nostrPubkeyHex
 * @param {string[]} [opts.relays=[]]
 * @returns {import('nostr-tools').UnsignedEvent}
 */
export function buildNipEeKeyPackageEvent({ keyPackageHex, nostrPubkeyHex, relays = [] }) {
  const tags = [
    ['mls_protocol_version', NIP_EE_MLS_PROTOCOL_VERSION],
    ['ciphersuite', NIP_EE_CIPHERSUITE],
    ['mls_extensions', '0xf2ee'],
  ]
  if (relays.length > 0) {
    tags.push(['relays', ...relays])
  }
  tags.push(['-', ''])

  return {
    kind: NIP_EE_KP_KIND,
    pubkey: nostrPubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    content: keyPackageHex,
    tags,
  }
}

/**
 * Build an unsigned NIP-EE KeyPackage relay-list event (kind 10051).
 * @param {string[]} relays
 * @param {string} nostrPubkeyHex
 * @returns {import('nostr-tools').UnsignedEvent}
 */
export function buildNipEeRelayListEvent(relays, nostrPubkeyHex) {
  return {
    kind: NIP_EE_RELAY_LIST_KIND,
    pubkey: nostrPubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [...relays.map((relay) => ['relays', relay]), ['-', '']],
  }
}

/**
 * Build an unsigned NIP-EE Welcome event (kind 444). Per NIP-EE this event
 * is UNSIGNED — the caller gift-wraps it with NIP-59 to the invitee.
 * @param {Object} opts
 * @param {string} opts.welcomeHex — hex-serialized MLSMessage containing the Welcome
 * @param {string} opts.keyPackageEventId — event id of the consumed kind-443 KeyPackage
 * @param {string[]} [opts.relays=[]]
 * @param {string} opts.nostrPubkeyHex
 * @returns {import('nostr-tools').UnsignedEvent}
 */
export function buildNipEeWelcomeEvent({ welcomeHex, keyPackageEventId, relays = [], nostrPubkeyHex }) {
  const tags = [['e', keyPackageEventId]]
  if (relays.length > 0) {
    tags.push(['relays', ...relays])
  }

  return {
    kind: NIP_EE_WELCOME_KIND,
    pubkey: nostrPubkeyHex,
    created_at: Math.floor(Date.now() / 1000),
    content: welcomeHex,
    tags,
  }
}

/**
 * Build and sign a NIP-EE group event (kind 445). The MLSMessage is
 * encrypted with NIP-44 (exporter-secret conversation key) and signed with
 * a fresh ephemeral secp256k1 key — never the user's identity key.
 * @param {Object} opts
 * @param {string} opts.nostrGroupIdHex — 32-byte nostr_group_id hex (h tag)
 * @param {Uint8Array} opts.mlsMessageBytes — serialized MLSMessage to publish
 * @param {Uint8Array} opts.exporterSecretBytes — current exporter secret
 * @returns {import('nostr-tools').Event} signed event ready to publish
 */
export function buildNipEeGroupEvent({ nostrGroupIdHex, mlsMessageBytes, exporterSecretBytes }) {
  const ephemeralKey = generateSecretKey()
  const event = finalizeEvent(
    {
      kind: NIP_EE_GROUP_EVENT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      content: encryptMlsMessageWithExporter(mlsMessageBytes, exporterSecretBytes),
      tags: [['h', nostrGroupIdHex]],
    },
    ephemeralKey,
  )
  zeroBytes(ephemeralKey)
  return event
}

/**
 * Serialize the 0xF2EE nostr_group_data extension payload (Marmot wire
 * format): u16(version) || nostrGroupId(32B) || opaque16(name) ||
 * opaque16(description) || vec16(opaque16(admin hex)) || vec16(opaque16(relay url)).
 * @param {Object} opts
 * @param {string} opts.nostrGroupIdHex — 32-byte hex
 * @param {string} [opts.name='']
 * @param {string} [opts.description='']
 * @param {string[]} [opts.adminPubkeys=[]] — hex pubkeys
 * @param {string[]} [opts.relays=[]]
 * @returns {Uint8Array}
 */
export function serializeNipEeGroupData({ nostrGroupIdHex, name = '', description = '', adminPubkeys = [], relays = [] }) {
  const nostrGroupId = hexToBytes(nostrGroupIdHex)
  const chunks = [encodeU16(NOSTR_GROUP_DATA_VERSION), nostrGroupId]
  chunks.push(encodeOpaque16(name))
  chunks.push(encodeOpaque16(description))
  chunks.push(encodeVec16(adminPubkeys.map((pk) => encodeOpaque16(pk))))
  chunks.push(encodeVec16(relays.map((relay) => encodeOpaque16(relay))))

  let total = 0
  for (const chunk of chunks) total += chunk.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/**
 * Parse a 0xF2EE nostr_group_data extension payload.
 * @param {Uint8Array} extensionData
 * @returns {{nostrGroupIdHex: string, name: string, description: string, adminPubkeys: string[], relays: string[]}|null}
 */
export function parseNipEeGroupData(extensionData) {
  try {
    let offset = 0
    const version = decodeU16(extensionData, offset)
    offset += 2
    if (version < 1 || version > 3) return null

    const nostrGroupId = extensionData.slice(offset, offset + NOSTR_GROUP_ID_LENGTH)
    if (nostrGroupId.length !== NOSTR_GROUP_ID_LENGTH) return null
    offset += NOSTR_GROUP_ID_LENGTH

    const name = decodeOpaque16Raw(extensionData, offset)
    offset += 2 + name.length

    const descriptionBytes = decodeOpaque16Raw(extensionData, offset)
    offset += 2 + descriptionBytes.length

    const adminCount = decodeU16(extensionData, offset)
    offset += 2
    const adminPubkeys = []
    for (let i = 0; i < adminCount; i++) {
      const adminBytes = decodeOpaque16Raw(extensionData, offset)
      offset += 2 + adminBytes.length
      adminPubkeys.push(bytesToHex(adminBytes))
    }

    const relayCount = decodeU16(extensionData, offset)
    offset += 2
    const relays = []
    for (let i = 0; i < relayCount; i++) {
      const relayBytes = decodeOpaque16Raw(extensionData, offset)
      offset += 2 + relayBytes.length
      relays.push(new TextDecoder().decode(relayBytes))
    }

    return {
      nostrGroupIdHex: bytesToHex(nostrGroupId),
      name: new TextDecoder().decode(name),
      description: new TextDecoder().decode(descriptionBytes),
      adminPubkeys,
      relays,
    }
  } catch {
    return null
  }
}

function encodeU16(value) {
  const out = new Uint8Array(2)
  out[0] = (value >> 8) & 0xff
  out[1] = value & 0xff
  return out
}

function decodeU16(bytes, offset) {
  if (offset + 2 > bytes.length) throw new Error('nostr_group_data: truncated u16')
  return (bytes[offset] << 8) | bytes[offset + 1]
}

function encodeOpaque16(value) {
  const bytes = new TextEncoder().encode(value)
  const out = new Uint8Array(2 + bytes.length)
  out[0] = (bytes.length >> 8) & 0xff
  out[1] = bytes.length & 0xff
  out.set(bytes, 2)
  return out
}

function decodeOpaque16Raw(bytes, offset) {
  const length = decodeU16(bytes, offset)
  if (offset + 2 + length > bytes.length) throw new Error('nostr_group_data: truncated opaque16')
  return bytes.slice(offset + 2, offset + 2 + length)
}

function encodeVec16(items) {
  const encodedItems = [...items]
  const header = encodeU16(encodedItems.length)
  let total = header.length
  for (const item of encodedItems) total += item.length
  const out = new Uint8Array(total)
  out.set(header, 0)
  let offset = header.length
  for (const item of encodedItems) {
    out.set(item, offset)
    offset += item.length
  }
  return out
}
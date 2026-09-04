import {
  createGroup,
  joinGroup,
  createCommit,
  encodeMlsMessage,
  decodeMlsMessage,
  emptyPskIndex,
  encodeRequiredCapabilities,
  mlsExporter,
} from 'ts-mls'
import { getGroupMembers, getOwnLeafNode } from 'ts-mls/clientState.js'
import { ensureMlsCrypto } from './context.js'
import {
  NOSTR_GROUP_DATA_EXTENSION_TYPE,
  serializeNipEeGroupData,
} from './nostr-transport.js'

const REQUIRED_PROPOSAL_TYPES = [2]

/**
 * Build the GroupContext extensions for a NIP-EE group: the 0xF2EE
 * nostr_group_data payload (Marmot wire format) plus required_capabilities
 * declaring that every member must support nostr_group_data and the update
 * proposal. Deliberately a subset of OPTN's requirements (no Marmot
 * app-data dictionary ext 0x0006, no selfRemove proposal 10) so stock
 * ts-mls can process every proposal in groups we create; OPTN clients can
 * still join since they support 0xF2EE + update.
 */
export function buildNipEeGroupExtensions(nostrGroupIdHex, { name = '', description = '', adminPubkeys = [], relays = [] } = {}) {
  return [
    {
      extensionType: NOSTR_GROUP_DATA_EXTENSION_TYPE,
      extensionData: serializeNipEeGroupData({ nostrGroupIdHex, name, description, adminPubkeys, relays }),
    },
    {
      extensionType: 'required_capabilities',
      extensionData: encodeRequiredCapabilities({
        extensionTypes: [NOSTR_GROUP_DATA_EXTENSION_TYPE],
        proposalTypes: REQUIRED_PROPOSAL_TYPES,
        credentialTypes: [],
      }),
    },
  ]
}

/**
 * Create a new MLS group.
 * @param {Uint8Array} groupId — MLS internal group ID (32 random bytes, never published)
 * @param {Object} keyPackage — from generateMlsKeyPackage()
 * @param {Object} privatePackage — from generateMlsKeyPackage()
 * @param {string} nostrGroupIdHex — 32-byte hex nostr_group_id used in kind-445 h tags
 * @param {Object} [groupMeta] — name/description/adminPubkeys/relays for nostr_group_data
 * @returns {Promise<import('ts-mls').ClientState>}
 */
export async function createMlsGroup(groupId, keyPackage, privatePackage, nostrGroupIdHex, groupMeta) {
  const { impl, clientConfig } = await ensureMlsCrypto()
  const extensions = buildNipEeGroupExtensions(nostrGroupIdHex, groupMeta)
  return createGroup(groupId, keyPackage, privatePackage, extensions, impl, clientConfig)
}

/**
 * Add a member by submitting an Add proposal + Commit.
 * @param {import('ts-mls').ClientState} state
 * @param {import('ts-mls').KeyPackage} inviteeKeyPackage
 * @param {import('ts-mls').CiphersuiteImpl} [impl]
 * @returns {Promise<{ newState, commit, welcome, consumed }>
 */
export async function addMlsMember(state, inviteeKeyPackage, impl) {
  if (!impl) { const crypto = await ensureMlsCrypto(); impl = crypto.impl }

  const addProposal = {
    proposalType: 'add',
    add: { keyPackage: inviteeKeyPackage },
  }

  return createCommit(
    { state, cipherSuite: impl, pskIndex: emptyPskIndex },
    { extraProposals: [addProposal], ratchetTreeExtension: true },
  )
}

/**
 * Remove a member by submitting a Remove proposal + Commit.
 * @param {import('ts-mls').ClientState} state
 * @param {number} leafIndex — index of the member to remove (0-based)
 * @param {import('ts-mls').CiphersuiteImpl} [impl]
 * @returns {Promise<{ newState, commit, consumed }>}
 */
export async function removeMlsMember(state, leafIndex, impl) {
  if (!impl) { const crypto = await ensureMlsCrypto(); impl = crypto.impl }

  const removeProposal = {
    proposalType: 'remove',
    remove: { removed: leafIndex },
  }

  return createCommit(
    { state, cipherSuite: impl, pskIndex: emptyPskIndex },
    { extraProposals: [removeProposal] },
  )
}

/** Join a group from a Welcome. */
export async function joinMlsGroup(welcome, keyPackage, privatePackage) {
  const { impl, clientConfig } = await ensureMlsCrypto()
  return joinGroup(welcome, keyPackage, privatePackage, emptyPskIndex, impl, undefined, undefined, clientConfig)
}

/**
 * Derive the NIP-EE exporter secret ("nostr" label, 32 bytes) from the
 * group's current key schedule. Rotates per epoch — derive fresh from the
 * latest state after every commit.
 * @param {import('ts-mls').ClientState} state
 * @returns {Promise<Uint8Array>}
 */
export async function getNostrExporterSecret(state) {
  const { impl } = await ensureMlsCrypto()
  return mlsExporter(state.keySchedule.exporterSecret, 'nostr', new Uint8Array(0), 32, impl)
}

/** Encode an MLSMessage for publishing. */
export function encodeMlsMsg(msg) {
  return encodeMlsMessage(msg)
}

/** Decode raw bytes into an MLSMessage. */
export function decodeMlsMsg(bytes) {
  const result = decodeMlsMessage(bytes, 0)
  if (!result) return undefined
  return result[0]
}

/** Get all member identities from a ClientState. */
export function getMlsGroupMembers(state) {
  return getGroupMembers(state)
}

/** Get own leaf index from a ClientState.
 * Compares members by credential identity (the Nostr pubkey) — reference
 * equality is not reliable after a state round-trip through IndexedDB, where
 * decodeGroupState may produce distinct objects for the same leaf.
 */
export function getOwnLeafIndex(state) {
  const leaf = getOwnLeafNode(state)
  const leafIdentity = leaf?.credential?.identity
    ? new TextDecoder().decode(leaf.credential.identity)
    : null
  if (!leafIdentity) return -1
  const members = getGroupMembers(state)
  for (let i = 0; i < members.length; i++) {
    const identity = members[i]?.credential?.identity
      ? new TextDecoder().decode(members[i].credential.identity)
      : null
    if (identity && identity === leafIdentity) return i
  }
  return -1
}
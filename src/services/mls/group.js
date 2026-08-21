import {
  createGroup,
  joinGroup,
  createCommit,
  encodeMlsMessage,
  decodeMlsMessage,
  emptyPskIndex,
} from 'ts-mls'
import { getGroupMembers, getOwnLeafNode } from 'ts-mls/clientState.js'
import { ensureMlsCrypto } from './context.js'

/**
 * Create a new MLS group.
 * @param {Uint8Array} groupId — MLS internal group ID (32 random bytes)
 * @param {Object} keyPackage — from generateMlsKeyPackage()
 * @param {Object} privatePackage — from generateMlsKeyPackage()
 * @returns {Promise<import('ts-mls').ClientState>}
 */
export async function createMlsGroup(groupId, keyPackage, privatePackage) {
  const { impl, clientConfig } = await ensureMlsCrypto()
  return createGroup(groupId, keyPackage, privatePackage, [], impl, clientConfig)
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

/** Get own leaf index from a ClientState. */
export function getOwnLeafIndex(state) {
  const leaf = getOwnLeafNode(state)
  // leaf has a leafIndex or we need to find it
  const members = getGroupMembers(state)
  for (let i = 0; i < members.length; i++) {
    if (members[i] === leaf) return i
  }
  return -1
}
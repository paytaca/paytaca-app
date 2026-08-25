import {
  createApplicationMessage,
  processMessage,
  encodeMlsMessage,
  decodeMlsMessage,
  emptyPskIndex,
  acceptAll,
} from 'ts-mls'
import { ensureMlsCrypto } from './context.js'

/**
 * Encrypt a plaintext message for sending within an LS group.
 * @param {import('ts-mls').ClientState} state
 * @param {string} text — plaintext to encrypt
 * @param {import('ts-mls').CiphersuiteImpl} [impl]
 * @returns {Promise<{ privateMessage: import('ts-mls').PrivateMessage, newState, consumed }>}
 */
export async function encryptMlsMessage(state, text, impl) {
  if (!impl) { const crypto = await ensureMlsCrypto(); impl = crypto.impl }
  const encoded = new TextEncoder().encode(text)
  return createApplicationMessage(state, encoded, impl)
}

/**
 * Wrap a PrivatMessage into an LSMessage suitable for encoding.
 */
export function wrapPrivateMessage(privateMessage, version = 'mls10') {
  return {
    version,
    wireformat: 'mls_private_message',
    privateMessage,
  }
}

/**
 * Decrypt and process an incoming LS private message.
 * @param {import('ts-mls').ClientState} state
 * @param {Uint8Array} bytes — raw decoded content from event
 * @param {string} expectedWireFormat — should be 'mls_private_message'
 * @param {import('ts-mls').CiphersuiteImpl} [impl]
 * @returns {Promise<{ plaintext: string, newState } | { newState, actionTaken }>}
 */
export async function processMlsMessage(state, bytes, impl) {
  if (!impl) { const crypto = await ensureMlsCrypto(); impl = crypto.impl }

  const result = decodeMlsMessage(bytes, 0)
  if (!result) return { newState: state, actionTaken: 'message_not_recognized' }
  const mlsMsg = result[0]

  const processed = await processMessage(mlsMsg, state, emptyPskIndex, acceptAll, impl)

  if (processed.kind === 'applicationMessage') {
    const plaintext = new TextDecoder().decode(processed.message)
    return { plaintext, newState: processed.newState }
  }

  // It's a commit or proposal — state updated but no app message
  return { newState: processed.newState, actionTaken: processed.actionTaken }
}

/** Decode a Welcome from an event's content bytes. */
export function decodeWelcomeFromBytes(bytes) {
  const result = decodeMlsMessage(bytes, 0)
  if (!result) throw new Error('Expected a Welcome message')
  const mlsMsg = result[0]
  if (mlsMsg.wireformat !== 'mls_welcome') throw new Error('Expected a Welcome message')
  return mlsMsg.welcome
}
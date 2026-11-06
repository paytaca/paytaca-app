// A direct message needs two distinct identities. Rooms and contacts are keyed
// by pubkey, so a self target collapses into a room whose only member is you:
// the gift-wrap goes out to nobody else, and the conversation can never receive
// a reply. Guarding here keeps every entry point (deep link, paste, QR scan,
// contact add) honest instead of failing late; the rules are pure so they can be
// exercised without the store.
import { decode as nip19Decode } from 'nostr-tools/nip19'

export const SELF_CHAT_ERROR = 'You cannot message yourself'

/** True only when both identities are known and equal. */
export function isSelfPubKey (pubKeyHex, myPubKeyHex) {
  if (!pubKeyHex || !myPubKeyHex) return false
  return pubKeyHex === myPubKeyHex
}

/**
 * Same comparison for npub input. Anything that is not a decodable npub returns
 * false so the caller's own validation reports the problem.
 */
export function isSelfNpub (npub, myPubKeyHex) {
  if (!myPubKeyHex) return false
  const candidate = String(npub || '').trim()
  if (!candidate) return false
  try {
    const decoded = nip19Decode(candidate)
    return decoded.type === 'npub' && isSelfPubKey(decoded.data, myPubKeyHex)
  } catch {
    return false
  }
}

/**
 * A private room with no member besides you. Compared by member set rather than
 * room id so rooms that already collapsed during earlier testing are still
 * recognized. Group rooms are never self chats — one-member MLS rooms are a
 * legitimate "others left" state and must keep working.
 */
export function isSelfDmRoom (room, myPubKeyHex) {
  if (!room || !myPubKeyHex) return false
  if (room.type !== 'private') return false
  const members = room.members || []
  if (!members.includes(myPubKeyHex)) return false
  return !members.some((member) => member && member !== myPubKeyHex)
}

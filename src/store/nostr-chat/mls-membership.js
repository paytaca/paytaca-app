// Invited-vs-joined rules for MLS groups.
//
// An MLS Add commit inserts the invitee into the tree immediately, so tree
// membership says nothing about whether they accepted. Two local records carry
// that: `pendingInvitees` (invited, acceptance not observed) and `joinedMembers`
// (wire proof of acceptance: they decrypted an epoch or announced their join).
// These helpers are pure so the rules can be exercised without the store.

/**
 * Leaves present after a commit but not before it. Those are the members this
 * commit invited — the only ones whose acceptance can still be pending.
 * Deriving them from the trees (not from room.members) keeps a stale or
 * already-updated member mirror from marking long-joined members.
 */
export function addedTreeLeaves (beforeMembers, afterMembers) {
  const before = new Set(beforeMembers || [])
  return (afterMembers || []).filter((m) => m && !before.has(m))
}

/** A member is invited while marked pending and without a join proof. */
export function isMlsMemberPending (memberPubKey, { pending, joined } = {}) {
  if (!memberPubKey) return false
  if (!pending?.[memberPubKey]) return false
  return !joined?.[memberPubKey]
}

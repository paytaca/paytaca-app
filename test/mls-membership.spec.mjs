import assert from 'node:assert/strict'
import { addedTreeLeaves, isMlsMemberPending } from '../src/store/nostr-chat/mls-membership.js'
import {
  MARK_MLS_INVITEE_PENDING,
  MARK_MLS_MEMBER_JOINED,
  FORGET_MLS_MEMBER,
  CLEAR_MLS_GROUP_STATE,
} from '../src/store/nostr-chat/mls-mutations.js'
import { getInitialWalletState } from '../src/store/nostr-chat/state.js'

describe('MLS invited-vs-joined membership rules', () => {
  describe('addedTreeLeaves', () => {
    it('returns only leaves the commit introduced', () => {
      assert.deepEqual(addedTreeLeaves(['alice'], ['alice', 'bob']), ['bob'])
    })

    it('returns nothing when a commit removes a member', () => {
      assert.deepEqual(addedTreeLeaves(['alice', 'bob'], ['alice']), [])
    })

    it('ignores empty identities', () => {
      assert.deepEqual(addedTreeLeaves(['alice'], ['alice', '', 'bob']), ['bob'])
    })

    it('tolerates missing inputs', () => {
      assert.deepEqual(addedTreeLeaves(undefined, ['bob']), ['bob'])
      assert.deepEqual(addedTreeLeaves(['alice'], undefined), [])
    })
  })

  describe('isMlsMemberPending', () => {
    it('is pending when marked and never proven joined', () => {
      assert.equal(isMlsMemberPending('bob', { pending: { bob: 1 } }), true)
    })

    it('is not pending once a join proof exists, even if still marked', () => {
      // A stale mirror or replayed Add must not push a joined member back.
      assert.equal(isMlsMemberPending('bob', { pending: { bob: 1 }, joined: { bob: 2 } }), false)
    })

    it('is not pending when never marked', () => {
      assert.equal(isMlsMemberPending('bob', {}), false)
    })

    it('is not pending for a falsy pubkey', () => {
      assert.equal(isMlsMemberPending('', { pending: { '': 1 } }), false)
    })
  })

  describe('invitation bookkeeping mutations', () => {
    const G = 'group-1'
    let state
    const ws = () => state.byWallet['test-wallet']

    beforeEach(() => {
      state = { byWallet: { 'test-wallet': getInitialWalletState() } }
    })

    it('marks an invitee pending and lists them as invited', () => {
      MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      assert.ok(ws().mls.pendingInvitees[G].bob)
      assert.equal(isMlsMemberPending('bob', {
        pending: ws().mls.pendingInvitees[G],
        joined: ws().mls.joinedMembers[G],
      }), true)
    })

    it('a join proof clears pending and blocks re-marking', () => {
      MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      MARK_MLS_MEMBER_JOINED(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      assert.equal(ws().mls.pendingInvitees[G], undefined)
      MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      assert.equal(ws().mls.pendingInvitees[G], undefined, 'stale/replayed Add cannot demote a joined member')
      assert.ok(ws().mls.joinedMembers[G].bob)
    })

    it('forgetting a member drops the join proof so a re-add shows Invited', () => {
      MARK_MLS_MEMBER_JOINED(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      FORGET_MLS_MEMBER(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      assert.equal(ws().mls.joinedMembers[G]?.bob, undefined)
      MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      assert.ok(ws().mls.pendingInvitees[G].bob)
    })

    it('clearing the group state drops both records', () => {
      MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex: G, memberPubKey: 'carol' })
      MARK_MLS_MEMBER_JOINED(state, { mlsGroupIdHex: G, memberPubKey: 'bob' })
      CLEAR_MLS_GROUP_STATE(state, G)
      assert.equal(ws().mls.pendingInvitees[G], undefined)
      assert.equal(ws().mls.joinedMembers[G], undefined)
    })

    it('keeps the pending bucket keyed per group', () => {
      MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex: 'g2', memberPubKey: 'bob' })
      assert.equal(ws().mls.pendingInvitees[G], undefined)
      assert.ok(ws().mls.pendingInvitees.g2.bob)
    })

    it('ignores missing inputs', () => {
      MARK_MLS_INVITEE_PENDING(state, { mlsGroupIdHex: G })
      MARK_MLS_MEMBER_JOINED(state, { memberPubKey: 'bob' })
      assert.deepEqual(ws().mls.pendingInvitees, {})
      assert.deepEqual(ws().mls.joinedMembers, {})
    })
  })
})

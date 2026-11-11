import assert from 'node:assert/strict'
import { isSelfPubKey, isSelfNpub, isSelfDmRoom } from '../src/store/nostr-chat/self-chat.js'
import { npubEncode } from 'nostr-tools/nip19'

// A DM needs two distinct identities; the guard rules are what stop a self
// target from collapsing into a one-member room nobody can reply to.
const ME = 'a'.repeat(64)
const OTHER = 'b'.repeat(64)

describe('self-chat guards', () => {
  describe('isSelfPubKey', () => {
    it('matches only the same key', () => {
      assert.equal(isSelfPubKey(ME, ME), true)
      assert.equal(isSelfPubKey(OTHER, ME), false)
    })

    it('reports false while the wallet identity is unknown', () => {
      assert.equal(isSelfPubKey(ME, null), false)
      assert.equal(isSelfPubKey(null, ME), false)
    })
  })

  describe('isSelfNpub', () => {
    it('decodes the wallet npub and matches it', () => {
      assert.equal(isSelfNpub(npubEncode(ME), ME), true)
      assert.equal(isSelfNpub(npubEncode(OTHER), ME), false)
    })

    it('tolerates surrounding whitespace', () => {
      assert.equal(isSelfNpub(`  ${npubEncode(ME)}  `, ME), true)
    })

    it('leaves invalid input to the caller validation', () => {
      assert.equal(isSelfNpub('npub1notarealkey', ME), false)
      assert.equal(isSelfNpub('', ME), false)
      assert.equal(isSelfNpub(npubEncode(ME), null), false)
    })
  })

  describe('isSelfDmRoom', () => {
    it('flags a private room whose only member is you', () => {
      assert.equal(isSelfDmRoom({ type: 'private', members: [ME, ME] }, ME), true)
      assert.equal(isSelfDmRoom({ type: 'private', members: [ME] }, ME), true)
    })

    it('keeps real DMs', () => {
      assert.equal(isSelfDmRoom({ type: 'private', members: [ME, OTHER] }, ME), false)
    })

    it('keeps a group you are alone in', () => {
      assert.equal(isSelfDmRoom({ type: 'mls-group', members: [ME] }, ME), false)
    })

    it('ignores rooms you are not a member of and missing input', () => {
      assert.equal(isSelfDmRoom({ type: 'private', members: [OTHER] }, ME), false)
      assert.equal(isSelfDmRoom(null, ME), false)
      assert.equal(isSelfDmRoom({ type: 'private', members: [ME] }, null), false)
    })
  })
})

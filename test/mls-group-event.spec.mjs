import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import {
  buildNipEeGroupEvent,
  NIP_EE_GROUP_EVENT_KIND,
} from '../src/services/mls/nostr-transport.js'

const GROUP_ID = 'aa'.repeat(32)
const SENDER = 'b1'.repeat(32)

const build = (opts = {}) => buildNipEeGroupEvent({
  nostrGroupIdHex: GROUP_ID,
  mlsMessageBytes: new Uint8Array([1, 2, 3]),
  exporterSecretBytes: randomBytes(32),
  ...opts,
})

describe('NIP-EE group events', () => {
  it('tags the sender so the push watcher can skip them', () => {
    const event = build({ senderPubkeyHex: SENDER })

    assert.equal(event.kind, NIP_EE_GROUP_EVENT_KIND)
    assert.deepEqual(event.tags.find((t) => t[0] === 'h'), ['h', GROUP_ID])
    assert.deepEqual(event.tags.find((t) => t[0] === 'sender'), ['sender', SENDER])
  })

  it('omits the sender tag when no sender is given', () => {
    const event = build()

    assert.equal(event.tags.some((t) => t[0] === 'sender'), false)
  })

  it('still signs with an ephemeral key, never the sender key', () => {
    const event = build({ senderPubkeyHex: SENDER })

    assert.notEqual(event.pubkey, SENDER)
  })
})

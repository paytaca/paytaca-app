import assert from 'node:assert/strict'
import {
  generateSecretKey,
  getEventHash,
  getPublicKey,
  utils,
  verifyEvent,
} from 'nostr-tools'
import { ROOM_PUSH_TOKEN_TAG, wrapManyEventsForRoom } from '../src/wallet/nostr-room-wrap.js'

const senderPrivKeyBytes = generateSecretKey()
const senderPrivKey = utils.bytesToHex(senderPrivKeyBytes)
const senderPubKey = getPublicKey(senderPrivKeyBytes)
const recipientPubKey = getPublicKey(generateSecretKey())
const token = 'a'.repeat(64)

function unsignedText () {
  const event = {
    kind: 14,
    pubkey: senderPubKey,
    created_at: Math.floor(Date.now() / 1000),
    content: 'hello',
    tags: [['p', recipientPubKey]],
  }
  event.id = getEventHash(event)
  return event
}

describe('room push tokens on gift-wraps', () => {
  it('puts the token on signed recipient wraps', () => {
    const wraps = wrapManyEventsForRoom(
      unsignedText(), senderPrivKey, [recipientPubKey], token,
    )
    const recipientWrap = wraps.find(
      wrap => wrap.tags.find(tag => tag[0] === 'p')?.[1] === recipientPubKey,
    )

    assert.ok(recipientWrap, 'recipient wrap exists')
    assert.deepEqual(
      recipientWrap.tags.find(tag => tag[0] === ROOM_PUSH_TOKEN_TAG),
      [ROOM_PUSH_TOKEN_TAG, token],
    )
    assert.equal(verifyEvent(recipientWrap), true, 'wrap signature stays valid')
  })

  it('stays valid without a token', () => {
    const wraps = wrapManyEventsForRoom(
      unsignedText(), senderPrivKey, [recipientPubKey],
    )
    const recipientWrap = wraps.find(
      wrap => wrap.tags.find(tag => tag[0] === 'p')?.[1] === recipientPubKey,
    )

    assert.equal(verifyEvent(recipientWrap), true)
    assert.equal(
      recipientWrap.tags.some(tag => tag[0] === ROOM_PUSH_TOKEN_TAG),
      false,
    )
  })

  it('marks the self copy so it never pushes', () => {
    const wraps = wrapManyEventsForRoom(
      unsignedText(), senderPrivKey, [recipientPubKey], token,
    )
    const selfWrap = wraps.find(
      wrap => wrap.tags.find(tag => tag[0] === 'p')?.[1] === senderPubKey,
    )

    assert.ok(selfWrap, 'self wrap exists')
    assert.ok(selfWrap.tags.some(tag => tag[0] === 'self'))
    assert.equal(verifyEvent(selfWrap), true)
  })
})

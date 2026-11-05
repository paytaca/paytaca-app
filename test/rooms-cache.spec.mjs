import assert from 'node:assert/strict'
import { getInitialWalletState } from '../src/store/nostr-chat/state.js'
import {
  SET_ROOMS,
  SET_ROOMS_LOADED,
  ADD_ROOM,
  RESET_WALLET_CHAT_DATA,
} from '../src/store/nostr-chat/mutations.js'

// The chat index paints from the persisted room cache before the server fetch
// resolves, so the cache must survive a cold start, and the fetch must both
// keep local-only rooms and flip the "list loaded" flag the skeletons key off.
const HASH = 'test-wallet'
const mkState = () => ({ byWallet: { [HASH]: getInitialWalletState() } })
const ws = (state) => state.byWallet[HASH]

const serverRoom = { id: 'r1', type: 'private', name: 'Alice', members: ['a', 'b'] }
const mlsRoom = {
  id: 'r2',
  type: 'mls-group',
  name: 'Team',
  members: ['a'],
  owner: 'a',
  admins: [],
  nostrGroupId: 'g2',
}

describe('room list cache', () => {
  it('starts unloaded so an empty list can be told apart from a pending fetch', () => {
    assert.equal(ws(mkState()).roomsLoaded, false)
  })

  it('keeps cached rooms and marks the list loaded after a fetch', () => {
    const state = mkState()
    ADD_ROOM(state, { ...serverRoom, lastMessageAt: 1234 })
    SET_ROOMS(state, [serverRoom])
    assert.equal(ws(state).roomsLoaded, true)
    assert.equal(ws(state).rooms.length, 1)
  })

  it('keeps local-only MLS groups that the server never lists', () => {
    const state = mkState()
    ADD_ROOM(state, mlsRoom)
    SET_ROOMS(state, [serverRoom])
    assert.deepEqual(ws(state).rooms.map((r) => r.id).sort(), ['r1', 'r2'])
    const kept = ws(state).rooms.find((r) => r.id === 'r2')
    assert.equal(kept.owner, 'a', 'MLS owner is preserved across a refetch')
    assert.equal(kept.nostrGroupId, 'g2')
  })

  it('keeps a locally touched lastMessageAt over the server value', () => {
    const state = mkState()
    ADD_ROOM(state, { ...serverRoom, lastMessageAt: 999 })
    SET_ROOMS(state, [{ ...serverRoom, lastMessageAt: 5 }])
    assert.equal(ws(state).rooms[0].lastMessageAt, 999)
  })

  it('marks the list loaded when the fetch fails, without touching the cache', () => {
    const state = mkState()
    ADD_ROOM(state, serverRoom)
    SET_ROOMS_LOADED(state)
    assert.equal(ws(state).roomsLoaded, true)
    assert.equal(ws(state).rooms.length, 1)
  })

  it('drops the cache and the flag when the wallet chat data is reset', () => {
    const state = mkState()
    ADD_ROOM(state, serverRoom)
    SET_ROOMS(state, [serverRoom])
    RESET_WALLET_CHAT_DATA(state)
    assert.deepEqual(ws(state).rooms, [])
    assert.equal(ws(state).roomsLoaded, false)
  })
})

import assert from 'node:assert/strict'
import { getInitialWalletState } from '../src/store/nostr-chat/state.js'
import { getRooms, getArchivedRooms } from '../src/store/nostr-chat/getters.js'

// The chat list must not show a DM with yourself: such rooms came from earlier
// builds and cannot receive a reply. Groups you are alone in are a legitimate
// "others left" state and must stay listed.
const HASH = 'test-wallet'
const ME = 'a'.repeat(64)
const OTHER = 'b'.repeat(64)

const mkState = (rooms) => {
  const ws = getInitialWalletState()
  ws.keys.pubKeyHex = ME
  ws.rooms = rooms
  return { byWallet: { [HASH]: ws } }
}

const selfDm = { id: 'self', type: 'private', name: 'Me', members: [ME, ME], updatedAt: 500 }
const realDm = { id: 'dm', type: 'private', name: 'Alice', members: [ME, OTHER], updatedAt: 400 }
const soloGroup = { id: 'group', type: 'mls-group', name: 'Team', members: [ME], updatedAt: 300 }

describe('room list excludes self DMs', () => {
  it('hides a private room whose only member is you', () => {
    const ids = getRooms(mkState([selfDm, realDm, soloGroup])).map((r) => r.id)
    assert.deepEqual(ids, ['dm', 'group'])
  })

  it('hides an archived self DM', () => {
    const ids = getArchivedRooms(mkState([{ ...selfDm, archived: true }])).map((r) => r.id)
    assert.deepEqual(ids, [])
  })
})

import assert from 'node:assert/strict'
import {
  encodePointerCommitment,
  decodePointerCommitment,
  isPointerCommitment,
  findPointerUtxo,
  describeMigrationState,
  POINTER_COMMITMENT_LENGTH,
} from '../src/services/card/pointer.js'

const CATEGORY = '01'.repeat(31) + '02'
const CATEGORY_REVERSED = '02' + '01'.repeat(31)

describe('pointer codec', () => {
  it('encodes 0x02 || version || reverseHex(category)', () => {
    const commitment = encodePointerCommitment({ version: 2, category: CATEGORY })
    assert.equal(commitment.length, POINTER_COMMITMENT_LENGTH * 2)
    assert.equal(commitment.slice(0, 2), '02')
    assert.equal(commitment.slice(2, 4), '02')
    assert.equal(commitment.slice(4), CATEGORY_REVERSED)
  })

  it('round-trips version and category', () => {
    for (const version of [1, 2, 3, 255]) {
      const commitment = encodePointerCommitment({ version, category: CATEGORY })
      const decoded = decodePointerCommitment(commitment)
      assert.deepEqual(decoded, { version, category: CATEGORY })
    }
  })

  it('rejects invalid versions and empty/oversized categories', () => {
    assert.throws(() => encodePointerCommitment({ version: 0, category: CATEGORY }))
    assert.throws(() => encodePointerCommitment({ version: 256, category: CATEGORY }))
    assert.throws(() => encodePointerCommitment({ version: 1.5, category: CATEGORY }))
    assert.throws(() => encodePointerCommitment({ version: 1, category: '' }))
    assert.throws(() => encodePointerCommitment({ version: 1, category: 'ab' }))
  })

  it('isPointerCommitment is true only for 0x02 and decode rejects wrong length', () => {
    const commitment = encodePointerCommitment({ version: 1, category: CATEGORY })
    assert.equal(isPointerCommitment(commitment), true)
    assert.equal(isPointerCommitment('00' + CATEGORY), false)
    assert.equal(isPointerCommitment('01' + CATEGORY), false)
    assert.equal(isPointerCommitment(''), false)
    assert.equal(decodePointerCommitment('02' + '00'.repeat(31)), null)
    assert.equal(decodePointerCommitment('00' + CATEGORY), null)
  })

  it('locates the pointer among ownership/auth NFTs and never treats it as auth', () => {
    const ownershipPkh = { token: { nft: { commitment: '00' + '11'.repeat(20) } } }
    const ownershipCat = { token: { nft: { commitment: '01' + CATEGORY_REVERSED } } }
    const auth = { token: { nft: { commitment: '01' + 'cc'.repeat(39) } } }
    const pointer = { token: { nft: { commitment: encodePointerCommitment({ version: 3, category: CATEGORY }) } } }
    assert.equal(findPointerUtxo([ownershipPkh, ownershipCat, auth, pointer]), pointer)
    assert.equal(findPointerUtxo([ownershipPkh, ownershipCat, auth]), null)
    assert.equal(findPointerUtxo([]), null)
  })

  it('describes migration state from pointer-state and funding', () => {
    assert.equal(describeMigrationState({ pointer_present: false }).status, 'not_migrated')
    assert.equal(
      describeMigrationState({ pointer_present: true, target_version: 2 }, { originFunded: true }).status,
      'funds_on_origin',
    )
    const migrated = describeMigrationState({ pointer_present: true, target_version: 2 }, { originFunded: false })
    assert.equal(migrated.status, 'migrated')
    assert.equal(migrated.label, 'Migrated to v2')
  })
})

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { ed25519 } from '@noble/curves/ed25519.js'
import { ensureMlsCrypto } from '../src/services/mls/context.js'
import { generateMlsKeyPackage } from '../src/services/mls/key-package.js'
import {
  createMlsGroup,
  addMlsMember,
  joinMlsGroup,
  removeMlsMember,
  getMlsGroupMembers,
  getMlsLeafIdentity,
  getMlsLeafIndexForIdentity,
  getOwnLeafIndex,
} from '../src/services/mls/group.js'

const NAME = (c) => c.repeat(64)

async function makeMember (identity) {
  const secretKey = ed25519.utils.randomSecretKey()
  return {
    identity,
    ...(await generateMlsKeyPackage(
      { publicKey: ed25519.getPublicKey(secretKey), privateKey: secretKey },
      identity,
      null,
    )),
  }
}

const leafIdentityOf = (leaf) => new TextDecoder().decode(leaf.credential.identity)
const leafPositions = (state) =>
  state.ratchetTree
    .map((node, nodeIndex) => (node?.nodeType === 'leaf' ? `${nodeIndex / 2}:${leafIdentityOf(node.leaf)[0]}` : null))
    .filter(Boolean)
    .join(' ')

// Four members is the smallest group where a removal that does not trim the
// right-hand subtree leaves a blank leaf in the middle — the condition that
// makes a compacted member position diverge from the real MLS leaf index.
async function buildGroupOfFour () {
  const { impl } = await ensureMlsCrypto()
  const identities = [NAME('a'), NAME('b'), NAME('c'), NAME('d')]
  const members = await Promise.all(identities.map(makeMember))

  const [owner, ...invitees] = members
  const byIdentity = new Map([[owner.identity, await createMlsGroup(
    randomBytes(32), owner.publicPackage, owner.privatePackage,
    randomBytes(32).toString('hex'),
    { name: 'group', adminPubkeys: [owner.identity] },
  )]])

  for (const invitee of invitees) {
    const { newState, welcome } = await addMlsMember(byIdentity.get(owner.identity), invitee.publicPackage, impl)
    byIdentity.set(owner.identity, newState)
    byIdentity.set(invitee.identity, await joinMlsGroup(welcome, invitee.publicPackage, invitee.privatePackage))
  }

  return { impl, members: identities, byIdentity }
}

describe('MLS leaf indexing', () => {
  it('keeps compacted member positions identical to leaf indices while the tree has no blanks', async () => {
    const { members, byIdentity } = await buildGroupOfFour()
    const state = byIdentity.get(members[0])

    assert.equal(leafPositions(state), '0:a 1:b 2:c 3:d')
    for (const [index, identity] of members.entries()) {
      assert.equal(getMlsLeafIndexForIdentity(state, identity), index)
      assert.equal(getMlsLeafIdentity(state, index), identity)
    }
  })

  it('resolves real leaf indices after a mid-tree removal leaves a blank', async () => {
    const { impl, members, byIdentity } = await buildGroupOfFour()
    const owner = members[0]
    const removedState = await removeMlsMember(byIdentity.get(owner), 1, impl)

    assert.equal(leafPositions(removedState.newState), '0:a 2:c 3:d')
    // The compacted list hides the hole; leaf indices must not.
    assert.deepEqual(getMlsGroupMembers(removedState.newState).length, 3)
    assert.equal(getMlsLeafIndexForIdentity(removedState.newState, members[2]), 2)
    assert.equal(getMlsLeafIndexForIdentity(removedState.newState, members[3]), 3)
    assert.equal(getMlsLeafIdentity(removedState.newState, 1), null)
    assert.equal(getMlsLeafIdentity(removedState.newState, 2), members[2])
  })

  it('removes the requested member, not whoever sits at that compacted position', async () => {
    const { impl, members, byIdentity } = await buildGroupOfFour()
    const owner = members[0]

    const afterFirstRemoval = await removeMlsMember(byIdentity.get(owner), 1, impl)
    // `d` is the third surviving member but leaf 3 in the tree; addressing it
    // by its compacted position (2) used to remove `c` instead.
    const targetLeaf = getMlsLeafIndexForIdentity(afterFirstRemoval.newState, members[3])
    assert.equal(targetLeaf, 3)

    const afterSecondRemoval = await removeMlsMember(afterFirstRemoval.newState, targetLeaf, impl)
    assert.equal(leafPositions(afterSecondRemoval.newState), '0:a 2:c')
    assert.deepEqual(
      getMlsGroupMembers(afterSecondRemoval.newState).map(leafIdentityOf),
      [members[0], members[2]],
    )
  })

  it('rejects a compacted position that has become a blank leaf', async () => {
    const { impl, members, byIdentity } = await buildGroupOfFour()
    const afterFirstRemoval = await removeMlsMember(byIdentity.get(members[0]), 1, impl)

    // `c` occupies compacted position 1, which is now blank in the tree.
    await assert.rejects(
      () => removeMlsMember(afterFirstRemoval.newState, 1, impl),
      /empty leaf node/,
    )
  })

  it('reports the owner their own tree leaf, not leaf 0 by accident', async () => {
    const { impl, members, byIdentity } = await buildGroupOfFour()
    const owner = members[0]

    const afterRemoval = await removeMlsMember(byIdentity.get(owner), 1, impl)
    assert.equal(getOwnLeafIndex(afterRemoval.newState), 0)
    // `d` now sits at tree leaf 3 while occupying compacted position 2.
    assert.equal(getOwnLeafIndex(byIdentity.get(members[3])), 3)
    assert.equal(getOwnLeafIndex(byIdentity.get(members[2])), 2)
  })
})

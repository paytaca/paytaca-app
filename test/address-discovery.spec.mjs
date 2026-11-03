import assert from 'node:assert/strict'
import { discoverWalletAddresses } from '../src/wallet/address-discovery.js'

const makeDeps = ({
  usedReceiving = [],
  usedChange = [],
  omitHistoryAt = null,
  omitChain = 'receiving',
} = {}) => {
  const posts = []
  const receiving = new Set(usedReceiving)
  const change = new Set(usedChange)

  return {
    posts,
    getAddressSetAt: async (index) => ({
      receiving: `bitcoincash:qreceive${index}`,
      change: `bitcoincash:qchange${index}`,
    }),
    watchtower: {
      BCH: {
        _api: {
          post: async (path, payload) => {
            posts.push({ path, payload })
            if (path === 'wallet/address-scan/') return { data: {} }

            const results = payload.address_sets.map(({ address_index }) => {
              const result = { address_index }
              for (const chain of ['receiving', 'change']) {
                const address = chain === 'receiving'
                  ? `bitcoincash:qreceive${address_index}`
                  : `bitcoincash:qchange${address_index}`
                result[chain] = { address }
                if (omitHistoryAt === address_index && omitChain === chain) continue
                result[chain].has_history = (chain === 'receiving' ? receiving : change).has(address_index)
              }
              return result
            })

            return { data: { results } }
          },
        },
      },
    },
    walletHash: 'wallet-hash',
    projectId: 'project-id',
  }
}

describe('wallet address discovery', () => {
  it('fails instead of treating a missing history result as unused', async () => {
    const deps = makeDeps({ omitHistoryAt: 3 })

    const result = await discoverWalletAddresses(deps, {
      gapLimit: 5,
      maxScans: 10,
      batchSize: 5,
    })

    assert.equal(result.success, false)
    assert.match(result.error, /no receiving history for index 3/)
    assert.equal(result.subscribed, 0)
    assert.deepEqual(deps.posts.map(({ path }) => path), ['wallet/address-discover/'])
  })

  it('discovers change addresses independently and subscribes through the highest index', async () => {
    const deps = makeDeps({ usedChange: [4] })

    const result = await discoverWalletAddresses(deps, {
      gapLimit: 5,
      maxScans: 10,
      batchSize: 5,
    })

    assert.equal(result.success, true)
    assert.equal(result.complete, true)
    assert.equal(result.hitScanLimit, false)
    assert.deepEqual(result.discoveredChange, [{
      address_index: 4,
      address: 'bitcoincash:qchange4',
    }])
    assert.equal(result.highestChangeIndex, 4)

    const subscribePosts = deps.posts.filter(({ path }) => path === 'wallet/address-scan/')
    assert.equal(subscribePosts.length, 1)
    assert.equal(subscribePosts[0].payload.address_sets.length, 5)
    assert.equal(result.subscribed, 5)
  })

  it('chunks subscriptions and reports a scan-limit result', async () => {
    const deps = makeDeps({ usedChange: [120] })

    const result = await discoverWalletAddresses(deps, {
      gapLimit: 200,
      maxScans: 130,
      batchSize: 50,
    })

    assert.equal(result.success, true)
    assert.equal(result.complete, false)
    assert.equal(result.hitScanLimit, true)
    assert.equal(result.subscribed, 121)

    const subscribePosts = deps.posts.filter(({ path }) => path === 'wallet/address-scan/')
    assert.deepEqual(subscribePosts.map(({ payload }) => payload.address_sets.length), [50, 50, 21])
  })
})

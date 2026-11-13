import assert from 'node:assert'
import axios from 'axios'
import { defaultKeyGenerator } from 'axios-cache-interceptor'
import { generateCacheKey, setupCache } from '../src/utils/axios-cache.js'

const nullPrototype = (o) => Object.assign(Object.create(null), o)
const requestConfig = (params) => nullPrototype({ baseURL: 'https://a.test', url: 'x/', method: 'get', headers: nullPrototype({}), params, data: undefined })

function cachedInstance () {
  let calls = 0
  const adapter = async (config) => {
    calls++
    return { data: { url: config.url, params: config.params }, status: 200, statusText: 'OK', headers: {}, config, request: {} }
  }
  const instance = setupCache(axios.create({ baseURL: 'https://a.test', adapter }))
  return { instance, calls: () => calls }
}

describe('axios-cache key', () => {
  it('raw generator collides on null-proto params', () => {
    assert.strictEqual(defaultKeyGenerator(requestConfig(nullPrototype({ x: 1 }))), defaultKeyGenerator(requestConfig(nullPrototype({ x: 2 }))))
  })

  it('wrapper separates them, nested values included', () => {
    assert.notStrictEqual(generateCacheKey(requestConfig(nullPrototype({ x: 1 }))), generateCacheKey(requestConfig(nullPrototype({ x: 2 }))))
    assert.notStrictEqual(generateCacheKey(requestConfig(nullPrototype({ f: nullPrototype({ a: 1 }) }))), generateCacheKey(requestConfig(nullPrototype({ f: nullPrototype({ a: 2 }) }))))
  })

  it('caches per params through a real axios instance', async () => {
    const { instance, calls } = cachedInstance()
    const a = await instance.get('/p', { params: { x: 1 } })
    const b = await instance.get('/p', { params: { x: 1 } })
    const c = await instance.get('/p', { params: { x: 2 } })
    assert.deepStrictEqual([a.cached, b.cached, c.cached], [false, true, false])
    assert.strictEqual(c.data.params.x, 2)
    assert.strictEqual(calls(), 2)
  })

  for (const header of ['Authorization', 'X-Paytaca-Customer']) {
    it(`does not store responses to requests with an ${header} header`, async () => {
      const { instance, calls } = cachedInstance()
      await instance.get('/me', { headers: { [header]: 'a' } })
      const second = await instance.get('/me', { headers: { [header]: 'b' } })
      assert.strictEqual(second.cached, false)
      assert.strictEqual(calls(), 2)
    })
  }
})

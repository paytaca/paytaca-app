import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as libauth from '@bitauth/libauth'

let moduleId = 0
async function isolatedModule(path, dependencies) {
  const file = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  const source = path.endsWith('.vue') ? file.match(/<script>([\s\S]*?)<\/script>/)[1] : file
  const id = `cardRegistrationTest${moduleId++}`
  globalThis[id] = dependencies
  const bindings = `const { ${Object.keys(dependencies).join(', ')} } = globalThis.${id};\n`
  try {
    return await import(`data:text/javascript;base64,${Buffer.from(bindings + source.replace(/^import .*\n/gm, '')).toString('base64')}`)
  } finally {
    delete globalThis[id]
  }
}

const privateKey = new Uint8Array(32).fill(1)
const publicKey = libauth.binToHex(libauth.secp256k1.derivePublicKeyCompressed(privateKey))
const wif = libauth.encodePrivateKeyWif(privateKey, 'mainnet')
const httpError = (status, data = {}, headers = {}) => Object.assign(new Error('HTTP failure'), {
  response: { status, data, headers },
})
const logger = { error() { throw new Error('Authentication errors must not be logged') } }
let signMessage

before(async () => {
  const { Wallet } = await isolatedModule('src/services/wallet.js', {
    ...libauth, cardLogger: logger,
  })
  signMessage = Wallet.prototype.signMessage
})

async function setup(options = {}) {
  let userModule
  let registered = options.existing || false
  let authenticated = options.authenticated || false
  let registrationCount = 0
  const calls = []
  const storage = new Map()
  const wallet = {
    walletHash: 'wallet-hash',
    path: '0/0',
    addressPath() { return this.path },
    pubkey(path) {
      assert.equal(path, '0/0')
      return options.publicKey || publicKey.toUpperCase()
    },
    keypair(path) {
      assert.equal(path, '0/0')
      return { publicKey: publicKey.toUpperCase(), privateKey: wif }
    },
    privkey() { return wif },
    signMessage,
  }
  const requestHandlers = []
  const responseHandlers = []
  const axios = {
    create() {
      const client = async config => {
        try {
          for (const fn of requestHandlers) config = await fn(config)
          calls.push({ method: config.method, url: config.url, data: config.data, authorize: config.authorize })
          let response
          if (config.method === 'get' && config.url.startsWith('/auth/user/')) {
            if (options.lookupError) throw options.lookupError
            if (!registered) throw httpError(404)
            response = { data: { public_key: options.registeredKey || publicKey, is_authenticated: authenticated } }
          } else if (config.url === '/user/registration-challenge/') {
            if (options.challengeError) throw options.challengeError
            if (options.onChallenge) options.onChallenge(wallet)
            response = { data: { challenge: ` exact\nregistration-${registrationCount}\u00e9 ` } }
          } else if (config.url === '/user/') {
            registrationCount++
            if (options.onRegister) await options.onRegister(config, registrationCount)
            if (options.registrationError) throw options.registrationError
            registered = true
            if (options.lostResponse) throw httpError(503)
            response = { status: 201, data: {} }
          } else if (config.url === '/auth/user/challenge/') {
            if (options.loginError) throw options.loginError
            if (!registered) throw httpError(404)
            response = { data: { challenge: ' exact login challenge ' } }
          } else if (config.url === '/auth/user/verify/') {
            assert.equal(libauth.secp256k1.verifySignatureDER(
              libauth.hexToBin(config.data.signature), libauth.hexToBin(config.data.public_key),
              libauth.sha256.hash(libauth.utf8ToBin(' exact login challenge ')),
            ), true)
            authenticated = true
            response = { data: { token: 'test-session' } }
          } else if (config.url === '/cards/') {
            response = { data: { results: [] } }
          } else {
            throw new Error(`Unexpected request ${config.url}`)
          }
          return response
        } catch (caught) {
          let error = caught
          error.config ||= config
          for (const [, reject] of responseHandlers) {
            try { return await reject(error) } catch (next) { error = next }
          }
          throw error
        }
      }
      client.get = (url, config = {}) => client({ ...config, url, method: 'get', headers: {} })
      client.post = (url, data, config = {}) => client({ ...config, url, data, method: 'post', headers: {} })
      client.interceptors = {
        request: { use: fn => requestHandlers.push(fn) },
        response: { use: (...fns) => responseHandlers.push(fns) },
      }
      return client
    },
  }
  const previousBaseUrl = process.env.MAINNET_CARD_API_BASE_URL
  process.env.MAINNET_CARD_API_BASE_URL = 'https://example.test/api'
  let backend
  try {
    ;({ backend } = await isolatedModule('src/services/card/backend.js', {
      axios, loadWallet: async () => wallet,
      getAuthToken: () => userModule.getAuthToken(),
      clearAuthToken: () => userModule.clearAuthToken(),
      clearCardUserCache: () => userModule.clearCardUserCache(),
      saveAuthToken: value => userModule.saveAuthToken(value),
      shouldTreatAsMaintenance: () => false,
    }))
  } finally {
    if (previousBaseUrl === undefined) delete process.env.MAINNET_CARD_API_BASE_URL
    else process.env.MAINNET_CARD_API_BASE_URL = previousBaseUrl
  }
  userModule = await isolatedModule('src/services/card/user.js', {
    backend, cardLogger: logger, loadWallet: async () => wallet,
    AuthNftService: { initializeWithWallet: async () => ({}) },
    SecureStoragePlugin: {
      get: async ({ key }) => ({ value: storage.get(key) ?? null }),
      set: async ({ key, value }) => { storage.set(key, value); return { value } },
      remove: async ({ key }) => storage.delete(key),
    },
  })
  return { ...userModule, backend, calls, storage, wallet }
}

const registrations = ctx => ctx.calls.filter(call => call.url === '/user/')
const challenges = ctx => ctx.calls.filter(call => call.url === '/user/registration-challenge/')
const logins = ctx => ctx.calls.filter(call => call.url === '/auth/user/verify/')

describe('NFC wallet registration', () => {
  it('registers only after a missing-wallet lookup, then logs in and caches the session', async () => {
    const ctx = await setup()
    const user = await ctx.loadCardUser()
    assert.equal(user.is_authenticated, true)
    assert.deepEqual(ctx.calls.map(call => call.url), [
      '/auth/user/wallet-hash', '/user/registration-challenge/', '/user/',
      '/auth/user/challenge/', '/auth/user/verify/', '/auth/user/wallet-hash',
    ])
    assert.equal(await ctx.loadCardUser(), user)
    assert.equal(await ctx.getAuthToken(), 'test-session')
    assert.equal(registrations(ctx).length, 1)
    assert.equal(logins(ctx).length, 1)
    const issued = challenges(ctx)[0].data
    const submitted = registrations(ctx)[0].data
    assert.deepEqual(issued, { wallet_hash: 'wallet-hash', public_key: publicKey, address_path: '0/0' })
    assert.deepEqual({ ...submitted, challenge: undefined, signature: undefined }, {
      ...issued, challenge: undefined, signature: undefined,
    })
    assert.match(submitted.signature, /^[0-9a-f]+$/)
    const digest = libauth.sha256.hash(libauth.utf8ToBin(submitted.challenge))
    assert.equal(libauth.secp256k1.verifySignatureDER(libauth.hexToBin(submitted.signature), libauth.hexToBin(publicKey), digest), true)
    assert.equal(libauth.secp256k1.verifySignatureDER(libauth.hexToBin(submitted.signature), libauth.hexToBin(publicKey), libauth.sha256.hash(digest)), false)
    for (const call of ctx.calls.filter(call => call.method === 'post')) assert.equal(call.authorize, false)
  })

  it('uses login for an existing wallet, including forced session refresh', async () => {
    const ctx = await setup({ existing: true })
    await ctx.loadCardUser()
    await ctx.loadCardUser({ forceLogin: true })
    assert.equal(registrations(ctx).length, 0)
    assert.equal(challenges(ctx).length, 0)
    assert.equal(logins(ctx).length, 2)
  })

  it('preserves an authenticated existing session without login or registration', async () => {
    const ctx = await setup({ existing: true, authenticated: true })
    await ctx.loadCardUser()
    assert.equal(ctx.calls.length, 1)
  })

  it('shares registration among concurrent card loads and logs in once even with forceLogin', async () => {
    const ctx = await setup()
    await Promise.all([ctx.loadCardUser({ forceLogin: true }), ctx.loadCardUser(), ctx.loadCardUser()])
    assert.equal(registrations(ctx).length, 1)
    assert.equal(logins(ctx).length, 1)
  })

  it('gets a fresh challenge and signature once after explicit expiration', async () => {
    const ctx = await setup({ onRegister: (config, count) => {
      if (count === 1) throw httpError(400, { code: 'challenge_expired' })
    } })
    await ctx.loadCardUser()
    assert.equal(challenges(ctx).length, 2)
    const [first, second] = registrations(ctx).map(call => call.data)
    assert.notEqual(first.challenge, second.challenge)
    assert.notEqual(first.signature, second.signature)
    assert.deepEqual(challenges(ctx)[0].data, challenges(ctx)[1].data)
  })

  it('stops after two expired challenges', async () => {
    const ctx = await setup({ registrationError: httpError(400, { challenge: ['Challenge expired.'] }) })
    await assert.rejects(ctx.loadCardUser())
    assert.equal(registrations(ctx).length, 2)
    assert.equal(logins(ctx).length, 0)
  })

  it('refreshes locally expired challenges without submitting them', async () => {
    const originalNow = Date.now
    let now = originalNow()
    Date.now = () => now
    try {
      let count = 0
      const ctx = await setup({ onChallenge: () => { if (!count++) now += 120001 } })
      await ctx.loadCardUser()
      assert.equal(challenges(ctx).length, 2)
      assert.equal(registrations(ctx).length, 1)
    } finally { Date.now = originalNow }
  })

  for (const status of [400, 409]) {
    it(`surfaces duplicate-wallet conflicts (${status}) without switching keys or logging in`, async () => {
      const ctx = await setup({ registrationError: httpError(status, { wallet_hash: ['This field must be unique.'] }) })
      await assert.rejects(ctx.loadCardUser(), error => error.code === 'NFC_IDENTITY_CONFLICT')
      assert.equal(registrations(ctx).length, 1)
      assert.equal(logins(ctx).length, 0)
      assert.equal(ctx.storage.size, 0)
    })
  }

  it('rejects a different key on an existing wallet without attempting registration', async () => {
    const ctx = await setup({ existing: true, registeredKey: '03' + '02'.repeat(32) })
    await assert.rejects(ctx.loadCardUser(), error => error.code === 'NFC_IDENTITY_CONFLICT')
    assert.equal(registrations(ctx).length, 0)
    assert.equal(logins(ctx).length, 0)
  })

  it('does not treat an arbitrary HTTP 400 as successful registration', async () => {
    const ctx = await setup({ registrationError: httpError(400, { signature: ['Invalid signature.'] }) })
    await assert.rejects(ctx.loadCardUser())
    assert.equal(logins(ctx).length, 0)
    assert.equal(ctx.storage.size, 0)
  })

  for (const error of [new Error('connection lost'), httpError(503)]) {
    it(`recovers through login when registration succeeded but its response was lost (${error.response?.status || 'network'})`, async () => {
      const ctx = await setup({ lostResponse: true })
      const originalPost = ctx.backend.post
      if (!error.response) ctx.backend.post = async (...args) => {
        try { return await originalPost(...args) } catch (caught) {
          if (args[0] === '/user/') throw error
          throw caught
        }
      }
      assert.equal((await ctx.loadCardUser()).is_authenticated, true)
      assert.equal(registrations(ctx).length, 1)
      assert.equal(logins(ctx).length, 1)
    })
  }

  it('requires successful login to recover an ambiguous registration failure', async () => {
    const ctx = await setup({ registrationError: httpError(503) })
    await assert.rejects(ctx.loadCardUser())
    assert.equal(registrations(ctx).length, 1)
    assert.equal(ctx.calls.filter(call => call.url === '/auth/user/challenge/').length, 1)
    assert.equal(ctx.storage.size, 0)
  })

  for (const lookupError of [httpError(401), httpError(500), new Error('offline')]) {
    it(`does not register on lookup failures other than 404 (${lookupError.response?.status || 'offline'})`, async () => {
      const ctx = await setup({ lookupError })
      await assert.rejects(ctx.loadCardUser())
      assert.equal(registrations(ctx).length, 0)
    })
  }

  for (const phase of ['challenge', 'registration', 'login']) {
    for (const header of ['30', 'date']) {
      it(`respects ${header} Retry-After on ${phase}, including repeated UI attempts`, async () => {
        const originalNow = Date.now
        let now = Math.floor(originalNow() / 1000) * 1000
        Date.now = () => now
        try {
          const rateLimit = httpError(429, {}, { 'retry-after': header === 'date' ? new Date(now + 30000).toUTCString() : header })
          const options = phase === 'challenge' ? { challengeError: rateLimit }
            : phase === 'registration' ? { registrationError: rateLimit } : { existing: true, loginError: rateLimit }
          const ctx = await setup(options)
          await assert.rejects(ctx.loadCardUser(), error => error.response.status === 429 && error.retryAfterSeconds === 30)
          const count = ctx.calls.length
          await assert.rejects(ctx.loadCardUser(), error => error.response.status === 429)
          assert.equal(ctx.calls.length, count)
          now += 30001
          await assert.rejects(ctx.loadCardUser())
          assert.ok(ctx.calls.length > count)
        } finally { Date.now = originalNow }
      })
    }
  }

  it('keeps path and key fixed even when wallet address selection changes mid-challenge', async () => {
    const ctx = await setup({ onChallenge: wallet => { wallet.path = '0/1' } })
    assert.equal((await ctx.loadCardUser()).is_authenticated, true)
    assert.equal(registrations(ctx)[0].data.address_path, '0/0')
    assert.equal(logins(ctx).length, 1)
  })

  it('does not reuse a cached card identity after switching wallets', async () => {
    const ctx = await setup({ existing: true, authenticated: true })
    await ctx.loadCardUser()
    ctx.wallet.walletHash = 'another-wallet'
    await ctx.loadCardUser()
    assert.equal(ctx.calls.at(-1).url, '/auth/user/another-wallet')
  })

  it('rejects an uncompressed public key before sending registration requests', async () => {
    const ctx = await setup({ publicKey: '04' + '01'.repeat(64) })
    await assert.rejects(ctx.loadCardUser(), /Invalid NFC wallet public key/)
    assert.equal(ctx.calls.length, 0)
  })

  it('strips request payloads and secrets from authentication errors', async () => {
    const failure = httpError(400, { signature: ['Invalid'] })
    failure.config = { data: { signature: 'sensitive-signature', challenge: 'sensitive-challenge' } }
    const ctx = await setup({ registrationError: failure })
    await assert.rejects(ctx.loadCardUser(), error => {
      assert.equal(error.config, undefined)
      assert.equal(error.response.data, undefined)
      assert.doesNotMatch(JSON.stringify(error), /sensitive/)
      return true
    })
  })
})

describe('NFC registration entry points', () => {
  it('loads and refreshes the card layout using the forceLogin option', async () => {
    const ctx = await setup({ existing: true, authenticated: true })
    const { default: layout } = await isolatedModule('src/pages/apps/card/index.vue', {
      ...ctx, createCardLogic: {}, CardPageHeader: {},
    })
    const instance = {
      $t: text => text,
      $q: { notify: assert.fail },
      showLoading() {}, hideLoading() {},
    }
    await layout.methods.loadUser.call(instance)
    await layout.methods.loadUser.call(instance, true)
    assert.equal(registrations(ctx).length, 0)
    assert.equal(logins(ctx).length, 1)
  })

  it('shows identity conflicts on the card screen', async () => {
    const ctx = await setup({ registrationError: httpError(409) })
    const { default: mixin } = await isolatedModule('src/mixins/card/card-mixin.js', ctx)
    const notices = []
    const instance = { $q: { notify: value => notices.push(value) } }
    await mixin.methods.loadUser.call(instance)
    assert.equal(instance.user, null)
    assert.equal(notices[0].type, 'error')
    assert.match(notices[0].message, /another identity/)
  })

  it('loads the card user from the actual first-setup/card-list helper', async () => {
    const ctx = await setup()
    const { createCardLogic } = await isolatedModule('src/components/card/createCard.js', { ...ctx, cardLogger: logger, getMerchantList: async () => ({ results: [] }) })
    const instance = { ...createCardLogic.methods }
    assert.deepEqual(await instance.getCards(), [])
    assert.equal(registrations(ctx).length, 1)
  })

  it('loads the card user from the card screen mixin', async () => {
    const ctx = await setup()
    const { default: mixin } = await isolatedModule('src/mixins/card/card-mixin.js', ctx)
    const instance = { $q: { notify: assert.fail } }
    await mixin.methods.loadUser.call(instance)
    assert.equal(instance.user.is_authenticated, true)
    assert.equal(registrations(ctx).length, 1)
  })

  it('loads the card user from the actual Vuex card-list action', async () => {
    const ctx = await setup()
    const actions = await isolatedModule('src/store/card/actions.js', ctx)
    const commits = []
    await actions.fetchCards({ commit: (...args) => commits.push(args) })
    assert.deepEqual(commits, [['setCards', []]])
    assert.equal(registrations(ctx).length, 1)
  })

  it('loads the card user when resuming activation without an explicit wallet hash', async () => {
    const ctx = await setup()
    const storage = await isolatedModule('src/services/card/storage.js', { ...ctx, cardLogger: logger })
    const previous = globalThis.localStorage
    globalThis.localStorage = { getItem: () => null }
    try {
      assert.equal(await storage.getCardActivationAttempt(), null)
      assert.equal(registrations(ctx).length, 1)
    } finally { globalThis.localStorage = previous }
  })
})

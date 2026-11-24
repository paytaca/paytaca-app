import assert from 'node:assert/strict'

import {
  LookupKeyExistsError,
  getLookupKey,
  hasLookupKey,
  mintLookupKey,
  revokeLookupKey
} from '../src/wallet/lookup-key.js'
import { SecureStoragePlugin } from './mocks/secure-storage.mjs'
import { backend, authToken, resetPosMock } from './mocks/pos.mjs'
import { Store, resetStoreMock } from './mocks/store.mjs'

const WALLET_HASH = 'a'.repeat(64)
const LOOKUP_KEY = 'k'.repeat(40)
const wallet = { BCH: { walletHash: WALLET_HASH } }

const originalError = console.error

let consoleErrors = []

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), {
  response: { status }
})

const setCurrentWallet = (hash = WALLET_HASH) => {
  Store.getters['global/getWallet'] = () => ({ walletHash: hash })
}

/** Stub a successful mint and persist nothing by itself. */
const stubMint = (key = LOOKUP_KEY) => {
  authToken.get = async () => 'token'
  backend.post = async () => ({ data: { lookup_key: key } })
  return key
}

describe('lookup key storage', () => {
  beforeEach(() => {
    resetStoreMock()
    resetPosMock()
    setCurrentWallet()
    SecureStoragePlugin._store.clear()
    SecureStoragePlugin._getErrors.clear()
    consoleErrors = []
    console.error = (...args) => consoleErrors.push(args)
  })

  afterEach(() => {
    console.error = originalError
    // The store mock is shared with the MLS and chat specs, so never leave a
    // chipnet flag or wallet override behind.
    resetStoreMock()
  })

  describe('getLookupKey', () => {
    it('returns null when the key is missing', async () => {
      assert.equal(await getLookupKey(WALLET_HASH), null)
      assert.equal(consoleErrors.length, 1)
    })

    it('returns the stored key', async () => {
      stubMint()
      const key = await mintLookupKey(wallet)

      assert.equal(await getLookupKey(WALLET_HASH), key)
    })

    it('returns null when secure storage cannot be read', async () => {
      stubMint()
      await mintLookupKey(wallet)
      const [storageKey] = [...SecureStoragePlugin._store.keys()]
      SecureStoragePlugin._getErrors.set(storageKey, 'SECURE_STORAGE_DECRYPT_FAILED')

      assert.equal(await getLookupKey(WALLET_HASH), null)
      assert.equal(consoleErrors.length, 1)
    })
  })

  describe('hasLookupKey', () => {
    it('reports whether a key is stored for the wallet', async () => {
      assert.equal(await hasLookupKey(WALLET_HASH), false)

      stubMint()
      await mintLookupKey(wallet)

      assert.equal(await hasLookupKey(WALLET_HASH), true)
    })
  })

  describe('mintLookupKey', () => {
    it('does nothing on chipnet', async () => {
      Store.getters['global/isChipnet'] = true
      let called = false
      backend.post = async () => {
        called = true
      }

      assert.equal(await mintLookupKey(wallet), null)
      assert.equal(called, false)
    })

    it('refuses a wallet that is not the current one', async () => {
      setCurrentWallet('b'.repeat(64))

      await assert.rejects(
        () => mintLookupKey(wallet),
        /Lookup keys can only be minted for the current wallet/
      )
    })

    it('refuses the services Wallet shape', async () => {
      await assert.rejects(
        () => mintLookupKey({ walletHash: WALLET_HASH }),
        /Lookup keys require a wallet from src\/wallet/
      )
    })

    it('refuses a wallet without a hash', async () => {
      await assert.rejects(
        () => mintLookupKey({}),
        /Wallet hash is unavailable/
      )
    })

    it('maps a 409 to LookupKeyExistsError and stores nothing', async () => {
      authToken.get = async () => 'token'
      backend.post = async () => {
        throw httpError(409)
      }

      await assert.rejects(
        () => mintLookupKey(wallet),
        (error) => {
          assert.ok(error instanceof LookupKeyExistsError)
          assert.equal(error.code, 'lookup_key_already_exists')
          return true
        }
      )
      assert.equal(SecureStoragePlugin._store.size, 0)
    })

    it('stores and returns the minted key', async () => {
      stubMint()
      const posted = []
      backend.post = async (...args) => {
        posted.push(args)
        return { data: { lookup_key: LOOKUP_KEY } }
      }

      const key = await mintLookupKey(wallet)

      assert.equal(key, LOOKUP_KEY)
      assert.equal(await getLookupKey(WALLET_HASH), LOOKUP_KEY)
      assert.equal(posted[0][0], 'wallet/lookup-keys/')
      assert.deepEqual(posted[0][1], { label: 'engagement-hub' })
      assert.equal(posted[0][2].headers.Authorization, 'Token token')
    })

    it('regenerates the token once after a 403', async () => {
      let attempts = 0
      authToken.get = async () => 'stale'
      authToken.generate = async () => 'fresh'
      backend.post = async (url, body, config) => {
        attempts++
        if (attempts === 1) throw httpError(403)
        assert.equal(config.headers.Authorization, 'Token fresh')
        return { data: { lookup_key: LOOKUP_KEY } }
      }

      const key = await mintLookupKey(wallet)

      assert.equal(key, LOOKUP_KEY)
      assert.equal(attempts, 2)
    })

    it('rethrows when the retry is also a 403', async () => {
      authToken.get = async () => 'stale'
      authToken.generate = async () => 'fresh'
      backend.post = async () => {
        throw httpError(403)
      }

      await assert.rejects(() => mintLookupKey(wallet), /HTTP 403/)
      assert.equal(SecureStoragePlugin._store.size, 0)
    })

    it('fails when no auth token can be obtained', async () => {
      authToken.get = async () => null
      authToken.generate = async () => null

      await assert.rejects(
        () => mintLookupKey(wallet),
        /Unable to obtain a Watchtower auth token/
      )
    })
  })

  describe('revokeLookupKey', () => {
    it('revokes and clears the stored key', async () => {
      stubMint()
      await mintLookupKey(wallet)
      authToken.get = async () => 'token'
      let deleted = 0
      backend.delete = async () => {
        deleted++
        return { data: {} }
      }

      assert.equal(await revokeLookupKey(wallet), true)
      assert.equal(deleted, 1)
      assert.equal(await getLookupKey(WALLET_HASH), null)
    })

    it('clears the stored key when Watchtower has none', async () => {
      stubMint()
      await mintLookupKey(wallet)
      authToken.get = async () => 'token'
      backend.delete = async () => {
        throw httpError(404)
      }

      assert.equal(await revokeLookupKey(wallet), false)
      assert.equal(await getLookupKey(WALLET_HASH), null)
    })

    it('does nothing on chipnet', async () => {
      Store.getters['global/isChipnet'] = true
      let called = false
      backend.delete = async () => {
        called = true
      }

      assert.equal(await revokeLookupKey(wallet), false)
      assert.equal(called, false)
    })
  })
})

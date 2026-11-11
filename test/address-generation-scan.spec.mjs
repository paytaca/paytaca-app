/**
 * Receiving/change address freshness scan.
 *
 * Covers `findUnusedAddressIndex` for both wallet kinds:
 *  - mnemonic wallets derive candidates from the seed and hash mnemonic+path
 *  - read-only (xpub) wallets derive candidates from the xpub and hash the xpub
 *
 * The scan is security-sensitive: it must never report an address as unused
 * when watchtower did not positively say so.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { register } from 'node:module'

register(new URL('./address-scan-loader.mjs', import.meta.url))

const { findUnusedAddressIndex } = await import('../src/utils/address-generation-utils.js')

const DERIVATION_PATH = "m/44'/145'/0'"
const MNEMONIC = 'abandon ability able'

const sha256 = (input) => createHash('sha256').update(String(input)).digest('hex')
const expectedMnemonicWalletHash = () => sha256(sha256(MNEMONIC) + sha256(DERIVATION_PATH))

const readOnlyEntry = () => ({
  settings: { isReadOnly: true },
  readOnly: { xpub: 'xpub-test' }
})

const makeReadOnlyWallet = ({ mainnet = 'xpub-hash-mainnet', chipnet = 'xpub-hash-chipnet' } = {}) => ({
  walletHashFor: (network) => (network === 'chipnet' ? chipnet : mainnet),
  getAddressAt: (path, network) => {
    const prefix = network === 'chipnet' ? 'bchtest' : 'bitcoincash'
    return `${prefix}:ro-${String(path).split('/').join('-')}`
  }
})

const resetStub = (overrides = {}) => {
  const stub = {
    mnemonic: MNEMONIC,
    mnemonicCalls: [],
    vault: [],
    readOnlyWallet: null,
    used: { receiving: [], change: [] },
    omit: null,
    posts: []
  }
  Object.assign(stub, overrides)
  globalThis.__addressScanStub = stub
  return stub
}

const addressSets = (stub, call = 0) => stub.posts[call].body.address_sets
const chainOf = (set) => Object.keys(set).find((key) => key !== 'address_index')

describe('address generation scan', () => {
  describe('mnemonic wallets', () => {
    it('returns the first receiving address with no history', async () => {
      const stub = resetStub({ used: { receiving: [1, 2], change: [] } })

      const result = await findUnusedAddressIndex({ walletIndex: 3, derivationPath: DERIVATION_PATH })

      assert.deepEqual(result, { address: 'bitcoincash:0-3', addressIndex: 3 })
      assert.deepEqual(stub.mnemonicCalls, [3])

      const sets = addressSets(stub)
      assert.equal(sets[0].address_index, 1)
      assert.equal(sets[0].receiving, 'bitcoincash:0-1')
      assert.equal(chainOf(sets[0]), 'receiving')
      assert.equal(stub.posts[0].url, 'https://watchtower.cash/api/wallet/address-discover/')
      assert.equal(stub.posts[0].body.wallet_hash, expectedMnemonicWalletHash())
    })

    it('starts receiving scans at index 1 because 0/0 is reserved', async () => {
      const stub = resetStub()

      const result = await findUnusedAddressIndex({
        walletIndex: 0,
        derivationPath: DERIVATION_PATH,
        startIndex: 0
      })

      assert.equal(result.addressIndex, 1)
      assert.equal(addressSets(stub)[0].address_index, 1)
    })

    it('scans the change chain independently of the receiving chain', async () => {
      const stub = resetStub({ used: { receiving: [1], change: [0, 1] } })

      const result = await findUnusedAddressIndex({
        walletIndex: 0,
        derivationPath: DERIVATION_PATH,
        chain: 'change'
      })

      assert.deepEqual(result, { address: 'bitcoincash:1-2', addressIndex: 2 })

      const sets = addressSets(stub)
      assert.equal(sets[0].address_index, 0)
      assert.equal(chainOf(sets[0]), 'change')
      assert.equal(sets[0].change, 'bitcoincash:1-0')
    })

    it('requests the next batch when every candidate has history', async () => {
      const usedReceiving = Array.from({ length: 20 }, (_, i) => i + 1)
      const stub = resetStub({ used: { receiving: usedReceiving, change: [] } })

      const result = await findUnusedAddressIndex({ walletIndex: 0, derivationPath: DERIVATION_PATH })

      assert.equal(result.addressIndex, 21)
      assert.equal(stub.posts.length, 2)
      assert.equal(addressSets(stub, 1)[0].address_index, 21)
    })

    it('throws instead of treating an unverified address as unused', async () => {
      resetStub({ used: { receiving: [1], change: [] }, omit: { chain: 'receiving', index: 2 } })

      await assert.rejects(
        findUnusedAddressIndex({ walletIndex: 0, derivationPath: DERIVATION_PATH }),
        /Unable to verify address freshness/
      )
    })

    it('throws when the wallet has no mnemonic', async () => {
      resetStub({ mnemonic: null })

      await assert.rejects(
        findUnusedAddressIndex({ walletIndex: 0, derivationPath: DERIVATION_PATH }),
        /Mnemonic not found/
      )
    })
  })

  describe('read-only (xpub) wallets', () => {
    it('derives receiving candidates and the wallet hash from the xpub', async () => {
      const stub = resetStub({
        vault: [readOnlyEntry()],
        readOnlyWallet: makeReadOnlyWallet(),
        used: { receiving: [1, 2], change: [] }
      })

      const result = await findUnusedAddressIndex({ walletIndex: 0, derivationPath: DERIVATION_PATH })

      assert.deepEqual(result, { address: 'bitcoincash:ro-0-3', addressIndex: 3 })
      assert.deepEqual(stub.mnemonicCalls, [])

      const sets = addressSets(stub)
      assert.equal(sets[0].address_index, 1)
      assert.equal(sets[0].receiving, 'bitcoincash:ro-0-1')
      assert.equal(stub.posts[0].body.wallet_hash, 'xpub-hash-mainnet')
    })

    it('uses the chipnet xpub hash and testnet addresses', async () => {
      const stub = resetStub({
        vault: [readOnlyEntry()],
        readOnlyWallet: makeReadOnlyWallet({ chipnet: 'xpub-hash-chipnet' })
      })

      const result = await findUnusedAddressIndex({
        walletIndex: 0,
        derivationPath: DERIVATION_PATH,
        isChipnet: true
      })

      assert.deepEqual(result, { address: 'bchtest:ro-0-1', addressIndex: 1 })
      assert.equal(stub.posts[0].url, 'https://chipnet.watchtower.cash/api/wallet/address-discover/')
      assert.equal(stub.posts[0].body.wallet_hash, 'xpub-hash-chipnet')
      assert.equal(addressSets(stub)[0].receiving, 'bchtest:ro-0-1')
    })

    it('scans the xpub change chain', async () => {
      resetStub({
        vault: [readOnlyEntry()],
        readOnlyWallet: makeReadOnlyWallet(),
        used: { receiving: [], change: [0, 1] }
      })

      const result = await findUnusedAddressIndex({
        walletIndex: 0,
        derivationPath: DERIVATION_PATH,
        chain: 'change'
      })

      assert.deepEqual(result, { address: 'bitcoincash:ro-1-2', addressIndex: 2 })
    })

    it('throws for unverified xpub candidates', async () => {
      resetStub({
        vault: [readOnlyEntry()],
        readOnlyWallet: makeReadOnlyWallet(),
        used: { receiving: [1], change: [] },
        omit: { chain: 'receiving', index: 2 }
      })

      await assert.rejects(
        findUnusedAddressIndex({ walletIndex: 0, derivationPath: DERIVATION_PATH }),
        /Unable to verify address freshness/
      )
    })

    it('throws when the xpub wallet cannot be loaded', async () => {
      resetStub({ vault: [readOnlyEntry()], readOnlyWallet: null, mnemonic: null })

      await assert.rejects(
        findUnusedAddressIndex({ walletIndex: 0, derivationPath: DERIVATION_PATH }),
        /Mnemonic not found/
      )
    })
  })
})

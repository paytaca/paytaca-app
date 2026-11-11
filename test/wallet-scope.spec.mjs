import assert from 'node:assert/strict'
import { createWalletScopeTracker } from '../src/store/nostr-chat/wallet-scope.js'

const setup = (initialHash = 'wallet-a') => {
  let active = initialHash
  let bumps = 0
  const tracker = createWalletScopeTracker(() => active, () => { bumps++ })
  return {
    tracker,
    bumps: () => bumps,
    switchTo: (hash) => { active = hash },
  }
}

describe('createWalletScopeTracker', () => {
  it('keeps an unchanged wallet valid across awaits', () => {
    const { tracker } = setup()
    const isCurrent = tracker.capture()
    assert.equal(isCurrent(), true)
    assert.equal(isCurrent(), true)
  })

  it('invalidates captured scopes when the wallet hash changes', () => {
    const { tracker, switchTo } = setup()
    const isCurrent = tracker.capture()
    switchTo('wallet-b')
    assert.equal(isCurrent(), false)
  })

  it('invalidates captured scopes on explicit bump even for the same wallet', () => {
    const { tracker, bumps } = setup()
    const isCurrent = tracker.capture()
    tracker.bump()
    assert.equal(bumps(), 1)
    assert.equal(isCurrent(), false)
  })

  it('returns null when no wallet is active, so callers treat the scope as unusable', () => {
    const { tracker } = setup(null)
    assert.equal(tracker.capture(), null)
  })

  it('keeps a scope captured before a round trip invalid even after switching back', () => {
    const { tracker, switchTo } = setup()
    const isCurrent = tracker.capture()
    tracker.bump()
    switchTo('wallet-b')
    switchTo('wallet-a')
    assert.equal(isCurrent(), false)
  })
})

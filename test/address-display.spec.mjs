import assert from 'node:assert/strict'
import { shortenAddressForDisplay } from '../src/utils/address-utils.js'

const MAINNET = 'bitcoincash:qz97djdjktl0dvawp79a73jlq7cy95stcvx8sk9fwe'
const TESTNET = 'bchtest:qz97djdjktl0dvawp79a73jlq7cy95stcvx8sk9fwe'

describe('shortenAddressForDisplay', () => {
  it('shortens a mainnet address passed as a string', () => {
    assert.equal(shortenAddressForDisplay(MAINNET), 'bitcoincash:qz97...9fwe')
  })

  it('shortens a testnet address passed as a string', () => {
    assert.equal(shortenAddressForDisplay(TESTNET), 'bchtest:qz97...9fwe')
  })

  it('shortens an address passed as an object', () => {
    assert.equal(shortenAddressForDisplay({ address: MAINNET }), 'bitcoincash:qz97...9fwe')
    assert.equal(shortenAddressForDisplay({ address: TESTNET }), 'bchtest:qz97...9fwe')
  })

  it('renders nullish or empty input as an empty string', () => {
    assert.equal(shortenAddressForDisplay(), '')
    assert.equal(shortenAddressForDisplay(null), '')
    assert.equal(shortenAddressForDisplay(''), '')
    assert.equal(shortenAddressForDisplay({}), '')
  })
})

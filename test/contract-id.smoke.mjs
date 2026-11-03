/**
 * Smoke test for the vendored contract id parameter reading TapToPay uses.
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/contract-id.smoke.mjs
 * or:
 *   npm run test:smoke
 *
 * The parameter segments below are verbatim from ids @mainnet-cash/contract 2.7.34 wrote for
 * these parameters, and its Contract.fromId read them back as the expected values. The source
 * segment, which the parameters are read without, is shortened.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const { contractIdParameters } = await import('../src/vendor/mainnet-js/contract-id.js')
const artifact = (file) => JSON.parse(readFileSync(new URL(`../src/services/card/contract/${file}`, import.meta.url), 'utf8'))
const hex = (params) => params.map((param) => Buffer.from(param).toString('hex'))

const source = Buffer.from('contract TapToPay() {}').toString('base64')

// TapToPay v1: ownerPkh, backendPkh, category
const v1 = ['contract', 'mainnet', 'TVRjc01UY3NNVGNzTVRjc01UY3NNVGNzTVRjc01UY3NNVGNzTVRjc01UY3NNVGNzTVRjc01UY3NNVGNzTVRjc01UY3NNVGNzTVRjc01UYz06TXpRc016UXNNelFzTXpRc016UXNNelFzTXpRc016UXNNelFzTXpRc016UXNNelFzTXpRc016UXNNelFzTXpRc016UXNNelFzTXpRc016UT06TlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URXNOVEVzTlRFc05URT0=', source, '7'].join(':')
assert.deepEqual(hex(contractIdParameters(v1, artifact('TapToPay.json'))), [
  '1111111111111111111111111111111111111111',
  '2222222222222222222222222222222222222222',
  '3333333333333333333333333333333333333333333333333333333333333333'
])

// TapToPay v2: backendPkh, category
const v2 = ['contract', 'testnet', 'Tmpnc05qZ3NOamdzTmpnc05qZ3NOamdzTmpnc05qZ3NOamdzTmpnc05qZ3NOamdzTmpnc05qZ3NOamdzTmpnc05qZ3NOamdzTmpnc05qZz06T0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVXNPRFVzT0RVc09EVT0=', source, '1611368304'].join(':')
assert.deepEqual(hex(contractIdParameters(v2, artifact('TapToPay-V2.json'))), [
  '4444444444444444444444444444444444444444',
  '5555555555555555555555555555555555555555555555555555555555555555'
])

// a bytes parameter written as hex rather than as a comma list reads the same
const b64 = (s) => Buffer.from(s, 'latin1').toString('base64')
const hexId = ['contract', 'mainnet', b64(['ab'.repeat(20), 'cd'.repeat(32)].map(b64).join(':')), source, '0'].join(':')
assert.deepEqual(hex(contractIdParameters(hexId, artifact('TapToPay-V2.json'))), ['ab'.repeat(20), 'cd'.repeat(32)])

// an id whose parameters are not base64 throws rather than reading as something else
assert.throws(() => contractIdParameters('contract:mainnet:!!!:x:0', artifact('TapToPay-V2.json')))

console.log('contract-id smoke test passed')

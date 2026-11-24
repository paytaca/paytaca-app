import assert from 'node:assert/strict'

import { buildEliteOtcClaim } from '../src/utils/engagementhub-utils/elite-claim.js'

const TXID = `abcdef${'0'.repeat(58)}`

const base = {
  isChipnet: false,
  isConsolidation: false,
  txid: TXID,
  assetId: 'bch',
  isNFT: false,
  recipients: [{ amount: 1, recipientAddress: 'bitcoincash:qmerchant' }],
  inputExtras: [{}],
  customerAddress: 'bitcoincash:qcustomer'
}

const claim = (overrides = {}) => buildEliteOtcClaim({ ...base, ...overrides })

describe('buildEliteOtcClaim', () => {
  it('builds the OTC claim for a BCH send to a merchant', () => {
    assert.deepEqual(claim(), {
      type: 'otc',
      customer_address: 'bitcoincash:qcustomer',
      merchant_address: 'bitcoincash:qmerchant',
      bch_spent: 1,
      ref_id: '11259375',
      tx_id: TXID
    })
  })

  it('rejects chipnet sends', () => {
    assert.equal(claim({ isChipnet: true }), null)
  })

  it('rejects consolidations', () => {
    assert.equal(claim({ isConsolidation: true }), null)
  })

  it('rejects a send without a transaction id', () => {
    assert.equal(claim({ txid: '' }), null)
    assert.equal(claim({ txid: undefined }), null)
  })

  it('rejects non-BCH assets', () => {
    assert.equal(claim({ assetId: 'slp/abc' }), null)
    assert.equal(claim({ assetId: 'ct/abc' }), null)
  })

  it('rejects NFT sends', () => {
    assert.equal(claim({ isNFT: true }), null)
  })

  it('rejects a multi-recipient send with no merchant data', () => {
    assert.equal(claim({
      recipients: [
        { amount: 1, recipientAddress: 'bitcoincash:qfirst' },
        { amount: 2, recipientAddress: 'bitcoincash:qsecond' }
      ],
      inputExtras: [{}, {}]
    }), null)
  })

  it('claims the recipient whose extras carry merchant data', () => {
    const payload = claim({
      recipients: [
        { amount: 1, recipientAddress: 'bitcoincash:qfirst' },
        { amount: 2, recipientAddress: 'bitcoincash:qmerchant' }
      ],
      inputExtras: [{}, { merchantData: { name: 'Merchant' } }]
    })

    assert.equal(payload.merchant_address, 'bitcoincash:qmerchant')
    assert.equal(payload.bch_spent, 2)
  })

  it('claims a single recipient even without merchant data', () => {
    const payload = claim({ inputExtras: [] })

    assert.equal(payload.merchant_address, 'bitcoincash:qmerchant')
  })

  it('rejects a send without the customer address', () => {
    assert.equal(claim({ customerAddress: '' }), null)
    assert.equal(claim({ customerAddress: undefined }), null)
  })

  it('rejects a recipient without an address', () => {
    assert.equal(claim({ recipients: [{ amount: 1 }] }), null)
  })

  it('rejects a non-finite or non-positive amount', () => {
    assert.equal(claim({ recipients: [{ amount: 'abc', recipientAddress: 'bitcoincash:qmerchant' }] }), null)
    assert.equal(claim({ recipients: [{ recipientAddress: 'bitcoincash:qmerchant' }] }), null)
    assert.equal(claim({ recipients: [{ amount: 0, recipientAddress: 'bitcoincash:qmerchant' }] }), null)
    assert.equal(claim({ recipients: [{ amount: -1, recipientAddress: 'bitcoincash:qmerchant' }] }), null)
  })

  it('coerces a numeric string amount', () => {
    const payload = claim({
      recipients: [{ amount: '1.25', recipientAddress: 'bitcoincash:qmerchant' }]
    })

    assert.equal(payload.bch_spent, 1.25)
  })
})

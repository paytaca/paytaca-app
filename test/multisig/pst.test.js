/* eslint-disable camelcase */

import assert from 'assert'
import {
  encodeTransactionCommon,
  stringify,
  createVirtualMachineBch,
  binToHex
} from 'bitauth-libauth-v3';

import { derivePublicKeys } from '../../src/lib/multisig/wallet.js'
import { wallet1_transaction1 } from '../../src/lib/multisig/fixtures/transactions.js';
import { transactionBinObjectsToUint8Array, Pst, SIGNING_PROGRESS } from '../../src/lib/multisig/pst.js'
import { hdPublicKeyPalace, hdPrivateKeyPalace, hdPrivateKeyTruly, TwoOfThreeReal } from '../../src/lib/multisig/fixtures/wallets.js';

// eslint-disable-next-line complexity
describe('Pst Test', (t) => {

  describe('signTransaction', () => {
    it('Can completely sign transactions', () => {
        // Signer that can sign on device
        const xpub = hdPublicKeyPalace
        const xprv = hdPrivateKeyPalace

        const transaction = transactionBinObjectsToUint8Array(wallet1_transaction1.transaction)
        const encodedTransaction = encodeTransactionCommon(transaction)
        const unsignedTransactionHex = binToHex(encodedTransaction)

        const pst = new Pst({
          purpose: wallet1_transaction1.purpose,
          origin: wallet1_transaction1.origin,
          unsignedTransactionHex,
          wallet: TwoOfThreeReal,
          inputs: structuredClone(transaction.inputs)
        })
        const xprv2 = hdPrivateKeyTruly
        pst.sign(xprv) 
        pst.sign(xprv2)

        assert.equal(2, pst.inputs[0].partialSignatures?.length)
    })
  })

  describe('finalize', () => {
    it('can produce signed transaction verifiable by vm', () => {
      // Signer that can sign on device
        const xpub = hdPublicKeyPalace
        const xprv = hdPrivateKeyPalace
        const transaction = transactionBinObjectsToUint8Array(wallet1_transaction1.transaction)
        const encodedTransaction = encodeTransactionCommon(transaction)
        const unsignedTransactionHex = binToHex(encodedTransaction)

        
        const pst = new Pst({
          purpose: wallet1_transaction1.purpose,
          origin: wallet1_transaction1.origin,
          unsignedTransactionHex,
          wallet: TwoOfThreeReal,
          inputs: structuredClone(transaction.inputs)
        })
        const xprv2 = hdPrivateKeyTruly
        pst.sign(xprv) 
        pst.sign(xprv2)
        pst.finalize()

        const vm = createVirtualMachineBch()
        const verificationSuccess = vm.verify({
          sourceOutputs: transaction.inputs.map(i => i.sourceOutput), transaction: pst.finalCompilation.transaction
        })
        assert.equal(true, verificationSuccess)
    })
  })
  
  describe('signerSigned', () => {
    it('should return true if signer with xpub already signed, false if not', () => {
        const transaction = transactionBinObjectsToUint8Array(wallet1_transaction1.transaction)
        const encodedTransaction = encodeTransactionCommon(transaction)
        const unsignedTransactionHex = binToHex(encodedTransaction)

        const pst = new Pst({
          purpose: wallet1_transaction1.purpose,
          origin: wallet1_transaction1.origin,
          unsignedTransactionHex,
          wallet: TwoOfThreeReal,
          inputs: transaction.inputs
        })
        
        pst.sign(TwoOfThreeReal.signers[0].xprv) 

        assert.equal(true, pst.signerSigned(TwoOfThreeReal.signers[0].xpub))
        assert.equal(false, pst.signerSigned(TwoOfThreeReal.signers[1].xpub))

    })
  })

  describe('combine', () => {
    it('can successfully combine multiple pst instance', () => {
      const transaction = transactionBinObjectsToUint8Array(wallet1_transaction1.transaction)
        const encodedTransaction = encodeTransactionCommon(transaction)
        const unsignedTransactionHex = binToHex(encodedTransaction)

        const pst1 = new Pst({
          purpose: wallet1_transaction1.purpose,
          origin: wallet1_transaction1.origin,
          unsignedTransactionHex,
          wallet: TwoOfThreeReal,
          inputs: structuredClone(transaction.inputs)
        })
        
        pst1.sign(TwoOfThreeReal.signers[0].xprv)

        const pst2 = new Pst({
          purpose: wallet1_transaction1.purpose,
          origin: wallet1_transaction1.origin,
          unsignedTransactionHex,
          wallet: TwoOfThreeReal,
          inputs: structuredClone(transaction.inputs)
        })
        
        pst2.sign(TwoOfThreeReal.signers[1].xprv)


        const pst3 = new Pst({
          purpose: wallet1_transaction1.purpose,
          origin: wallet1_transaction1.origin,
          unsignedTransactionHex,
          wallet: TwoOfThreeReal,
          inputs: structuredClone(transaction.inputs)
        })
        
        pst3.sign(TwoOfThreeReal.signers[2].xprv)

        assert.equal(1, pst1.inputs[0].partialSignatures.length)

        assert.equal(1, pst2.inputs[0].partialSignatures.length)

        pst1.combine([pst2])

        assert.equal(2, pst1.inputs[0].partialSignatures.length)

        pst1.finalize()
        
        assert.equal(true, pst1.vmVerificationSuccess)
        
    })
  }) 

  describe('getSigningProgress', () => {
    it('returns unsigned|partially_signed|fully_signed depending on signing progress', () => {
      const transaction = transactionBinObjectsToUint8Array(wallet1_transaction1.transaction)
        const encodedTransaction = encodeTransactionCommon(transaction)
        const unsignedTransactionHex = binToHex(encodedTransaction)
        const pst1 = new Pst({
          purpose: wallet1_transaction1.purpose,
          origin: wallet1_transaction1.origin,
          unsignedTransactionHex,
          wallet: TwoOfThreeReal,
          inputs: structuredClone(transaction.inputs)
        })
        let progress = pst1.getSigningProgress()
        assert.equal(0, progress.signatureCount)
        pst1.sign(TwoOfThreeReal.signers[0].xprv)
        progress = pst1.getSigningProgress()
        assert.equal(1, progress.signatureCount)
        assert.equal(SIGNING_PROGRESS.PARTIALLY_SIGNED, progress.signingProgress)
        pst1.sign(TwoOfThreeReal.signers[1].xprv)
        progress = pst1.getSigningProgress()
        assert.equal(2, progress.signatureCount)
        assert.equal(SIGNING_PROGRESS.FULLY_SIGNED, progress.signingProgress)
        
    })
  })

})

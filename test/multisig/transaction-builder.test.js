/* eslint-disable camelcase */

import assert from 'assert'
import {
  hexToBin,
  decodeHdPublicKey,
  deriveHdPathRelative,
  publicKeyToP2pkhLockingBytecode,
  decodeTransactionCommon,
  binsAreEqual
} from 'bitauth-libauth-v3';

import { hdPublicKey0H } from '../../src/lib/multisig/fixtures/wallets.js';

import { TransactionBuilder } from '../../src/lib/multisig/transaction-builder.js'

import { commonUtxoToLibauthInput } from '../../src/lib/multisig/utxo.js'

// eslint-disable-next-line complexity
describe('TransactionBuilder', (t) => {

  describe('build', () => {
    it('returns unsigned transaction hex', async () => {

      common

      const sampleUtxos = [
          {
              txid: 'e3f1a5b7a08c58e7b83f62a2a5b1e408f3b1d4354eec5e7893a1b2c3d4e5f678',
              vout: 0,
              sequenceNumber: 0,
              satoshis: 100000,
              addressPath: "0/0"
          },
          {
              txid: 'f1e2d3c4b5a697887766554433221100ffeeccbbaa99887766554433221100ff',
              vout: 1,
              sequenceNumber: 0, 
              satoshis: 546,
              addressPath: "0/1",
              token: {
                category: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
                amount: '1000000000000' // Fungible token
              }
          },
          {
              txid: 'abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
              vout: 2,
              sequenceNumber: 0, 
              satoshis: 600,
              addressPath: "0/2",
              token: {
                category: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
                amount: '1',
                nft: {
                    capability: 'mutable',
                    commitment: '4e46543a426f6f6b4f66536f756c73' // "NFT:BookOfSouls"
                }
              }
          }
      ];

      const decodedHdPublicKey = decodeHdPublicKey(hdPublicKey0H, '0/0')
      const { publicKey } = deriveHdPathRelative(decodedHdPublicKey.node, '0/0')
      const lockingBytecode = publicKeyToP2pkhLockingBytecode({ publicKey })

      const builder = new TransactionBuilder()
      
      const built = builder
        .addInput(commonUtxoToLibauthInput(sampleUtxos[2]))
        .addOutput({
          lockingBytecode: lockingBytecode,
          valueSatoshis: BigInt(sampleUtxos[2].satoshis),
          token: {
            amount: sampleUtxos[2].token.amount,
            category: hexToBin(sampleUtxos[2].token.category),
            nft: {
              capability: 'mutable',
              commitment: hexToBin(sampleUtxos[2].token.nft.commitment)
            }
          }
        })
        .build()

      assert.equal(typeof(built) === 'string', true)

      const decoded = decodeTransactionCommon(hexToBin(built))
      
      assert.equal(binsAreEqual(decoded.inputs[0].outpointTransactionHash, hexToBin('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd')), true)
    })
  })  
     
})

/* eslint-disable camelcase */

import assert from 'assert'

import {
  hdPublicKey0H,
  hdPublicKey1H,
  hdPublicKey2H,
} from '../../src/lib/multisig/fixtures/wallets.js';
import { createTemplate } from '../../src/lib/multisig/template.js';

// eslint-disable-next-line complexity
describe('createTemplate', (t) => {

  it('populate correct number of entities', () => {
    const signers = [
      {
        name: 'Alice',
        xpub: hdPublicKey0H
      },
      {
        name: 'Charlie',
        xpub: hdPublicKey1H
      },
      {
        name: 'Bob',
        xpub: hdPublicKey2H
      },
      
    ]

    const wallet = {
      name: 'My 2 of 3 multisig wallet',
      m: 2,
      signers: signers
    }

    const template = createTemplate({ m: 2, signers: wallet.signers, name: 'Test Multisig Template' });
    
    assert.equal(Object.keys(template.entities).length, 3)
    assert.equal(template.scripts['1_and_2'].script, '<0b011>\n<key1.schnorr_signature.all_outputs>\n<key2.schnorr_signature.all_outputs>')
    assert.equal(template.scripts['1_and_3'].script, '<0b101>\n<key1.schnorr_signature.all_outputs>\n<key3.schnorr_signature.all_outputs>')
    assert.equal(template.scripts['2_and_3'].script, '<0b110>\n<key2.schnorr_signature.all_outputs>\n<key3.schnorr_signature.all_outputs>')
  })
     
});

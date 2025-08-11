import assert from 'assert'
import { selectUtxos } from '../../src/lib/multisig/utxo.js';

// eslint-disable-next-line complexity
describe('utxo', (t) => {
  describe('selectUtxos', () => {
    it('selects change first, use deposit utxos from for the remaining target', () => {
        const utxos = [
            {
                txid: 'utxo1',
                vout: 0,
                satoshis: 3000,
                addressPath: '0/0', // deposit
                age: 10
            },
            {
                txid: 'utxo2',
                vout: 1,
                satoshis: 5000,
                addressPath: '1/0', // change
                age: 5
            },
            {
                txid: 'utxo3',
                vout: 0,
                satoshis: 2000,
                addressPath: '0/1', // deposit
                age: 15
            },
            {
                txid: 'utxo4',
                vout: 1,
                satoshis: 4000,
                addressPath: '1/1', // change
                age: 3
            },
            {
                txid: 'utxo5',
                vout: 0,
                satoshis: 1000,
                addressPath: '0/2', // deposit
                age: 20
            },
            {
                txid: 'utxo6',
                vout: 2,
                satoshis: 6000,
                addressPath: '1/2', // change
                age: 1
            }
        ]

        let targetSatoshis = 4000n

        let selected = selectUtxos(utxos, { targetSatoshis })
        
        let total = selected.selectedUtxos.filter(u=>!u.token).reduce((total, u) => {
            total = total + BigInt(u.satoshis)
            return total
        }, 0n )


        assert.equal(total >= targetSatoshis, true, `Expecting > ${targetSatoshis} but got ${total}`)
        assert.equal(selected.selectedUtxos.length === 1, true, `Expecting 1 utxo candidate but got ${selected.selectedUtxos.length}`)
        assert.equal(selected.selectedUtxos[0].txid === 'utxo4', true, `Expecting utxo4 but got ${selected.selectedUtxos[0].txid}`)
        
        targetSatoshis = 16000n
        
        selected = selectUtxos(utxos, { targetSatoshis })

        
        total = selected.selectedUtxos.filter(u=>!u.token).reduce((total, u) => {
            total = total + BigInt(u.satoshis)
            return total
        }, 0n )


        let totalFromChange = selected.selectedUtxos.filter(u=>!u.token && u.addressPath.startsWith('1/')).reduce((total, u) => {
            total = total + BigInt(u.satoshis)
            return total
        }, 0n )

        console.log('selected', selected)
        
        assert.equal(total >= targetSatoshis, true, `Expecting > ${targetSatoshis} but got ${total}`)
        assert.equal(selected.selectedUtxos.length === 4, true, `Expecting 1 utxo candidate but got ${selected.selectedUtxos.length}`)
        assert.equal(totalFromChange === 15000n, true, `Expecting 15000 from change addresses but got ${totalFromChange}`)
        assert.equal(selected.satoshisSatisfied, true)
        
    })

    it.only('selects correct utxos based on target token amount', () => {
        const utxos = [
            // --- BCH-only ---
            { txid: 'utxo1', vout: 0, satoshis: 3000, addressPath: '0/0', age: 10 },
            { txid: 'utxo2', vout: 1, satoshis: 5000, addressPath: '1/0', age: 5 },
            { txid: 'utxo3', vout: 0, satoshis: 2000, addressPath: '0/1', age: 15 },
            { txid: 'utxo4', vout: 1, satoshis: 4000, addressPath: '1/1', age: 3 },
            { txid: 'utxo5', vout: 0, satoshis: 1000, addressPath: '0/2', age: 20 },
            { txid: 'utxo6', vout: 2, satoshis: 6000, addressPath: '1/2', age: 1 },

            // --- CashToken: fungible ---
            { txid: 'utxo7', vout: 0, satoshis: 546, addressPath: '0/3', age: 8,
            token: { category: 'token-cat-abc', amount: 50, nft: null } },
            { txid: 'utxo8', vout: 1, satoshis: 546, addressPath: '1/3', age: 4,
            token: { category: 'token-cat-xyz', amount: 1, nft: { capability: 'none', commitment: 'abcd1234' } } },
            { txid: 'utxo9', vout: 0, satoshis: 546, addressPath: '0/4', age: 12,
            token: { category: 'token-cat-abc', amount: 200, nft: null } },

            // --- CashToken: more fungible + NFTs ---
            { txid: 'utxo10', vout: 2, satoshis: 546, addressPath: '1/4', age: 2,
            token: { category: 'token-cat-lmn', amount: 500, nft: null } },
            { txid: 'utxo11', vout: 0, satoshis: 546, addressPath: '0/5', age: 18,
            token: { category: 'token-cat-nft1', amount: 0, nft: { capability: 'mutable', commitment: 'deadbeef' } } },
            { txid: 'utxo12', vout: 1, satoshis: 546, addressPath: '1/5', age: 7,
            token: { category: 'token-cat-abc', amount: 75, nft: null } },

            // --- BCH-only: more variety ---
            { txid: 'utxo13', vout: 0, satoshis: 8000, addressPath: '0/6', age: 9 },
            { txid: 'utxo14', vout: 1, satoshis: 2500, addressPath: '1/6', age: 6 },
            { txid: 'utxo15', vout: 0, satoshis: 3500, addressPath: '0/7', age: 14 },
            { txid: 'utxo16', vout: 1, satoshis: 7000, addressPath: '1/7', age: 11 }
        ];


        // scenario 1
        let tokenCategory = 'token-cat-abc' 
        let tokenTargetAmount = 75n
        let targetTokens = {
            [tokenCategory]: tokenTargetAmount
        }
        let selected = selectUtxos(utxos, { targetSatoshis: 2000n, targetTokens })
        let selectedTokenUtxo = selected.selectedUtxos.find(u => u.token?.amount === tokenTargetAmount)
        assert.equal(selected.totalTokens['token-cat-abc']?.total >= tokenTargetAmount, true, `Expecting >= ${tokenTargetAmount} but got ${selected.totalTokens['token-cat-abc']?.total}`)
        assert.equal(selected.selectedUtxos.length === 2, true, `Expecting 1 utxo candidate but got ${selected.selectedUtxos.length}`)
        assert.equal(selectedTokenUtxo.txid === 'utxo12', true, `Expecting utxo12 but got ${selected.selectedUtxos[0].txid}`)
        
        // scenario 2
        tokenCategory = 'token-cat-abc' 
        tokenTargetAmount = 85n
        targetTokens = {
            [tokenCategory]: tokenTargetAmount
        }
        selected = selectUtxos(utxos, { targetSatoshis: 2000n, targetTokens })
        const numberOfTokenUtxos = selected.selectedUtxos.filter(u=>Boolean(u.token)).length
        const txidsOfTokenUtxos = selected.selectedUtxos.map(u=>u.txid) 
        assert.equal(selected.totalTokens['token-cat-abc']?.total >= tokenTargetAmount, true, `Expecting >= ${tokenTargetAmount} but got ${selected.totalTokens['token-cat-abc']?.total}`)
        assert.equal(numberOfTokenUtxos === 2, true, `Expecting 2 utxo candidate but got ${numberOfTokenUtxos}`)
        assert.equal(txidsOfTokenUtxos.includes('utxo12'), true, `Expecting utxo12 included but got ${false}`)
        assert.equal(txidsOfTokenUtxos.includes('utxo7'), true, `Expecting utxo7 included but got ${false}`)
        
    })
    
  })
})
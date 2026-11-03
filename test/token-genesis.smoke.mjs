/**
 * Smoke test for sendNftGenesis, which builds the LIFT token purchase transaction in place of
 * mainnet-js's Wallet.tokenGenesis.
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/token-genesis.smoke.mjs
 * or:
 *   npm run test:smoke
 *
 * Every transaction is checked against the BCH virtual machine with the coins it spends, so a
 * bad signature, an invalid token genesis or outputs worth more than the inputs fail the test.
 */
import assert from 'node:assert/strict'
import {
  binToHex,
  cashAddressToLockingBytecode,
  createVirtualMachineBch,
  decodeTransaction,
  encodeCashAddress,
  encodePrivateKeyWif,
  hash160,
  hashTransaction,
  hexToBin,
  secp256k1,
  sha256,
} from 'bitauth-libauth-v3'

const { sendNftGenesis } = await import('../src/utils/engagementhub-utils/token-genesis.js')

const privateKey = sha256.hash(new TextEncoder().encode('paytaca token genesis smoke test'))
const wif = encodePrivateKeyWif(privateKey, 'mainnet')
const ownAddress = encodeCashAddress({
  prefix: 'bitcoincash',
  type: 'p2pkh',
  payload: hash160(secp256k1.derivePublicKeyCompressed(privateKey)),
}).address
const ownBytecode = cashAddressToLockingBytecode(ownAddress).bytecode

// a P2SH32 swap contract, given as a plain address the way the LIFT page passes it
const swapContractAddress = encodeCashAddress({ prefix: 'bitcoincash', type: 'p2sh', payload: new Uint8Array(32).fill(0xab) }).address
const swapContractBytecode = cashAddressToLockingBytecode(swapContractAddress).bytecode

const commitment = '02' + '00' + 'cd'.repeat(32) + '78563412'
const vm = createVirtualMachineBch()

let txidCounter = 0
const nextTxid = () => (++txidCounter).toString(16).padStart(64, '0')
const coin = (satoshis, vout = 0, token) => ({ txid: nextTxid(), vout, satoshis: BigInt(satoshis), token })

function fakeProvider (utxos) {
  return {
    queried: [],
    sent: [],
    async getUtxos (address) {
      this.queried.push(address)
      return utxos
    },
    async sendRawTransaction (hex) {
      this.sent.push(hex)
      return hashTransaction(hexToBin(hex))
    },
  }
}

// decodes the one broadcast transaction, verifies it in the VM and returns it with its fee
function checkSent (provider, utxos) {
  assert.equal(provider.sent.length, 1, 'broadcasts exactly one transaction')
  const transaction = decodeTransaction(hexToBin(provider.sent[0]))
  assert.equal(typeof transaction, 'object', transaction)
  const sourceOutputs = transaction.inputs.map(input => {
    const utxo = utxos.find(u => u.txid === binToHex(input.outpointTransactionHash) && u.vout === input.outpointIndex)
    assert.ok(utxo, 'spends only coins of the address')
    return { lockingBytecode: ownBytecode, valueSatoshis: utxo.satoshis }
  })
  const result = vm.verify({ transaction, sourceOutputs })
  assert.equal(result, true, `VM rejects the transaction: ${result}`)
  const inputTotal = sourceOutputs.reduce((sum, output) => sum + output.valueSatoshis, 0n)
  const outputTotal = transaction.outputs.reduce((sum, output) => sum + output.valueSatoshis, 0n)
  const size = BigInt(provider.sent[0].length / 2)
  return { transaction, fee: inputTotal - outputTotal, size }
}

function scenario (name, fn) {
  return fn().then(() => console.log(`  ok - ${name}`))
}

console.log('token genesis smoke test')

await scenario('mints the NFT to the swap contract and returns change at 1 sat/byte', async () => {
  const genesis = coin(100_000)
  const utxos = [genesis]
  const provider = fakeProvider(utxos)
  const result = await sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider })

  assert.deepEqual(provider.queried, [ownAddress], 'looks up the coins of the key\'s own address')
  const { transaction, fee, size } = checkSent(provider, utxos)
  assert.equal(result.category, genesis.txid)
  assert.equal(result.txid, hashTransaction(hexToBin(provider.sent[0])))

  const [nft, change] = transaction.outputs
  assert.equal(transaction.outputs.length, 2)
  assert.deepEqual(nft.lockingBytecode, swapContractBytecode)
  assert.equal(nft.valueSatoshis, 20_000n)
  assert.equal(binToHex(nft.token.category), genesis.txid)
  assert.equal(nft.token.amount, 0n)
  assert.equal(nft.token.nft.capability, 'mutable')
  assert.equal(binToHex(nft.token.nft.commitment), commitment)

  assert.deepEqual(change.lockingBytecode, ownBytecode)
  assert.equal(change.token, undefined)
  assert.equal(fee, size, 'pays exactly 1 sat/byte')
})

await scenario('opens the category with the first token-less vout 0 coin', async () => {
  const tokenAtVout0 = coin(1_000, 0, { category: 'ee'.repeat(32), amount: 0n, nft: { capability: 'none', commitment: '' } })
  const atVout1 = coin(500_000, 1)
  const genesis = coin(30_000, 0)
  const laterVout0 = coin(40_000, 0)
  const utxos = [tokenAtVout0, atVout1, genesis, laterVout0]
  const provider = fakeProvider(utxos)
  const result = await sendNftGenesis({ wif, to: swapContractAddress, value: 10_000n, commitment, provider })

  const { transaction } = checkSent(provider, utxos)
  assert.equal(result.category, genesis.txid)
  assert.equal(binToHex(transaction.inputs[0].outpointTransactionHash), genesis.txid)
  assert.equal(transaction.inputs.length, 1, 'the genesis coin covers it alone')
  assert.equal(binToHex(transaction.outputs[0].token.category), genesis.txid)
})

await scenario('adds token-less coins in electrum order until the payment and fee are covered', async () => {
  const genesis = coin(2_000, 0)
  const tokenCoin = coin(800_000, 3, { category: 'ee'.repeat(32), amount: 5n })
  const first = coin(6_000, 2)
  const second = coin(9_000, 1)
  const unneeded = coin(50_000, 4)
  const utxos = [tokenCoin, first, genesis, second, unneeded]
  const provider = fakeProvider(utxos)
  await sendNftGenesis({ wif, to: swapContractAddress, value: 15_000n, commitment, provider })

  const { transaction, fee, size } = checkSent(provider, utxos)
  assert.deepEqual(
    transaction.inputs.map(input => binToHex(input.outpointTransactionHash)),
    [genesis.txid, first.txid, second.txid],
    'never spends the token coin, and stops once covered'
  )
  assert.equal(fee, size)
})

await scenario('pays exactly 1 sat/byte past 252 inputs, where the input count takes 3 bytes', async () => {
  const genesis = coin(1_000, 0)
  const funding = Array.from({ length: 299 }, (_, i) => coin(1_000, i + 1))
  const utxos = [genesis, ...funding]
  const provider = fakeProvider(utxos)
  await sendNftGenesis({ wif, to: swapContractAddress, value: 229_350n, commitment, provider })

  const { transaction, fee, size } = checkSent(provider, utxos)
  assert.ok(transaction.inputs.length > 252)
  assert.equal(transaction.outputs.length, 2, 'the payment is chosen to leave change above dust')
  assert.equal(fee, size)
})

await scenario('leaves change below dust to the fee instead of creating it', async () => {
  // with one input and two outputs the transaction is 300 bytes or less, so this leaves under 546 sats of change
  const genesis = coin(20_000 + 700, 0)
  const utxos = [genesis]
  const provider = fakeProvider(utxos)
  await sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider })

  const { transaction, fee, size } = checkSent(provider, utxos)
  assert.equal(transaction.outputs.length, 1, 'no change output')
  assert.equal(fee, 700n)
  assert.ok(fee >= size, 'still pays at least 1 sat/byte')
})

// the sizes of the one-input transaction with and without change, from a broadcast of each
async function probeSizes () {
  const withChange = fakeProvider([coin(100_000, 0)])
  await sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider: withChange })
  const withoutChange = fakeProvider([coin(20_700, 0)])
  await sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider: withoutChange })
  return {
    sizeWithChange: BigInt(withChange.sent[0].length / 2),
    sizeWithoutChange: BigInt(withoutChange.sent[0].length / 2),
  }
}
const { sizeWithChange, sizeWithoutChange } = await probeSizes()

await scenario('leaves change of exactly 546 sats to the fee, as mainnet-js did', async () => {
  const genesis = coin(20_000n + sizeWithChange + 546n, 0)
  const utxos = [genesis]
  const provider = fakeProvider(utxos)
  await sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider })
  const { transaction, fee } = checkSent(provider, utxos)
  assert.equal(transaction.outputs.length, 1)
  assert.equal(fee, sizeWithChange + 546n)
})

await scenario('creates change just above dust', async () => {
  const genesis = coin(20_000n + sizeWithChange + 547n, 0)
  const utxos = [genesis]
  const provider = fakeProvider(utxos)
  await sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider })
  const { transaction, fee, size } = checkSent(provider, utxos)
  assert.equal(transaction.outputs.length, 2)
  assert.equal(transaction.outputs[1].valueSatoshis, 547n)
  assert.equal(fee, size)
})

await scenario('sends without change when the coin covers exactly payment and 1 sat/byte', async () => {
  const genesis = coin(20_000n + sizeWithoutChange, 0)
  const utxos = [genesis]
  const provider = fakeProvider(utxos)
  await sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider })
  const { transaction, fee, size } = checkSent(provider, utxos)
  assert.equal(transaction.outputs.length, 1)
  assert.equal(fee, size)
})

await scenario('refuses one satoshi short of payment and 1 sat/byte, and broadcasts nothing', async () => {
  const provider = fakeProvider([coin(20_000n + sizeWithoutChange - 1n, 0)])
  await assert.rejects(
    sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider }),
    /Amount required was not met, 1 satoshis short/
  )
  assert.equal(provider.sent.length, 0)
})

await scenario('refuses without a token-less vout 0 coin, and broadcasts nothing', async () => {
  const provider = fakeProvider([coin(100_000, 1), coin(1_000, 0, { category: 'ee'.repeat(32), amount: 1n })])
  await assert.rejects(
    sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider }),
    /No suitable inputs with vout=0 available for new token genesis/
  )
  assert.equal(provider.sent.length, 0)
})

await scenario('refuses when the coins cannot cover payment and fee, and broadcasts nothing', async () => {
  const provider = fakeProvider([coin(10_000, 0), coin(10_000, 1)])
  await assert.rejects(
    sendNftGenesis({ wif, to: swapContractAddress, value: 20_000n, commitment, provider }),
    /Amount required was not met/
  )
  assert.equal(provider.sent.length, 0)
})

console.log('\ntoken genesis smoke test passed')

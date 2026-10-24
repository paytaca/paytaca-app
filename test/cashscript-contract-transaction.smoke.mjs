/**
 * Smoke test for createContractTransaction and calculateInputSize, which the ramp escrow,
 * marketplace escrow and stablehedge contracts build their transactions with since CashScript
 * 0.13 dropped contract.functions.
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/cashscript-contract-transaction.smoke.mjs
 * or:
 *   npm run test:smoke
 *
 * The expected transactions (by txid and size), input sizes and addresses are what CashScript
 * 0.11.5's contract.functions(...).from(inputs).to(outputs) and the previous calculateInputSize
 * gave for the same cases (with addressType in place of contractType), so the port must stay
 * byte-identical to it.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HashType, SignatureAlgorithm, SignatureTemplate, Contract } from 'cashscript'
import {
  binToHex, encodeCashAddress, encodePrivateKeyWif, hash160, hashTransaction, hexToBin, secp256k1, sha256, utf8ToBin,
} from 'bitauth-libauth-v3'

const { calculateInputSize, createContractTransaction } = await import('../src/utils/cashscript-utils.js')

const expected = {
  'ramp release with change back to the contract (p2sh32)': {
    address: 'bitcoincash:pdvhr669yz2yvp9cs2plwqfl0j94x5w8xwhhjex43qyt0htdarfncce8l2hch',
    inputSize: 544,
    txid: '551509bb4aa4a88d4e3f8e9fe0e893df5bcb669877724932b2c0e7d1052657ef',
    size: 691,
  },
  'ramp refund leaving dust change to the fee (p2sh20)': {
    address: 'bitcoincash:prts0tpesn5kl84gwz7f89dcawlfkd5q8um2ly6rxz',
    inputSize: 544,
    txid: '2a309eface0551640e5e9a566f3ef03339a74f4c578ecc9850383eda47ca28e2',
    size: 647,
  },
  'escrow settlement minting the lock NFT from the vout 0 input, fee estimated at 1 sat/byte': {
    address: 'bitcoincash:pwwhal8ltv7ks2exuvy928luu4s9wu4k3nsr4g799v4njrltlqzjw9e3ps5pl',
    inputSize: 718,
    txid: 'acc77e766688605a67edf9d79d2ff54e80a5fa4a99e8bdfe64f20088dc4cf690',
    size: 1692,
  },
  'escrow settlement with an ECDSA signature': {
    address: 'bitcoincash:pwwhal8ltv7ks2exuvy928luu4s9wu4k3nsr4g799v4njrltlqzjw9e3ps5pl',
    inputSize: 718,
    txid: '54589cf92132b85453f6026b3f0a81743e1dd117d7d5f6bd9a471da0acad8686',
    size: 1706,
  },
  'escrow settlement returning extra BCH to the contract': {
    address: 'bitcoincash:pp98456s9sqwmyklmws4wtdsdmnnpk6vsqj2mw3t85',
    inputSize: 718,
    txid: '7b3624dae0ddea3c20d17bdfca68184af850c4ec42b65d77803383ba4e6559c2',
    size: 2389,
  },
  'escrow settlement returning extra fungible tokens to the contract': {
    address: 'bitcoincash:pwwhal8ltv7ks2exuvy928luu4s9wu4k3nsr4g799v4njrltlqzjw9e3ps5pl',
    inputSize: 718,
    txid: '6bd1fe99084c2303b6d6733b21cecf434f091b378f466ebb0969a45c80133ce2',
    size: 2480,
  },
  'escrow settlement returning an unmatched NFT to the contract': {
    address: 'bitcoincash:pwwhal8ltv7ks2exuvy928luu4s9wu4k3nsr4g799v4njrltlqzjw9e3ps5pl',
    inputSize: 718,
    txid: '4093d197ed08168607e5d8f47bf6dfa38d051ea285d2c51c6deb203c47b7ad5b',
    size: 2482,
  },
  'mutable NFT input rewritten by an output of its category, plus a P2PKH input': {
    address: 'bitcoincash:pwwhal8ltv7ks2exuvy928luu4s9wu4k3nsr4g799v4njrltlqzjw9e3ps5pl',
    inputSize: 718,
    txid: '08286d33e61f45e64650360415772ec673b36be59478b8f5386615d84313e2e4',
    size: 1008,
  },
  'ramp release with change exactly at the dust limit': {
    address: 'bitcoincash:pdvhr669yz2yvp9cs2plwqfl0j94x5w8xwhhjex43qyt0htdarfncce8l2hch',
    inputSize: 544,
    txid: 'ceb07be56ba30bc5f5ddfb191ac8206e1ad90547f8613186f9b0c0e8090e0f00',
    size: 691,
  },
  'minting NFT input minting NFTs of its category': {
    address: 'bitcoincash:pwwhal8ltv7ks2exuvy928luu4s9wu4k3nsr4g799v4njrltlqzjw9e3ps5pl',
    inputSize: 718,
    txid: '6360a6b2a36bee3cb298849aaab7f9f8b5d31078654032a2842239635444b7be',
    size: 903,
  },
  'immutable NFT input passed on unchanged': {
    address: 'bitcoincash:pp98456s9sqwmyklmws4wtdsdmnnpk6vsqj2mw3t85',
    inputSize: 718,
    txid: 'ba7685bc5990ae6eb06ef4fbaec8a99591f89a2b53a2ddcdb4cf6ca0f9a7af57',
    size: 1565,
  },
  'fungible token genesis from the vout 0 input': {
    address: 'bitcoincash:pwwhal8ltv7ks2exuvy928luu4s9wu4k3nsr4g799v4njrltlqzjw9e3ps5pl',
    inputSize: 718,
    txid: '9ae357fb0fda1da3c18f57efe08726be07962650d4bb579dc45bd50dbed9f816',
    size: 836,
  },
  'single-function contract (Cauldron pool management) returning change': {
    address: 'bitcoincash:pww4mpvvj77wl2rfzhcun9ra9lxrh4fphdj5w072qmqx73fq75ht5suvadd2z',
    inputSize: 219,
    txid: 'efeacab259b487c58d7d6bd94542a0d192c0c65b52b2ad089701cd8e4bcf3655',
    size: 335,
  },
  'refuses an NFT output without a matching input': { error: 'NFT output with token category 242b9c3a302c8ce19189a706185c6d548d5cc22bfe304e343f74b1fb8d1b802b does not have corresponding input' },
  'refuses token outputs the inputs cannot cover': { error: 'Insufficient funds for token 9b3ee30d32d8287b615e6f5047845a3697530e9157ee5359f62a3fba02c5b0d9: available (49) < needed (50).' },
  'refuses outputs the inputs cannot pay for': { error: 'Insufficient funds: available (7600) < needed (8649).' },
}

function buildCases () {
  const artifact = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
  const rampArtifact = artifact('src/cashscripts/escrow.json')
  const escrowArtifact = artifact('src/marketplace/escrow/contracts/escrow/escrow-v3.artifact.json')

  const hash = (text) => sha256.hash(utf8ToBin(text))
  const key = (name) => {
    const privateKey = hash('cashscript contract transaction smoke test ' + name)
    const publicKey = secp256k1.derivePublicKeyCompressed(privateKey)
    const payload = hash160(publicKey)
    return {
      wif: encodePrivateKeyWif(privateKey, 'mainnet'),
      publicKey,
      pkh: binToHex(payload),
      address: encodeCashAddress({ prefix: 'bitcoincash', type: 'p2pkh', payload }).address,
      tokenAddress: encodeCashAddress({ prefix: 'bitcoincash', type: 'p2pkhWithTokens', payload }).address,
    }
  }
  const txid = (name) => binToHex(hash('txid ' + name))
  const provider = { network: 'mainnet' }

  const arbiter = key('arbiter'); const buyer = key('buyer'); const seller = key('seller'); const servicer = key('servicer')
  const rampHash = binToHex(hash('ramp params'))
  const ramp = (contractType) => new Contract(
    rampArtifact,
    [arbiter.pkh, buyer.pkh, seller.pkh, servicer.pkh, 1000n, 1000n, rampHash],
    { provider, contractType },
  )
  const categoryA = binToHex(hash('category A'))
  const categoryB = binToHex(hash('category B'))
  const feePool = encodeCashAddress({ prefix: 'bitcoincash', type: 'p2shWithTokens', payload: hash('fee pool') }).address
  const escrow = (contractType) => new Contract(
    escrowArtifact,
    [
      buyer.pkh, seller.pkh, servicer.pkh, arbiter.pkh, 'aa20' + binToHex(hash('fee pool')) + '87',
      50n, 2000n, 3000n, 1000n, 7n, 1712345678n,
      new Uint8Array(32).fill(0xa1), new Uint8Array(0), new Uint8Array(0), new Uint8Array(0),
    ],
    { provider, contractType },
  )
  const manageArtifact = JSON.parse(JSON.stringify(artifact('src/wallet/cauldron/artifacts/manage_artifact.json')).replace('<withdraw_pkh>', arbiter.pkh))
  const manage = new Contract(manageArtifact, [], { provider, contractType: 'p2sh32' })
  const schnorr = new SignatureTemplate(arbiter.wif)
  const ecdsa = new SignatureTemplate(arbiter.wif, HashType.SIGHASH_ALL | HashType.SIGHASH_UTXOS, SignatureAlgorithm.ECDSA)
  const settlement = (sig = schnorr) => ['settlement', [arbiter.publicKey, sig, 1712345678n, true]]

  const genesis = txid('escrow funding')
  const funding = [
    { txid: genesis, vout: 0, satoshis: 9000n },
    { txid: genesis, vout: 1, satoshis: 1600n, token: { category: categoryA, amount: 50n } },
  ]
  const lockNft = { to: feePool, amount: 1000n, token: { category: genesis, amount: 0n, nft: { capability: 'none', commitment: '0700e803' } } }
  const settlementOutputs = [
    { to: seller.tokenAddress, amount: 1000n, token: { category: categoryA, amount: 50n } },
    { to: servicer.address, amount: 2000n },
    { to: arbiter.address, amount: 3000n },
    lockNft,
  ]

  return [
    {
      name: 'ramp release with change back to the contract (p2sh32)',
      contract: ramp('p2sh32'), fn: ['release', [seller.publicKey, new SignatureTemplate(seller.wif), rampHash]],
      inputs: [{ txid: txid('ramp 1'), vout: 1, satoshis: 25000n }],
      outputs: [{ to: buyer.address, amount: 10000n }, { to: servicer.address, amount: 1000n }, { to: arbiter.address, amount: 1000n }],
      hardcodedFee: 1000n, locktime: 850000,
    },
    {
      name: 'ramp refund leaving dust change to the fee (p2sh20)',
      contract: ramp('p2sh20'), fn: ['refund', [arbiter.publicKey, schnorr, rampHash]],
      inputs: [{ txid: txid('ramp 2'), vout: 0, satoshis: 13500n }],
      outputs: [{ to: seller.address, amount: 10000n }, { to: servicer.address, amount: 1000n }, { to: arbiter.address, amount: 1000n }],
      hardcodedFee: 1000n, locktime: 850001,
    },
    {
      name: 'escrow settlement minting the lock NFT from the vout 0 input, fee estimated at 1 sat/byte',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: funding, outputs: settlementOutputs, locktime: 0,
    },
    {
      name: 'escrow settlement with an ECDSA signature',
      contract: escrow('p2sh32'), fn: settlement(ecdsa),
      inputs: funding, outputs: settlementOutputs, locktime: 0,
    },
    {
      name: 'escrow settlement returning extra BCH to the contract',
      contract: escrow('p2sh20'), fn: settlement(),
      inputs: [...funding, { txid: txid('extra bch'), vout: 3, satoshis: 4000n }], outputs: settlementOutputs, locktime: 0,
    },
    {
      name: 'escrow settlement returning extra fungible tokens to the contract',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [...funding, { txid: txid('extra token'), vout: 2, satoshis: 3000n, token: { category: categoryB, amount: 9n } }],
      outputs: settlementOutputs, locktime: 0,
    },
    {
      name: 'escrow settlement returning an unmatched NFT to the contract',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [...funding, { txid: txid('extra nft'), vout: 0, satoshis: 3000n, token: { category: categoryB, amount: 0n, nft: { capability: 'none', commitment: 'beef' } } }],
      outputs: settlementOutputs, locktime: 0,
    },
    {
      name: 'mutable NFT input rewritten by an output of its category, plus a P2PKH input',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [
        { txid: txid('mutable'), vout: 1, satoshis: 2000n, token: { category: categoryB, amount: 0n, nft: { capability: 'mutable', commitment: '01' } } },
        { txid: txid('p2pkh'), vout: 2, satoshis: 6000n, template: new SignatureTemplate(buyer.wif) },
      ],
      outputs: [{ to: buyer.tokenAddress, amount: 1000n, token: { category: categoryB, amount: 0n, nft: { capability: 'mutable', commitment: '02' } } }, { to: buyer.address, amount: 5000n }],
      locktime: 777,
    },
    {
      name: 'ramp release with change exactly at the dust limit',
      contract: ramp('p2sh32'), fn: ['release', [seller.publicKey, new SignatureTemplate(seller.wif), rampHash]],
      inputs: [{ txid: txid('ramp 3'), vout: 0, satoshis: 13576n }],
      outputs: [{ to: buyer.address, amount: 10000n }, { to: servicer.address, amount: 1000n }, { to: arbiter.address, amount: 1000n }],
      hardcodedFee: 1000n, locktime: 850002,
    },
    {
      name: 'minting NFT input minting NFTs of its category',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [{ txid: txid('minting'), vout: 1, satoshis: 10000n, token: { category: categoryB, amount: 0n, nft: { capability: 'minting', commitment: '' } } }],
      outputs: [
        { to: buyer.tokenAddress, amount: 1000n, token: { category: categoryB, amount: 0n, nft: { capability: 'none', commitment: 'aa' } } },
        { to: seller.tokenAddress, amount: 1000n, token: { category: categoryB, amount: 0n, nft: { capability: 'none', commitment: 'bb' } } },
      ],
      locktime: 0,
    },
    {
      name: 'immutable NFT input passed on unchanged',
      contract: escrow('p2sh20'), fn: settlement(),
      inputs: [
        { txid: txid('immutable'), vout: 2, satoshis: 3000n, token: { category: categoryB, amount: 0n, nft: { capability: 'none', commitment: 'cafe' } } },
        { txid: txid('immutable funding'), vout: 0, satoshis: 6000n },
      ],
      outputs: [
        { to: buyer.tokenAddress, amount: 1000n, token: { category: categoryB, amount: 0n, nft: { capability: 'none', commitment: 'cafe' } } },
        { to: buyer.address, amount: 3000n },
      ],
      locktime: 0,
    },
    {
      name: 'fungible token genesis from the vout 0 input',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [{ txid: txid('ft genesis'), vout: 0, satoshis: 20000n }],
      outputs: [{ to: buyer.tokenAddress, amount: 1000n, token: { category: txid('ft genesis'), amount: 1000000n } }],
      locktime: 0,
    },
    {
      name: 'single-function contract (Cauldron pool management) returning change',
      contract: manage, fn: ['managePool', [arbiter.publicKey, schnorr]],
      inputs: [{ txid: txid('pool'), vout: 0, satoshis: 50000n, token: { category: categoryA, amount: 777n } }],
      outputs: [{ to: arbiter.tokenAddress, amount: 1000n, token: { category: categoryA, amount: 777n } }],
      locktime: 0,
    },
    {
      name: 'refuses an NFT output without a matching input',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [{ txid: txid('no genesis'), vout: 1, satoshis: 9000n }], outputs: [lockNft], locktime: 0,
    },
    {
      name: 'refuses token outputs the inputs cannot cover',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [funding[0], { ...funding[1], token: { category: categoryA, amount: 49n } }], outputs: settlementOutputs, locktime: 0,
    },
    {
      name: 'refuses outputs the inputs cannot pay for',
      contract: escrow('p2sh32'), fn: settlement(),
      inputs: [{ ...funding[0], satoshis: 6000n }, funding[1]], outputs: settlementOutputs, locktime: 0,
    },
  ]
}

console.log('cashscript contract transaction smoke test')
for (const testCase of buildCases()) {
  const [fn, args] = testCase.fn
  const want = expected[testCase.name]
  const build = () => createContractTransaction({
    contract: testCase.contract,
    unlocker: testCase.contract.unlock[fn](...args),
    inputs: testCase.inputs,
    outputs: testCase.outputs,
    hardcodedFee: testCase.hardcodedFee,
    locktime: testCase.locktime,
  })
  if (want.error) {
    assert.throws(build, { message: want.error }, testCase.name)
  } else {
    assert.equal(testCase.contract.address, want.address, testCase.name)
    assert.equal(calculateInputSize(testCase.contract.unlock[fn](...args)), want.inputSize, testCase.name)
    const transaction = build()
    const hex = transaction.build()
    assert.equal(hashTransaction(hexToBin(hex)), want.txid, testCase.name)
    assert.equal(hex.length / 2, want.size, testCase.name)
    assert.equal(transaction.build(), hex, `${testCase.name}: building again gives the same transaction`)
  }
  console.log(`  ok - ${testCase.name}`)
}

console.log('\ncashscript contract transaction smoke test passed')

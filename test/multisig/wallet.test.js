/* eslint-disable camelcase */
import 'module-alias'
import assert from 'assert'
import sinon from 'sinon'
import {
  decodeHdPrivateKey,
  deriveHdPathRelative,
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBch,
  deriveHdPublicKey,
  decodeHdPublicKey,
  publicKeyToP2pkhCashAddress,
} from 'bitauth-libauth-v3';

import { createTemplate } from '../../src/lib/multisig/template.js';
import { hdPrivateKey0H, hdPublicKey2H, hdPublicKey0H, hdPublicKey1H, TwoOfThreeTest } from '../../src/lib/multisig/fixtures/wallets.js';
import { derivePublicKeys, getLockingBytecode, getLockingData, getWalletHash, getWalletUUID, MultisigWallet } from '../../src/lib/multisig/wallet.js';
import { WatchtowerNetworkProvider, Network } from '../../src/lib/multisig/network.js';
import axios from 'axios';


// eslint-disable-next-line complexity
describe('Multisig Wallet', (t) => {

  let axiosGetStub;

  beforeEach(() => {
    axiosGetStub = sinon.stub(axios, 'get');
  });

  afterEach(() => {
    axiosGetStub.restore();
  });

  describe('getWalletUUID, getWalletHash', () => {
    it('Produces the same value, no matter the order of the signers', () => {
        const wallet1 = {
            name: 'Wallet 1',
            m: 2,
            signers: [
                {
                    name: 'Signer 1',
                    xpub: hdPublicKey0H
                },
                {
                    name: 'Signer 2',
                    xpub: hdPublicKey1H
                },
                {
                    name: 'Signer 3',
                    xpub: hdPublicKey2H
                }
            ]
        }

        const wallet2 = {
            name: 'Wallet 2',
            m: 2,
            signers: [
                {
                    name: 'Signer 3',
                    xpub: hdPublicKey2H
                },
                {
                    name: 'Signer 1',
                    xpub: hdPublicKey0H
                },
                {
                    name: 'Signer 2',
                    xpub: hdPublicKey1H
                }
            ]
        }

        const wallet3 = {
            name: 'Wallet 3',
            m: 2,
            signers: [
                {
                    name: 'Signer 2',
                    xpub: hdPublicKey1H
                },
                {
                    name: 'Signer 3',
                    xpub: hdPublicKey2H
                },
                {
                    name: 'Signer 1',
                    xpub: hdPublicKey0H
                },
            ]
        }

        assert(wallet1.signers[0].xpub !== wallet2.signers[0].xpub !== wallet3.signers[0].xpub)

        const uuid1 = getWalletUUID(wallet1)
        const uuid2 = getWalletUUID(wallet2)
        const uuid3 = getWalletUUID(wallet3)
    
        const hash1 = getWalletHash(wallet1)
        const hash2 = getWalletHash(wallet2)
        const hash3 = getWalletHash(wallet3)

        assert([uuid1, uuid2, uuid3].every(uuid => uuid === uuid1))
        assert([hash1, hash2, hash3].every(hash => hash === hash1))
    })
  })

  describe.skip('derive private key from hdPrivateKey', () => {

    
    const { hdPublicKey } = deriveHdPublicKey(hdPrivateKey0H)
    const decodedHdPublicKey = decodeHdPublicKey(hdPublicKey)

    // console.log('hdpublickey', decodedHdPublicKey)
    const derivedPublicKey = deriveHdPathRelative(decodedHdPublicKey.node, '0/0')
    // console.log('Public Key', binToHex(derivedPublicKey.publicKey))
    // console.log('Address derived from public key', publicKeyToP2pkhCashAddress({ publicKey: derivedPublicKey.publicKey})) // THIS PRODUCES CORRECT ADDRESS, AND PUBLIC KEY

    const decodedHdPrivateKey = decodeHdPrivateKey(hdPrivateKey0H)
    const derivedPrivateKey = deriveHdPathRelative(decodedHdPrivateKey.node, '0/0')
    // console.log(derivedPrivateKey)
    // console.log('Private Key', binToHex(derivedPrivateKey.privateKey))
    // console.log('Address derived from private key', privateKeyToP2pkhCashAddress({privateKey: derivedPrivateKey.privateKey})) // THIS PRODUCES CORRECT ADDRESS SAME AS ABOVE, SO PRIVATE KEY SHOULD BE CORRECT
    // console.log('Wif', encodePrivateKeyWif(derivedPrivateKey.privateKey, 'mainnet')) // CORRECT, checked with electron cash
    
  })
  

  describe.skip('derive addresses using hdKeys', () => {

    
    const template = createTemplate({ m: TwoOfThreeTest.m, signers: TwoOfThreeTest.signers }) 
    
    
    // template.entities.signer_1.variables.key1.hdPublicKeyDerivationPath = ""
    // template.entities.signer_2.variables.key2.hdPublicKeyDerivationPath = ""
    // template.entities.signer_3.variables.key3.hdPublicKeyDerivationPath = ""


    template.entities.signer_1.variables.key1.type = "HdKey"
    template.entities.signer_2.variables.key2.type = "HdKey"
    template.entities.signer_3.variables.key3.type = "HdKey"
    
    

    template.entities.signer_1.variables.key1.publicDerivationPath = "0/1"
    template.entities.signer_2.variables.key2.publicDerivationPath = "0/1"
    template.entities.signer_3.variables.key3.publicDerivationPath = "0/1"
    
    template.entities.signer_1.variables.key1.privateDerivationPath = '0/1'
    template.entities.signer_2.variables.key2.privateDerivationPath = '0/1'
    template.entities.signer_3.variables.key3.privateDerivationPath = '0/1'
    

    const lockingData = {
        hdKeys: {
            addressIndex: 0,
            hdPublicKeys: {
                'signer_1': hdPublicKey0H,
                'signer_2': hdPublicKey2H,
                'signer_3': hdPublicKey1H
            }
        }
    }


    
    const parsedTemplate = importWalletTemplate(template)
    if (typeof parsedTemplate === 'string') {
        throw new Error('Failed creating multisig wallet template.')
    }
    const compiler = walletTemplateToCompilerBch(parsedTemplate)
    
    const lockingBytecode = compiler.generateBytecode({
        data: lockingData,
        scriptId: 'lock',
        debug: true
    })

    
    const address = lockingBytecodeToCashAddress({ bytecode: lockingBytecode.bytecode })

    

    const sortedSigners = derivePublicKeys({
        signers: [
            {
                xpub: hdPublicKey0H,
            },
            { xpub: hdPublicKey2H},
            { xpub: hdPublicKey1H }
        ],
        addressDerivationPath: '0/1'
    })

    const keyLockingData = getLockingData({ signers: sortedSigners, addressDerivationPath: '0/1' })
    const keyTemplate = createTemplate({ m: 2, signers: sortedSigners })
    const keyTypeLockingBytecode = getLockingBytecode({ template: keyTemplate, lockingData: keyLockingData })
    // console.log('HdKey Locking Bytecode', stringify(lockingBytecode))
    // console.log('Key Locking Bytecode', stringify(keyTypeLockingBytecode))
    
    // console.log('HdKey 0/1', address)
    // console.log('Key 0/1 public keys', stringify(keyLockingData))
    // console.log('s', stringify(lockingBytecode))
    
  })
  
  describe('getDepositAddress() & getChangeAddress()', () => {
    it('returns correct addresses', async () => {
        const onStateChange = async (state) => {
            assert.equal(state.key, 'lastIssuedDepositAddressIndex')
        }

        const wallet = new MultisigWallet({
            name: 'Wallet 1',
            m: 2,
            signers: [
                {
                    name: 'Signer 1',
                    xpub: hdPublicKey0H
                },
                {
                    name: 'Signer 2',
                    xpub: hdPublicKey1H
                },
                {
                    name: 'Signer 3',
                    xpub: hdPublicKey2H
                }
            ]
        }, onStateChange)

        assert.equal(wallet.getDepositAddress(0).address, 'bitcoincash:pzmrreqvknucv0ccepymctxzewem8key7gskv77sz7')
        assert.equal(wallet.getDepositAddress(1).address, 'bitcoincash:prr90ht2888uut49872q9hgveyxajaje2yqg636acd')
        assert.equal(wallet.getDepositAddress(2).address, 'bitcoincash:prcjr0aq5x45n92c2cx8y7lqc4p5cuvyechhw9aale')
        assert.equal(wallet.getDepositAddress(3).address, 'bitcoincash:pr6pl4rf5zg9c6ka3hfq2dy3wjytxwdqmczhy4rwns')
        assert.equal(wallet.getDepositAddress(19).address, 'bitcoincash:pr36vy52rrsdj6x25xw4xmhdkljweweq7ynz9fnkgx')
        assert.equal(wallet.getChangeAddress(0).address, 'bitcoincash:pr30jhzk07k9yhehl7trrv4vcs5398uwdcwdhk526j')
        assert.equal(wallet.getChangeAddress(1).address, 'bitcoincash:pryd3dsc4afk7pjlsqe5mg50s8deav69xggu4um8nj')
        assert.equal(wallet.getChangeAddress(2).address, 'bitcoincash:pz08vwc9lkfupm5srqv7s7kwfa0c3zf84v4z97hx5f')
        assert.equal(wallet.getChangeAddress(3).address, 'bitcoincash:prerlnx64xrew9g7cr6qnalg2k8v3m7cfsdpzjhpm2')
        assert.equal(wallet.getChangeAddress(19).address,'bitcoincash:pqu76m7uv7zq4suh5cawpnxnue5nndx7cc2fvup7v6')


        await wallet.issueDepositAddress(0)
        assert.equal(wallet.lastIssuedDepositAddressIndex, 0)
        await wallet.issueDepositAddress(1)
        assert.equal(wallet.lastIssuedDepositAddressIndex, 1)
        await wallet.issueDepositAddress(2)
        assert.equal(wallet.lastIssuedDepositAddressIndex, 2)
        assert.equal(
            wallet.getDepositAddress().address,
            'bitcoincash:pr6pl4rf5zg9c6ka3hfq2dy3wjytxwdqmczhy4rwns',
            'getDepositAddress() did not returned the correct next issuable deposit address when no address index is specified'
        )
        assert.equal(
            wallet.getDepositAddress().addressIndex,
            3,
            'getDepositAddress() did not returned the correct next issuable deposit address index when no address index is specified'
        )

    })
  })

    describe('exportToBase64()', () => {
        it('produces a base64 string', () => {
            const wallet = new MultisigWallet({
                name: 'Wallet 1',
                m: 2,
                signers: [
                    {
                        name: 'Signer 1',
                        xpub: hdPublicKey0H
                    },
                    {
                        name: 'Signer 2',
                        xpub: hdPublicKey1H
                    },
                    {
                        name: 'Signer 3',
                        xpub: hdPublicKey2H
                    }
                ]
            })

            function isBase64(str) {
                return /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/.test(str);
            }

            assert.equal(true, isBase64(wallet.exportToBase64()))

        })
    })

    describe('getAddressUtxos()', () => {
        it('returns the utxos of address', async () => {

            const onStateChange = (stateChanged) => {
                console.log(stateChanged)
            }

            const watchtower = new WatchtowerNetworkProvider({ network: Network.mainnet })

            const wallet = new MultisigWallet({
                name: 'Wallet 1',
                m: 2,
                signers: [
                    {
                        name: 'Signer 1',
                        xpub: hdPublicKey0H
                    },
                    {
                        name: 'Signer 2',
                        xpub: hdPublicKey1H
                    },
                    {
                        name: 'Signer 3',
                        xpub: hdPublicKey2H
                    }
                ]
            }, { onStateChange, provider: watchtower })

            const sampleUtxos = [
                {
                    txid: 'e3f1a5b7a08c58e7b83f62a2a5b1e408f3b1d4354eec5e7893a1b2c3d4e5f678',
                    vout: 0,
                    satoshis: 100000,
                    addressPath: "0/0"
                },
                {
                    txid: 'f1e2d3c4b5a697887766554433221100ffeeccbbaa99887766554433221100ff',
                    vout: 1,
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

            axiosGetStub.resolves({ data: sampleUtxos })

            const utxos = await wallet.getAddressUtxos('bitcoincash:ppfqy5rrn2s5ylvkpx8dsa3f05p83ym5ss82r7xykd')
            assert.equal(utxos.length, 3)

        })
    })

    describe.only('getWalletBalance()', () => {
        it('returns the correct BCH balance', async () => {

            const onStateChange = (stateChanged) => {
                console.log(stateChanged)
            }

            const watchtower = new WatchtowerNetworkProvider({ network: Network.mainnet })

            const wallet = new MultisigWallet({
                name: 'Wallet 1',
                m: 2,
                signers: [
                    {
                        name: 'Signer 1',
                        xpub: hdPublicKey0H
                    },
                    {
                        name: 'Signer 2',
                        xpub: hdPublicKey1H
                    },
                    {
                        name: 'Signer 3',
                        xpub: hdPublicKey2H
                    }
                ]
            }, { onStateChange, provider: watchtower })

            const sampleUtxos = [
                {
                    txid: 'e3f1a5b7a08c58e7b83f62a2a5b1e408f3b1d4354eec5e7893a1b2c3d4e5f678',
                    vout: 0,
                    satoshis: 100000,
                    addressPath: "0/0"
                },
                {
                    txid: 'f1e2d3c4b5a697887766554433221100ffeeccbbaa99887766554433221100ff',
                    vout: 1,
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

            axiosGetStub.resolves({ data: sampleUtxos })

            const expectedBalance = sampleUtxos.reduce((b, u) => b += u.satoshis, 0)
            const balance = await wallet.getWalletBalance()
            // * 40 because each request to getAddressUtxo would each resolve to the above utxos
            // getWalletBalance will scan atleast 20 addresses if lastIssuedAddressIndex is 0
            // depositAddress = 20, changeAddress = 20
            assert.equal(expectedBalance * 40, balance) 
            
        })
    })



    describe('getWalletUtxos() #live', () => {

        it('returns utxos of live wallet', async () => {
            const { hdPublicKeyLive1, hdPublicKeyLive2, hdPublicKeyLive3 } = await import('../../src/lib/multisig/fixtures/live-wallets.js')

            if (!hdPublicKeyLive1 || !hdPublicKeyLive2 || !hdPublicKeyLive3) assert.fail() 

            const onStateChange = (stateChanged) => {
                console.log(stateChanged)
            }

            const wallet = new MultisigWallet({
                name: 'Wallet 1',
                m: 2,
                signers: [
                    {
                        name: 'Signer 1',
                        xpub: hdPublicKeyLive1
                    },
                    {
                        name: 'Signer 2',
                        xpub: hdPublicKeyLive2
                    },
                    {
                        name: 'Signer 3',
                        xpub: hdPublicKeyLive3
                    }
                ]
            }, { onStateChange, provider: new WatchtowerNetworkProvider() })

            
            const utxos = await wallet.getWalletUtxos()
            // Weak test, just assumes atleast one of the address has utxo
            assert.equal(utxos.length > 0, true)

        })
    })

    describe('createBchTransferProposal()', () => {
        it('constructs an unsigned transaction transferring bch to specified recipients', () => {

            const onStateChange = (stateChanged) => {
                console.log(stateChanged)
            }

            const wallet = new MultisigWallet({
                name: 'Wallet 1',
                m: 2,
                signers: [
                    {
                        name: 'Signer 1',
                        xpub: hdPublicKey0H
                    },
                    {
                        name: 'Signer 2',
                        xpub: hdPublicKey1H
                    },
                    {
                        name: 'Signer 3',
                        xpub: hdPublicKey2H
                    }
                ]
            }, { onStateChange, provider: new WatchtowerNetworkProvider() })

            const purpose = 'Transfer BCH to Signer 1'
            const origin = 'paytaca-wallet'
            const creator = wallet.signers[0].xpub

            const decodedHdPublicKey = decodeHdPublicKey(wallet.signers[0].xpub, '0/0')
            const { publicKey } = deriveHdPathRelative(decodedHdPublicKey.node, '0/0')

            const address = publicKeyToP2pkhCashAddress({ publicKey })

            // axiosGetStub.resolves(mixedUtxos)

            const recipients = [
                { 
                    to: address,
                    satoshis: 1000n
                }
            ]

            const pst = wallet.createBchTransferProposal({ purpose, origin, recipients, creator })

            // assert.equal(pst.purpose, purpose)
            // assert.equal(pst.origin, origin)


        })
    })
});

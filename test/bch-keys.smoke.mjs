/**
 * Smoke test for src/utils/bch-keys.js, which replaced @psf/bch-js.
 *
 * Run with:
 *   node --experimental-loader ./test/mock-loader.mjs ./test/bch-keys.smoke.mjs
 * or:
 *   npm run test:smoke
 *
 * The expected values were produced by @psf/bch-js 4.22.1 for the same inputs, so each check
 * compares the replacement with what bch-js returned. Where they differ on purpose, the
 * test says so: bch-js threw from its is*Address checks on input that is not an address, and
 * signed messages with non-ASCII characters over a truncated, non-standard hash.
 */
import assert from 'node:assert/strict'

const keys = await import('../src/utils/bch-keys.js')
const { mnemonicToSeed } = await import('bip39')

// produced with @psf/bch-js 4.22.1
const BCHJS = {
  "hd": [
    {
      "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      "path": "m/44'/145'/0'",
      "xpub": "xpub6ByHsPNSQXTWZ7PLESMY2FufyYWtLXagSUpMQq7Un96SiThZH2iJB1X7pwviH1WtKVeDP6K8d6xxFzzoaFzF3s8BKCZx8oEDdDkNnp4owAZ",
      "xpubChild13": "02f03a41433f5c6c242b30e8b8ed55a398bb55b27b9516060721d1de5b62d10a81",
      "addresses": [
        {
          "sub": "0/0",
          "cash": "bitcoincash:qqyx49mu0kkn9ftfj6hje6g2wfer34yfnq5tahq3q6",
          "slp": "simpleledger:qqyx49mu0kkn9ftfj6hje6g2wfer34yfnqcskv437y",
          "wif": "KxbEv3FeYig2afQp7QEA9R3gwqdTBFwAJJ6Ma7j1SkmZoxC9bAXZ",
          "publicKey": "02bbe7dbcdf8b2261530a867df7180b17a90b482f74f2736b8a30d3f756e42e217"
        },
        {
          "sub": "1/0",
          "cash": "bitcoincash:qr8aeharupyrmhfu0d4tdmsnc5y8cfk47y6qrsjsrx",
          "slp": "simpleledger:qr8aeharupyrmhfu0d4tdmsnc5y8cfk47ykmgt8sac",
          "wif": "KxPYBDeusiG4uvz9AumSKvfgn6e1G8WQoCERyLtL6Lx1z5mgARyY",
          "publicKey": "02f178b9410d11e47e10bef8a8e4bc53e48d9ae15864a024a54f87a802dad5f514"
        },
        {
          "sub": "0/7",
          "cash": "bitcoincash:qqh67lr5sr9f9u7wm5e4ky6a8ajhfme3wup9zpz97n",
          "slp": "simpleledger:qqh67lr5sr9f9u7wm5e4ky6a8ajhfme3wud7f6h9qd",
          "wif": "L2oecchvZH6ZoUxJ4XBfgHydewcwcyGAvRG9tM25Q5o958hdmxr7",
          "publicKey": "03f9ccecd4caf5650727763e335ac4569b823f06aaf51e0a8f999ed349563d68f5"
        }
      ]
    },
    {
      "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      "path": "m/44'/245'/0'",
      "xpub": "xpub6Ch34msE9YBtQV7pZrLyRXHwocrpJtNN4KDG8bbyxyhGmEM5MirtqkiH4h9dvnVJ3MekET3w2Fkvej3fyo8WLz9bRPyDynDf6NXNfuydhv1",
      "xpubChild13": "03a7d549c8175c922b74cb7e511aeb3b698a05e425643dca94bffbf740cfa995cc",
      "addresses": [
        {
          "sub": "0/0",
          "cash": "bitcoincash:qrpkufwnfdzp8cnxzer8d8fkhqmh0zyphq6u3gx6e3",
          "slp": "simpleledger:qrpkufwnfdzp8cnxzer8d8fkhqmh0zyphqk86nn680",
          "wif": "KysfF1hbdzNTim2niyja9wftkwFEawWBooTtfwp2yatxH6ZWEnwb",
          "publicKey": "02b7c592292d0b7f421bbed28a9b1f3ecade85aecabece883a9c646fd45d2b5072"
        },
        {
          "sub": "1/0",
          "cash": "bitcoincash:qzkcn78zmtzq87tecx38r24t9ayrrzgyj5r7jyqvnr",
          "slp": "simpleledger:qzkcn78zmtzq87tecx38r24t9ayrrzgyj509el4vda",
          "wif": "L5GLquv5Dw9gf6N3FKU9Y4bnaTzERjeiZN8ZtNg5nVfCFxK7qE5p",
          "publicKey": "02c3f67f332490b2f2f4c599be1703252e9124739d0a85315a411bf8af315237b2"
        },
        {
          "sub": "0/7",
          "cash": "bitcoincash:qpxuta9mgvag5v67m7dvg707dyyj3ve3xssvuhen6r",
          "slp": "simpleledger:qpxuta9mgvag5v67m7dvg707dyyj3ve3xsuhhvvnya",
          "wif": "L57hgsDBhHpkYJq23Bn2DQ9XRU4rApMJ5BZGDyAjs4PzG21YQopW",
          "publicKey": "03f6cb51f2caa6a3a4b52956f2679a61e07bd55d012895eb3f27f32c2e7f402108"
        }
      ]
    },
    {
      "mnemonic": "legal winner thank year wave sausage worth useful legal winner thank yellow",
      "path": "m/44'/145'/0'",
      "xpub": "xpub6CFQveXZ1UfoeX1R45gtxMq1n33UEYfG1FdrQfNhJ3FyiEZqEZLp5nW474QiDWfVQ6NGk5iPv1h14Vhz2CtzNkGNhimgUucyUtWGdMdofhe",
      "xpubChild13": "021bd660a4696d0ac3dcc3e2d61362d17c7ef1cd7a522622d1551af5c2dc6445ca",
      "addresses": [
        {
          "sub": "0/0",
          "cash": "bitcoincash:qpdtccrxx78kcuc65mceurfwg60gmmqu9cwpjdt25n",
          "slp": "simpleledger:qpdtccrxx78kcuc65mceurfwg60gmmqu9cz6ek722d",
          "wif": "L1xV4qXa9bUAFgDAmomCMfgHBgWnjXVBLeNkkpZYGwUFVNKpsoZA",
          "publicKey": "033d55b4269d0db7dcca7165c2a13132d9baafecf38c0e89d8383ba6c1f370fc78"
        },
        {
          "sub": "1/0",
          "cash": "bitcoincash:qpa9dq23vj4rmcdcrt9xmfe8jl5sfd4zqyr5g4m63j",
          "slp": "simpleledger:qpa9dq23vj4rmcdcrt9xmfe8jl5sfd4zqy00rww60v",
          "wif": "L4zyoe7wBsHAwb9oZohEN7GPzJXJyG4Xcys3jayKK5zT31KXE5dF",
          "publicKey": "039e6a54b34e012ec08933013eb33262f1d7f442aece6c88a3eb457177d694df6f"
        },
        {
          "sub": "0/7",
          "cash": "bitcoincash:qqtya28m6hezuagdw0uqr665yu5gxr9h9gr33tfcg7",
          "slp": "simpleledger:qqtya28m6hezuagdw0uqr665yu5gxr9h9g026suckq",
          "wif": "L3sEgGHccEZuKm9QT5StSAMJ4PgN3f7XA3fJz9Z9dq21nsDmrb6U",
          "publicKey": "03f1a52820527d4083c0d965d423522d05bc3a8084ecec92b091a06e5e262b94b6"
        }
      ]
    },
    {
      "mnemonic": "legal winner thank year wave sausage worth useful legal winner thank yellow",
      "path": "m/44'/245'/0'",
      "xpub": "xpub6CgcNAuethh4rxxYzvdHWmMukgrZj5R2awwV4xcoYJErbL3cT2jeB9GhfCR6GbYuCMpyrdMFVgZRxkKmH1oshMt5dyQ2GhV6oCPPx7Xz7nU",
      "xpubChild13": "03acb834812f29423b09e195e705b0356ca25d15131b70d9b27d5173d957a2e7a2",
      "addresses": [
        {
          "sub": "0/0",
          "cash": "bitcoincash:qzxq97q4y7qa7sxdh49d4uzqdj46d07yug6se3l640",
          "slp": "simpleledger:qzxq97q4y7qa7sxdh49d4uzqdj46d07yugktj226t3",
          "wif": "L3mKJM3qh5f6tJTSG9S2NQ2gr3BfpEamabJBa1djaycfSaeuVekj",
          "publicKey": "02edd2ff5dfebe06c0b9dcc83421ada03f59999482b383f3cddefb141197464067"
        },
        {
          "sub": "1/0",
          "cash": "bitcoincash:qzexlgry56ars5dmzvfnp52endtjrzqqmygle50e3t",
          "slp": "simpleledger:qzexlgry56ars5dmzvfnp52endtjrzqqmyyyj06e04",
          "wif": "L5VboxeiqikYaxkgwBYDhgh8vaDk87ESygBvembF487eTRSngimL",
          "publicKey": "02cb180b070d7d5fb36e09558f88c2c28de117db831008b1d9d78c7ad692c94d9a"
        },
        {
          "sub": "0/7",
          "cash": "bitcoincash:qzz7nkl7gkvyxkx50435cs8gj6pc9tdezqq345ar2q",
          "slp": "simpleledger:qzz7nkl7gkvyxkx50435cs8gj6pc9tdezqv270gr57",
          "wif": "L1dtPnSDpZ39JWUtNiNazvFsLwzigGWxLYdV2W89TR8Uj31nu22w",
          "publicKey": "02d7818b8e5a085f98e38501d6777549e66205c9972b96aaec6954418fd27cd461"
        }
      ]
    }
  ],
  "wifs": [
    {
      "type": "mainnet",
      "wif": "KxvPKnWkQTwU6jiqLwtftujLanAPzAdPXYG7dyMzP6AKaLgQj4Ud",
      "publicKey": "031103ee6793e5bcc9a95191203594345cc70e8864b163f7f769d0e6384f21a043",
      "cash": "bitcoincash:qqcej57gwvengg37tmr2ghh07v665svt9uwrczd7sl"
    },
    {
      "type": "testnet",
      "wif": "cW1r3nvt3H8MUT15DvzF1PCqPjuQmzc5FeXc443oBihcB1nyPbtU",
      "publicKey": "0246491f31976f50332ad41166682855b791d49e6b13e53b2a227ac76f01e22cb1",
      "cash": "bchtest:qqyrs6h7vszwtddxc0djadpj6q6qzcfk0u96s8l38z"
    },
    {
      "type": "testnetUncompressed",
      "wif": "92SHurBJR49n7rRwMMqsqESVVtTYGa5PsDU1j2MvoxTYjJ1pSY5",
      "publicKey": "040502d8be8ab2c92476cfc1ea682350edde1504ae513cd3b0cddbac522a2b5315abe45a2e7309f625bc03c0f682127ba245a93954aac15a0fd0ed3d6b1f063278",
      "cash": "bchtest:qznll9tgqp4pylvpp9rpx3agw0l5vvmrxse3dgqwjx"
    },
    {
      "type": "mainnetUncompressed",
      "wif": "5JPTMV2K6FgL8YFort6LGcqBmAWXDL6rTMhD5JTLASprBWZUXKG",
      "publicKey": "throws",
      "cash": "throws"
    }
  ],
  "legacy": [
    {
      "publicKey": "02bbe7dbcdf8b2261530a867df7180b17a90b482f74f2736b8a30d3f756e42e217",
      "legacy": "1mW6fDEMjKrDHvLvoEsaeLxSCzZBf3Bfg"
    },
    {
      "publicKey": "040502d8be8ab2c92476cfc1ea682350edde1504ae513cd3b0cddbac522a2b5315abe45a2e7309f625bc03c0f682127ba245a93954aac15a0fd0ed3d6b1f063278",
      "legacy": "1GKJ2JDRHAA3SodFArD9bveid174yiUWDd"
    }
  ],
  "addresses": [
    {
      "input": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "slpToCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg"
    },
    {
      "input": "qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "slpToCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg"
    },
    {
      "input": "BITCOINCASH:QPR8UTHZEYQLS77090CTAQ639YTH2AS6AVGXE2SVXG",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "slpToCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg"
    },
    {
      "input": "QPR8UTHZEYQLS77090CTAQ639YTH2AS6AVGXE2SVXG",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "Bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "bitcoincash:ppr8uthzeyqls77090ctaq639yth2as6avlry9h0a4",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bitcoincash:ppr8uthzeyqls77090ctaq639yth2as6avlry9h0a4",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:ppr8uthzeyqls77090ctaq639yth2as6avnc07z0rt",
      "slpToCashAddress": "bitcoincash:ppr8uthzeyqls77090ctaq639yth2as6avlry9h0a4"
    },
    {
      "input": "bitcoincash:pvafjqrrykref2leazngukagwux2n3radcu3wn0dpxvpj8hlp44z6g6vte7yr",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bitcoincash:pvafjqrrykref2leazngukagwux2n3radcu3wn0dpxvpj8hlp44z6g6vte7yr",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:pvafjqrrykref2leazngukagwux2n3radcu3wn0dpxvpj8hlp44z6ea57k5zu",
      "slpToCashAddress": "bitcoincash:pvafjqrrykref2leazngukagwux2n3radcu3wn0dpxvpj8hlp44z6g6vte7yr"
    },
    {
      "input": "bitcoincash:zpr8uthzeyqls77090ctaq639yth2as6av0v2572em",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "bchtest:qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bchtest:qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5",
      "isSlpAddress": false,
      "toSlpAddress": "slptest:qpr8uthzeyqls77090ctaq639yth2as6avhq6kgvnf",
      "slpToCashAddress": "bchtest:qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5"
    },
    {
      "input": "qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bchtest:qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5",
      "isSlpAddress": false,
      "toSlpAddress": "slptest:qpr8uthzeyqls77090ctaq639yth2as6avhq6kgvnf",
      "slpToCashAddress": "bchtest:qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5"
    },
    {
      "input": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "isSlpAddress": true,
      "toSlpAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "slpToCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg"
    },
    {
      "input": "qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": true,
      "toSlpAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "slpToCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg"
    },
    {
      "input": "slptest:ppr8uthzeyqls77090ctaq639yth2as6avq98e00g5",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "throws",
      "isSlpAddress": true,
      "toSlpAddress": "slptest:ppr8uthzeyqls77090ctaq639yth2as6avq98e00g5",
      "slpToCashAddress": "bchtest:ppr8uthzeyqls77090ctaq639yth2as6avm3qz4c6f"
    },
    {
      "input": "17RjTneJqCm3rGW3HtGizZqz8FUiUtijh1",
      "isCashAddress": false,
      "isLegacyAddress": true,
      "toCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "slpToCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg"
    },
    {
      "input": "387kPL8kP75RwSCUQywKRCCvGmmS1bCCsE",
      "isCashAddress": false,
      "isLegacyAddress": true,
      "toCashAddress": "bitcoincash:ppr8uthzeyqls77090ctaq639yth2as6avlry9h0a4",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:ppr8uthzeyqls77090ctaq639yth2as6avnc07z0rt",
      "slpToCashAddress": "bitcoincash:ppr8uthzeyqls77090ctaq639yth2as6avlry9h0a4"
    },
    {
      "input": "mmwgkqjHeECJdNyf1TF6pV4JzF5RLnR2j1",
      "isCashAddress": false,
      "isLegacyAddress": true,
      "toCashAddress": "bchtest:qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5",
      "isSlpAddress": false,
      "toSlpAddress": "slptest:qpr8uthzeyqls77090ctaq639yth2as6avhq6kgvnf",
      "slpToCashAddress": "bchtest:qpr8uthzeyqls77090ctaq639yth2as6avv5adjmp5"
    },
    {
      "input": "2MyfxT54mzZan9Dq267ZC39CBV7ybnj2JYm",
      "isCashAddress": false,
      "isLegacyAddress": true,
      "toCashAddress": "bchtest:ppr8uthzeyqls77090ctaq639yth2as6avm3qz4c6f",
      "isSlpAddress": false,
      "toSlpAddress": "slptest:ppr8uthzeyqls77090ctaq639yth2as6avq98e00g5",
      "slpToCashAddress": "bchtest:ppr8uthzeyqls77090ctaq639yth2as6avm3qz4c6f"
    },
    {
      "input": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxq",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "hello",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "12dP6EqQsKD72ohWccDMzbFxNCGgTqWK4vB2",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "CNtd2pzNiFjakQQTydbea5U1kNh8N7J1Z9",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": false,
      "toSlpAddress": "simpleledger:qpr8uthzeyqls77090ctaq639yth2as6avyaj39vck",
      "slpToCashAddress": "bitcoincash:qpr8uthzeyqls77090ctaq639yth2as6avgxe2svxg"
    },
    {
      "input": "bitcoincash:qqafjqrrykref2leazngukagwux2n3radcu3wn0dpxvpj8hlp44z6j00qwtxf",
      "isCashAddress": "throws",
      "isLegacyAddress": "throws",
      "toCashAddress": "throws",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    },
    {
      "input": "qpr8uthzeyqls77090ctaq639yth2as6avkgtv3gzj",
      "isCashAddress": true,
      "isLegacyAddress": false,
      "toCashAddress": "bchreg:qpr8uthzeyqls77090ctaq639yth2as6avkgtv3gzj",
      "isSlpAddress": "throws",
      "toSlpAddress": "throws",
      "slpToCashAddress": "throws"
    }
  ],
  "messages": [
    {
      "message": "",
      "bchjsSignature": "INt7MbPd2bVTvi/X6VkJOjTwYEoZW/55E7KhMWvj01G0dzMxNdcNmzUXTolbqeXtq4l0dkh5d6LvipNZ+37p3PU="
    },
    {
      "message": "hello",
      "bchjsSignature": "H/oNI6PdNw6hin3eZuwB3F1Bu/TZx9xw1n69SWrC9S1yBd8MOMkzi0SQxoPomwMLMMuCi5vXhH7KTpEmYXFq2fc="
    },
    {
      "message": "1767225600000",
      "bchjsSignature": "H6d1NKsFkTu9U9gFgO10wTgjD2DSSmMdfFn9rKdd/79Nfj6H38Q33ppSIhHMsis48eTtqpLlgircg8VpxMhUawc="
    },
    {
      "message": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "bchjsSignature": "IOL9wKoXOlbIiG9Hc/zWzDBZ1SczKAg4o6aACPoafGLdZ6PyZex8o7+SWo0e7kRlaOlZ+88cCUZo7BprgFUQwZg="
    },
    {
      "message": "{\"linkCode\":\"abc123\"}",
      "bchjsSignature": "IOTYse1HpdBgd1OQEA2dtAnmH1cgq3INyu7Si1n3yCSKBrptbJDs96Twn4pH0HMXuN5PAjqqfzQSpOE5NQ1PGQ0="
    },
    {
      "message": "ünïcödé ✓",
      "bchjsSignature": "H0hfy2NpVnrRps01MoTomCY5iY7QMtsNB8rgdnT0g/EKQCs3mVvXQIHXAEcAiXA4+eDNRkVqm+0gO0W/+bdnlE0="
    }
  ],
  "signer": {
    "wif": "KxvPKnWkQTwU6jiqLwtftujLanAPzAdPXYG7dyMzP6AKaLgQj4Ud",
    "cash": "bitcoincash:qqcej57gwvengg37tmr2ghh07v665svt9uwrczd7sl"
  }
}

function scenario (name, fn) {
  return Promise.resolve(fn()).then(() => console.log(`  ok - ${name}`))
}

const isAscii = text => [...text].every(character => character.charCodeAt(0) < 128)

console.log('bch-keys smoke test')

await scenario('derives the xpubs, addresses, WIFs and public keys bch-js did at Paytaca\'s BCH and SLP paths', async () => {
  for (const expected of BCHJS.hd) {
    const master = keys.hdNodeFromSeed(await mnemonicToSeed(expected.mnemonic))
    const account = keys.deriveHdNode(master, expected.path)
    assert.equal(keys.hdNodeToXPub(account), expected.xpub)
    assert.equal(keys.hdNodeToXPub(keys.hdNodeFromXPub(expected.xpub)), expected.xpub)
    const fromXPub = keys.deriveHdNode(keys.hdNodeFromXPub(expected.xpub), '13')
    assert.equal(keys.hdNodeToPublicKey(fromXPub), expected.xpubChild13)
    for (const address of expected.addresses) {
      const relative = keys.deriveHdNode(account, address.sub)
      assert.equal(keys.hdNodeToCashAddress(relative), address.cash)
      assert.equal(keys.hdNodeToSlpAddress(relative), address.slp)
      const absolute = keys.deriveHdNode(master, `${expected.path}/${address.sub}`)
      assert.equal(keys.hdNodeToWif(absolute), address.wif)
      assert.equal(keys.hdNodeToPublicKey(absolute), address.publicKey)
    }
  }
})

await scenario('reads WIFs as bch-js did, refusing an uncompressed mainnet one', () => {
  for (const expected of BCHJS.wifs) {
    if (expected.publicKey === 'throws') {
      assert.throws(() => keys.wifToPublicKey(expected.wif))
      assert.throws(() => keys.wifToCashAddress(expected.wif))
      continue
    }
    assert.equal(keys.wifToPublicKey(expected.wif), expected.publicKey, expected.type)
    assert.equal(keys.wifToCashAddress(expected.wif), expected.cash, expected.type)
  }
})

await scenario('gives the legacy address of a compressed or uncompressed public key', () => {
  for (const expected of BCHJS.legacy) assert.equal(keys.publicKeyToLegacyAddress(expected.publicKey), expected.legacy)
})

// bch-js's SLP conversions took BitPay-format legacy addresses; nothing in the app passes them one
const BITPAY_ADDRESS = 'CNtd2pzNiFjakQQTydbea5U1kNh8N7J1Z9'

await scenario('checks and converts addresses as bch-js did, returning false where it threw', () => {
  const result = fn => { try { return fn() } catch { return 'throws' } }
  for (const expected of BCHJS.addresses) {
    const label = name => `${name}(${JSON.stringify(expected.input)})`
    // the is*Address checks return false where bch-js threw
    const checkResult = bchjs => bchjs === 'throws' ? false : bchjs
    assert.equal(keys.isCashAddress(expected.input), checkResult(expected.isCashAddress), label('isCashAddress'))
    assert.equal(keys.isLegacyAddress(expected.input), checkResult(expected.isLegacyAddress), label('isLegacyAddress'))
    assert.equal(keys.isSlpAddress(expected.input), checkResult(expected.isSlpAddress), label('isSlpAddress'))
    assert.equal(result(() => keys.toCashAddress(expected.input)), expected.toCashAddress, label('toCashAddress'))
    if (expected.input === BITPAY_ADDRESS) continue
    assert.equal(result(() => keys.toSlpAddress(expected.input)), expected.toSlpAddress, label('toSlpAddress'))
    assert.equal(result(() => keys.slpToCashAddress(expected.input)), expected.slpToCashAddress, label('slpToCashAddress'))
  }
  assert.throws(() => keys.toSlpAddress(BITPAY_ADDRESS))
  assert.throws(() => keys.slpToCashAddress(BITPAY_ADDRESS))
})

await scenario('signs ASCII messages exactly as bch-js did, and verifies those signatures', () => {
  const { wif, cash } = BCHJS.signer
  const legacy = keys.publicKeyToLegacyAddress(keys.wifToPublicKey(wif))
  for (const { message, bchjsSignature } of BCHJS.messages.filter(m => isAscii(m.message))) {
    assert.equal(keys.signMessage(wif, message), bchjsSignature, JSON.stringify(message))
    assert.equal(keys.verifyMessage(cash, bchjsSignature, message), true)
    assert.equal(keys.verifyMessage(legacy, bchjsSignature, message), true)
    assert.equal(keys.verifyMessage(cash, bchjsSignature, message + '.'), false)
  }
})

await scenario('signs non-ASCII messages by the standard, which bch-js did not', () => {
  const { wif, cash } = BCHJS.signer
  const [{ message, bchjsSignature }] = BCHJS.messages.filter(m => !isAscii(m.message))
  // computed separately with node's sha256 over the standard magic, the UTF-8 byte length and bytes
  const standardSignature = 'H4kofhGC98u2FGB/XfjjUNg9ef8lLfKBYiiYoFbkfb9SJvS32y+gl50X0jWmXywpsazwnLhTCnMW1XtkbID5ziU='
  assert.equal(keys.signMessage(wif, message), standardSignature)
  assert.notEqual(bchjsSignature, standardSignature)
  assert.equal(keys.verifyMessage(cash, standardSignature, message), true)
  assert.equal(keys.verifyMessage(cash, bchjsSignature, message), false)
})

await scenario('refuses to sign with an uncompressed key, which the signer cannot express', () => {
  for (const { type, wif } of BCHJS.wifs.filter(w => w.type.endsWith('Uncompressed'))) {
    assert.throws(() => keys.signMessage(wif, 'hello'), /uncompressed/, type)
  }
})

await scenario('refuses to sign anything but a string, as bch-js did', () => {
  for (const message of [undefined, null, 123, Buffer.from('hello')]) {
    assert.throws(() => keys.signMessage(BCHJS.signer.wif, message), /must be a string/)
  }
})

await scenario('refuses a legacy address for a public key that is not one', () => {
  for (const publicKey of ['', 'zz', '02' + '00'.repeat(32), 'abcd']) {
    assert.throws(() => keys.publicKeyToLegacyAddress(publicKey), /Invalid public key/)
  }
})

await scenario('does not verify a signature against another key\'s address or a malformed one', () => {
  const { wif } = BCHJS.signer
  const other = BCHJS.wifs.find(w => w.type === 'testnet').cash
  const signature = keys.signMessage(wif, 'hello')
  assert.equal(keys.verifyMessage(other, signature, 'hello'), false)
  assert.equal(keys.verifyMessage(BCHJS.signer.cash, 'not a signature', 'hello'), false)
  assert.equal(keys.verifyMessage('not an address', signature, 'hello'), false)
})

console.log('\nbch-keys smoke test passed')

export const mixedUtxos = [
    {
        txid: 'e3f1a5b7a08c58e7b83f62a2a5b1e408f3b1d4354eec5e7893a1b2c3d4e5f678',
        vout: 0,
        sequenceNumber: 0,
        satoshis: 2012000,
        addressPath: "0/0"
    },
    {
        txid: 'f1e2d3c4b5a697887766554433221100ffeeccbbaa99887766554433221100ff',
        vout: 1,
        sequenceNumber: 0,
        satoshis: 121129,
        addressPath: "0/0",
        token: {
            category: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
            amount: '1000000000000'
        }
    },
    {
        txid: 'f1e2d3c4b5a697887766554433221100ffeeccbbaa99887766554433221100ff',
        vout: 1,
        sequenceNumber: 0,
        satoshis: 1000,
        addressPath: "0/1",
        token: {
            category: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
            amount: '1000000000000'
        }
    },
    {
        txid: 'abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
        vout: 2,
        sequenceNumber: 0,
        satoshis: 1000,
        addressPath: "0/2",
        token: {
            category: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            amount: '1',
            nft: {
                capability: 'mutable',
                commitment: '4e46543a426f6f6b4f66536f756c73' // "NFT:BookOfSouls"
            }
        }
    },
    {
        txid: '9f9f8e8d7c7b6a6b5a5b4c4d3e3f2f1e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a',
        vout: 0,
        sequenceNumber: 0,
        satoshis: 500000,
        addressPath: "0/3"
    },
    {
        txid: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        vout: 3,
        sequenceNumber: 0,
        satoshis: 75000,
        addressPath: "0/4"
    },
    {
        txid: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        vout: 1,
        sequenceNumber: 0,
        satoshis: 300000,
        addressPath: "0/5",
        token: {
            category: 'feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
            amount: '250000000000'
        }
    },
    {
        txid: '1111111111111111111111111111111111111111111111111111111111111111',
        vout: 0,
        sequenceNumber: 0,
        satoshis: 546,
        addressPath: "0/6",
        token: {
            category: 'cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe',
            amount: '1',
            nft: {
                capability: 'none',
                commitment: '4e46543a41727469666163743a3031' // "NFT:Artifact:01"
            }
        }
    },
    {
        txid: '2222222222222222222222222222222222222222222222222222222222222222',
        vout: 2,
        sequenceNumber: 0,
        satoshis: 10000,
        addressPath: "0/7"
    }
];

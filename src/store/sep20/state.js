export default function () {
  return {
    assets: [
      {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        balance: 0
      },
      {
        id: 'sep20/0xFa77D1D8AADDd9a263C7d685375EF148E268c558',
        symbol: 'ATK',
        name: 'AnToken',
        logo: '',
        balance: 0,
      }
    ],

    nftAssets: [
      {
        address: '0xC054A7F7866ba73889511c48967be776008eb408',
        name: 'Gambling Apes Club',
        symbol: 'GAC',
      },
      {
        address: '0xE765026Cad648785b080E78700cBF6fa1C050d7C',
        name: 'CashCats NFT',
        symbol: '',
      }
    ]
  }
}

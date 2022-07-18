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
        id: 'sep20/0xe11829a7d5d8806bb36e118461a1012588fafd89',
        symbol: 'SPICE',
        name: 'Spice',
        logo: 'spice-logo.png',
        balance: 0
      }
    ],
    ignoredAssets: [],

    nftAssets: [
      {
        address: '0xC054A7F7866ba73889511c48967be776008eb408',
        name: 'Gambling Apes Club',
        symbol: 'GAC'
      },
      {
        address: '0x65496F09592883390Df9780964CE04F2e2C07b93',
        name: 'Spice NFT',
        symbol: 'SPICENFT'
      },
      {
        address: '0xE765026Cad648785b080E78700cBF6fa1C050d7C',
        name: 'CashCats NFT',
        symbol: ''
      }
    ]
  }
}

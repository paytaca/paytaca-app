# Paytaca

![License](https://img.shields.io/badge/license-Proprietary-blue)
![Version](https://img.shields.io/badge/version-v0.24.0-green)

**A secure and convenient Bitcoin Cash wallet app for everyone.**

Paytaca is a non-custodial Bitcoin Cash (BCH) wallet that gives users exclusive control over their private keys. Available as a mobile app and browser extension, Paytaca provides seamless access to the BCH ecosystem with an intuitive interface for users of all experience levels.

## Features

### Wallet Core

- **Non-custodial** - Exclusive control over your private keys
- **Multi-platform** - Available on Android, iOS, and Chrome
- **HD Wallet** - BIP32/BIP39/BIP44 hierarchical deterministic wallet
- **Multiple Wallets** - Create and manage multiple wallets
- **Wallet Backup** - Seed phrase & sharded backup (Shamir's Secret Sharing)
- **Wallet Restoration** - Import from seed phrase or WIF private key
- **BIP38** - Import encrypted private keys

### Send & Receive

- **Send/Receive BCH** - Fast peer-to-peer transactions
- **CashTokens** - Full support for fungible tokens & NFTs (CT)
- **SLP Tokens** - Simple Ledger Protocol token support
- **BIP21 Payment URIs** - Standardized payment links
- **Gift Links** - Create and claim BCH gifts
- **QR Codes** - Generate and scan for easy payments

### Protocols & Standards

- **Bitcoin Cash** - Mainnet and Chipnet (testnet) support
- **CashAddr** - Native BCH address format
- **CashTokens (CT)** - Native token layer for BCH
- **JSON Payment Protocol** - Payment protocol support
- **PSBT** - Partially Signed Bitcoin Transactions for multisig
- **BCMR** - Bitcoin Cash Metadata Registry

### DeFi & Trading

- **AnyHedge** - Decentralized derivatives and hedge contracts
- **Stablehedge** - BCH-backed stablecoins (Beta)
- **Cauldron DEX** - Token swaps & liquidity pools
- **Crypto Swap** - Cross-chain swaps (BTC, ETH, SOL to BCH)
- **LIFT Token** - governance and utility token support

### P2P Exchange & Ramps

- **P2P Exchange** - Buy and sell BCH peer-to-peer
- **E-load Service** - Mobile/data loads, cable, game pins (Philippines)
- **Merchant Map** - Find BCH-accepting merchants nearby

### dApp Integration

- **WalletConnect v1 & v2** - Connect to Web3 dApps
- **WizardConnect** - Custom relay protocol for dApp connections
- **Deep Links** - paytaca://, bitcoincash://, ethereum:// support

### Merchant Tools

- **PaytacaPOS** - Point of Sale management for merchants
- **Merchant Cashout** - Convert BCH to fiat
- **Escrow Contracts** - Secure marketplace transactions
- **Dispute Resolution** - Arbitration system for commerce

### Marketplace

- **Browse Storefronts** - Shop with BCH
- **Product Catalogs & Collections** - Organized merchant offerings
- **Shopping Cart & Checkout** - Seamless BCH payments
- **Order Tracking** - Real-time delivery updates

### Multisig Wallets (Beta)

- **Create Multisig Wallets** - Require multiple signatures
- **Import Multisig Wallets** - Join existing multisig setups
- **PSBT Signing** - Collaborative transaction signing
- **Cosigner QR Exchange** - Easy setup between cosigners

### Security

- **PIN Code** - Secure wallet access
- **Biometric Authentication** - Fingerprint/Face ID support
- **App Lock** - Automatic wallet locking
- **Address Book** - Save and verify frequently used addresses

### Additional Features

- **Rewards Program** - Earn points through referrals
- **Push Notifications** - Transaction and price alerts
- **Multi-language** - 18+ languages supported
- **Dark Mode** - Easy on the eyes
- **Price Feeds** - Real-time market data
- **Currency Conversion** - Fiat/BCH conversion

## Download

| Platform | Link |
|----------|------|
| Android | [Google Play Store](https://play.google.com/store/apps/details?id=com.paytaca.app) |
| iOS | [Apple App Store](https://apps.apple.com/app/paytaca/id1451795432) |
| Chrome | [Chrome Web Store](https://chrome.google.com/webstore/detail/paytaca/pakphhpnneopheifihmjcjnbdbhaaiaa) |

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/paytaca/paytaca-app.git
cd paytaca-app

# Install dependencies
npm install

# Run development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (SPA) |
| `npm run build` | Build for production (SPA) |
| `npm run lint` | Run ESLint |
| `npm test` | Run Cypress tests |
| `npm run test:unit` | Run unit tests |

### Mobile Development

```bash
# iOS
npm run dev:capacitor:ios
npm run build:capacitor:ios

# Android
npm run dev:capacitor:android
npm run build:capacitor:android
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under a proprietary license. See the [LICENSE](LICENSE) file for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/paytaca/paytaca-app/issues)
- **Email:** info@paytaca.com

## About Bitcoin Cash

Bitcoin Cash (BCH) is a decentralized digital currency designed for direct peer-to-peer payments. With fast transaction speeds, minimal fees, and programmability, BCH empowers individuals globally to participate in a peer-to-peer economy.

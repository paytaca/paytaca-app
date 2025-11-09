/**
 * Get initial wallet-specific state for PaytacaPOS
 * @returns {Object} Initial state for a wallet
 */
export function getInitialWalletState() {
  return {
    merchants: [],
    branches: [],
    linkCodes: [],
    devicesLastActive: [],
    paymentOTPCache: {},
    paymentMethod: {},
    lastPaymentMethod: null,
    cashoutMerchant: {}
  }
}

export default function () {
  return {
    // Wallet-specific state organized by wallet hash
    byWallet: {},
  }
}

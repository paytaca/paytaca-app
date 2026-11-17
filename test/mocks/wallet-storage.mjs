export function getCurrentWalletHash () {
  return null
}

export function getWalletStorageKey (prefix, walletHash) {
  if (!walletHash) return `${prefix}-temp`
  return `${prefix}-${walletHash}`
}

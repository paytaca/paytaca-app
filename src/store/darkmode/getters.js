export function getStatus (state, getters, rootState) {
  // Check if wallet-specific settings exist in vault
  if (rootState && rootState.global && rootState.global.vault && rootState.global.vault[rootState.global.walletIndex]) {
    const vaultSettings = rootState.global.vault[rootState.global.walletIndex].settings
    if (vaultSettings && vaultSettings.darkMode !== undefined) {
      return vaultSettings.darkMode
    }
  }
  // Fallback to module state
  return state.darkmode
}

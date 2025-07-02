import { Store } from "src/store";

// Checks for invalid vault entries and removes them if any
export function sanitizeVault() {
    const vault = Store.getters['global/getVault']
    console.log('[Wallet Vault] vault:', vault)

    if (Array.isArray(vault)) {
        const sanitizedVault = vault.filter(
            entry => typeof entry === 'object' && entry !== null && !Array.isArray(entry)
        );
        console.log('[Wallet Vault] sanitizedVault:', sanitizedVault)
        if (sanitizedVault.length !== vault.length) {
            Store.commit('global/clearVault')
            Store.commit('global/updateVault', sanitizedVault);
            console.log('[Wallet Vault] Invalid entries removed from vault');
        }
    }
}
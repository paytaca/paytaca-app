import { Store } from "src/store";

// Checks for invalid vault entries and removes them if any
export function sanitizeVault() {    
    const vault = Store.getters['global/getVault']
    console.log('[Sanitize Vault] vault:', vault)

    if (Array.isArray(vault)) {
        const sanitizedVault = vault.filter(
            entry => {
                // Must be a plain object, not null, not an array
                const isValidObject = typeof entry === 'object' && entry !== null && !Array.isArray(entry);

                if (!isValidObject) return false;

                // Check for critical fields: e.g., valid non-empty xPubKey
                const hasValidXPubKey = typeof entry?.wallet?.bch?.xPubKey === 'string' && entry?.wallet?.bch?.xPubKey.trim() !== '';
                return hasValidXPubKey;
            }
        );
        
        console.log('[Sanitize Vault] sanitizedVault:', sanitizedVault)
        if (sanitizedVault.length !== vault.length) {
            Store.commit('global/clearVault')
            Store.commit('global/updateVault', sanitizedVault);
            console.log('[Sanitize Vault] Invalid entries removed from vault');
        }
    }
}
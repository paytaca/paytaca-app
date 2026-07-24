import { Store } from 'src/store'
import { backend } from 'src/services/card/backend'
import { cardLogger } from 'src/utils/debug-logger.js'

const DB_NAME = "secure-keys";
const STORE_NAME = "keypairs";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getKeyId() {
  const walletIndex = Store.getters['global/getWalletIndex']
  return `wallet-${walletIndex}`;
}

export async function generateAndStoreKeyPair({ force = false } = {}) {
  const keyId = getKeyId();

  if (!force) {
    const existing = await getStoredPrivateKey();
    if (existing) {
      throw new Error(
        `A keypair already exists for ${keyId}. Call generateAndStoreKeyPair({ force: true }) ` +
        `if you intend to deliberately overwrite it -- doing so makes any data encrypted under ` +
        `the previous public key permanently undecryptable.`
      );
    }
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );

  // Export BEFORE opening the transaction. IndexedDB transactions auto-commit
  // once nothing is left queued on them -- awaiting an unrelated async op
  // (like exportKey) inside an open transaction lets it close prematurely,
  // causing "InvalidStateError" on the next objectStore() call.
  const publicKeyBytes = await crypto.subtle.exportKey("spki", keyPair.publicKey);

  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(keyPair.privateKey, `${keyId}:private`);
    tx.objectStore(STORE_NAME).put(publicKeyBytes, `${keyId}:public`);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  return publicKeyBytes; // already exported once above, no need to export again
}

export async function getStoredPrivateKey() {
  const keyId = getKeyId();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(`${keyId}:private`);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getStoredPublicKey() {
  const keyId = getKeyId();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(`${keyId}:public`);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns the public key for the current wallet, generating and storing a
 * fresh keypair first if one doesn't exist yet. Safe to call on every app
 * launch / every time you need the public key -- it will NOT overwrite an
 * existing keypair, unlike calling generateAndStoreKeyPair() directly.
 *
 * Returns: { publicKeyBytes: ArrayBuffer, created: boolean }
 *   - created is true if a brand new keypair was just generated,
 *     false if an existing one was found and reused.
 */
export async function getOrCreateKeyPair() {
  const existingPublicKey = await getStoredPublicKey();
  if (existingPublicKey) {
    return { publicKeyBytes: existingPublicKey, created: false };
  }

  // No key found for this wallet -- safe to generate, since generateAndStoreKeyPair()
  // itself re-checks for an existing key and would throw if one appeared in
  // between our check above and this call (e.g. a concurrent call elsewhere).
  const publicKeyBytes = await generateAndStoreKeyPair();
  return { publicKeyBytes, created: true };
}

/**
 * Deletes the stored keypair (private + public) for the CURRENT wallet
 * (per getKeyId()). No-op if nothing was stored for this wallet.
 */
export async function clearKey() {
  const keyId = getKeyId();
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(`${keyId}:private`);
    tx.objectStore(STORE_NAME).delete(`${keyId}:public`);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Deletes a keypair for a SPECIFIC wallet index, regardless of which wallet
 * is currently active. Useful for cleaning up a wallet the user removed,
 * without switching the active wallet first.
 */
export async function clearKeyForWallet(walletIndex) {
  const keyId = `wallet-${walletIndex}`;
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(`${keyId}:private`);
    tx.objectStore(STORE_NAME).delete(`${keyId}:public`);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Deletes ALL stored keys, for every wallet. Use for things like
 * "log out and wipe local crypto material" or a full app reset.
 */
export async function clearAllKeys() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Lists the wallet keyIds currently stored (without exposing key material) --
 * e.g. ["wallet-0", "wallet-2"]. Useful for debugging or knowing which
 * wallets already have a keypair set up on this device.
 */
export async function listStoredKeyIds() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => {
      const ids = new Set(
        request.result.map((k) => k.replace(/:(private|public)$/, ""))
      );
      resolve([...ids]);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fetches the active dispatcher public key from the backend.
 * This key is used to encrypt the DEK (Data Encryption Key) for encrypting customer addresses.
 * 
 * @async
 * @returns {Promise<string>} The active dispatcher public key in Base64 format.
 */
export async function fetchActiveDispatcherPublicKey() {
  try {
    const response = await backend.get('/dispatcher/active-public-key/', { authorize: false });
    return response.data.public_key;
  } catch (error) {
    cardLogger.error('Error fetching active dispatcher public key:', error);
    throw error;
  }
}
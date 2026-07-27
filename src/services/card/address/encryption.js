import { uint8ArrayToBase64, base64ToUint8Array } from 'src/utils/encoding';

async function generateDEK() {
    const key = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
    return key;
}

async function encryptAddress(dek, address) {
  const nonce = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce, standard for GCM
  const encoded = new TextEncoder().encode(address);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    dek,
    encoded
  );

  // Concatenate nonce + ciphertext -- nonce isn't secret, just needs to travel
  // alongside the ciphertext so decryption knows which IV was used.
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(ciphertext), nonce.length);
  return combined;
}

async function wrapDEKForRecipient(dek, recipientPublicKeyBytes) {
  const publicKey = await crypto.subtle.importKey(
    "spki",
    recipientPublicKeyBytes,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );

  // Need the DEK's raw bytes to encrypt it with RSA (RSA-OAEP wraps raw key material).
  const rawDek = await crypto.subtle.exportKey("raw", dek);

  const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawDek);
  return new Uint8Array(wrapped);
}

export async function createEncryptedAddressPayload(address, ownerPublicKeyBytes, dispatcherPublicKeyBytes) {
  const dek = await generateDEK();

  const encryptedAddress = await encryptAddress(dek, address);
  const encryptedKeyOwner = await wrapDEKForRecipient(dek, ownerPublicKeyBytes);
  const encryptedKeyDispatcher = await wrapDEKForRecipient(dek, dispatcherPublicKeyBytes);

  return {
    encrypted_address: uint8ArrayToBase64(encryptedAddress),
    encrypted_key_owner: uint8ArrayToBase64(encryptedKeyOwner),
    encrypted_key_dispatcher: uint8ArrayToBase64(encryptedKeyDispatcher),
  };
}

async function unwrapDEK(privateKey, encryptedKeyBytes) {
  const rawDek = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encryptedKeyBytes);

  // Re-import the raw bytes as a usable AES-GCM CryptoKey.
  return crypto.subtle.importKey("raw", rawDek, { name: "AES-GCM" }, true, ["decrypt"]);
}

export async function decryptAddressPayload(payload, privateKey) {
  const encryptedKeyBytes = base64ToUint8Array(payload.encrypted_key_owner); // Assuming the owner is decrypting
  const encryptedAddressBytes = base64ToUint8Array(payload.encrypted_address);
  const dek = await unwrapDEK(privateKey, encryptedKeyBytes);
  const nonce = encryptedAddressBytes.slice(0, 12);
  const ciphertext = encryptedAddressBytes.slice(12);

  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, dek, ciphertext);
  return new TextDecoder().decode(plaintext);
}

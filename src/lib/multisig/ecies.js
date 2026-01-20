import { encrypt, decrypt, PrivateKey } from 'eciesjs';
import { utf8ToBin, binToUtf8, hexToBin, binToHex } from 'bitauth-libauth-v3';

/**
 * Decrypts an ECIES message using the owner's private key.
 * 
 * @param {Uint8Array|string} ownerPrivateKeyBytes - The owner's private key as a Uint8Array or hex string.
 * @param {string} encryptedHexMessage - The encrypted message in hexadecimal format.
 * @returns {Promise<string>} The decrypted message as a UTF-8 string.
 * @throws {Error} If decryption fails.
 */
export async function decryptECIESMessage(ownerPrivateKeyBytes, encryptedHexMessage) {
    const encryptedBytes = hexToBin(encryptedHexMessage);

    // eciesjs decrypt takes (privateKey, data)
    const decryptedBytes = decrypt(ownerPrivateKeyBytes, encryptedBytes);

    return binToUtf8(decryptedBytes);
}

/**
 * Encrypts a message using ECIES for a specific recipient's public key.
 * 
 * @param {Uint8Array|string} recipientRawPublicKey - The recipient's raw public key as a Uint8Array or hex string.
 * @param {string} messageText - The plain text message to encrypt.
 * @returns {Promise<string>} The encrypted message in hexadecimal format.
 * @throws {Error} If recipientRawPublicKey is undefined or null, or if encryption fails.
 */
export async function encryptECIESMessage(recipientRawPublicKey, messageText) {
    if (!recipientRawPublicKey) {
        throw new Error('recipientRawPublicKey is required but was undefined or null');
    }
    const messageBytes = utf8ToBin(messageText); 
    const encryptedBytes = encrypt(recipientRawPublicKey, messageBytes);
    return binToHex(encryptedBytes);
}


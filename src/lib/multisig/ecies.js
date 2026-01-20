import { ecies } from '@noble/ciphers/ecies'
import { secp256k1, utf8ToBin, binToUtf8, hexToBin, binToHex} from 'bitauth-libauth-v3'

/**
 * Decrypts an ECIES message using the owner's private key.
 * @param {Uint8Array} ownerPrivateKeyBytes The owner's raw private key bytes.
 * @param {string} encryptedHexMessage The encrypted message received.
 * @returns {Promise<string>} The original plaintext message.
 */
export async function decryptECIESMessage(ownerPrivateKeyBytes, encryptedHexMessage) {
    const encryptedBytes = hexToBin(encryptedHexMessage);

    // Initialize ECIES with libauth's curve implementation
    const eciesDecrypt = ecies(secp256k1);

    const decryptedBytes = await eciesDecrypt.decrypt(
        ownerPrivateKeyBytes,
        encryptedBytes
    );

    return binToUtf8(decryptedBytes);
}


  /**
  * Encrypts a message using ECIES for a specific recipient's public key.
  * @param {Uint8Array} recipientRawPublicKey The raw compressed public key.
  * @param {string} messageText The message to encrypt.
  * @returns {Promise<string>} The encrypted message encoded as a hex string.
  */
  export async function encryptMessageForXpubOwner(recipientRawPublicKey, messageText) {
    const messageBytes = utf8ToBin(messageText); 

    // Initialize ECIES using libauth's secp256k1 implementation
    const eciesEncrypt = ecies(secp256k1);

    const encryptedBytes = await eciesEncrypt.encrypt(
        recipientRawPublicKey, 
        messageBytes
    );

    return binToHex(encryptedBytes);
  }
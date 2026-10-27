/*
 * Vendored from mainnet-js 3.1.7, https://github.com/mainnet-cash/mainnet-js
 * Copyright (c) 2020 mainnet-cash, MIT License, see src/vendor/mainnet-js/LICENSE
 * File: dist/module/message/signed.js of the npm package
 *
 * Why vendored: this file signs and verifies Bitcoin signed messages, which the app did with
 *   @psf/bch-js. Its bitcoinjs-message measured the message in characters rather than bytes, so
 *   signatures of messages with non-ASCII characters differ from the standard this file follows.
 *
 * Changes from the source: the libauth import names Paytaca's libauth 3 (bitauth-libauth-v3),
 * the source map comment is dropped, and this header is added.
 * The code below is otherwise verbatim.
 */
import { assertSuccess, base64ToBin, bigIntToCompactUint, binToBase64, decodeCashAddress, encodeCashAddress, secp256k1, sha256, utf8ToBin, } from "bitauth-libauth-v3";
import { hash160 } from "../util/hash160.js";
/**
 * message_magic - Add "Magic", per standard bitcoin message signing.
 *
 * In this case, the magic is simply adding the number 24 as binary "\x18", and "Bitcoin Signed Message\n" followed
 * by the size of the message in Bitcoin's "varint" format followed by the message encoded as binary.
 *
 * @param {str} string    The string to add the magic syntax to.
 *
 * @returns a promise to the string as binary array with magic syntax
 */
// see    https://github.com/Electron-Cash/Electron-Cash/blob/49f9f672364f50053a026e4a5cb30e92db2d195d/electroncash/bitcoin.py#L524
function message_magic(str) {
    const msgBytes = utf8ToBin(str);
    const payload = `\x18Bitcoin Signed Message:\n`;
    return new Uint8Array([
        ...utf8ToBin(payload),
        ...bigIntToCompactUint(BigInt(msgBytes.length)),
        ...msgBytes,
    ]);
}
/**
 * hash_magic - Return the hash of the string that has undergone standard formatting
 *
 * @param {str} string    The string to hash
 *
 * @returns a promise to the hash of the string.
 */
export function hash_message(str) {
    const h = sha256.hash;
    return h(h(message_magic(str)));
}
export class SignedMessage {
    /**
     * sign - Calculate the recoverable signed checksum of a string message.
     *
     * @param {message} string          The
     * @param {privateKey} Uint8Array   The private key to sign the message with
     *
     * @returns a promise to signature as a string
     */
    sign(message, privateKey) {
        const messageHash = hash_message(message);
        const rs = secp256k1.signMessageHashRecoverableCompact(privateKey, messageHash);
        if (typeof rs === "string") {
            throw new Error(rs);
        }
        const sigDer = secp256k1.signMessageHashDER(privateKey, messageHash);
        const sigSchnorr = secp256k1.signMessageHashSchnorr(privateKey, messageHash);
        const electronEncoding = new Uint8Array([
            ...[31 + rs.recoveryId],
            ...rs.signature,
        ]);
        return {
            raw: {
                ecdsa: binToBase64(rs.signature),
                schnorr: binToBase64(sigSchnorr),
                der: binToBase64(sigDer),
            },
            details: {
                recoveryId: rs.recoveryId,
                compressed: true,
                messageHash: binToBase64(messageHash),
            },
            signature: binToBase64(electronEncoding),
        };
    }
    static sign(message, privateKey) {
        return new this().sign(message, privateKey);
    }
    /**
     * verify - Validate that the message is valid against a given signature
     *
     * @param {message} string     The message to verify as a utf8 string
     * @param {signature} string   The signature as a base64 encoded string
     * @param {cashaddr} string    The cashaddr to validate the signature against a recoverable signature.
     * @param {publicKey} string    If publicKey is not recoverable from the signature type, the publicKey must be passed.
     *
     * @returns a promise to signature as a string
     */
    verify(message, signature, cashaddr, publicKey) {
        // Check that the signature is valid for the given message.
        const messageHash = hash_message(message);
        const sig = base64ToBin(signature);
        let signatureValid = false;
        let keyMatch = false;
        let pkhMatch = false;
        let pkh, signatureType;
        if (sig.length === 65) {
            const rawSig = sig.length === 65 ? sig.slice(1) : sig;
            const recoveryId = sig.slice(0, 1)[0] - 31;
            const recoveredPk = secp256k1.recoverPublicKeyCompressed(rawSig, recoveryId, messageHash);
            if (typeof recoveredPk === "string") {
                throw new Error(recoveredPk);
            }
            pkh = hash160(recoveredPk);
            signatureType = "recoverable";
            signatureValid = secp256k1.verifySignatureCompact(rawSig, recoveredPk, messageHash);
            if (cashaddr) {
                // Validate that the signature actually matches the provided cashaddr
                const decoded = assertSuccess(decodeCashAddress(cashaddr));
                const resultingCashaddr = encodeCashAddress({
                    prefix: decoded.prefix,
                    type: decoded.type,
                    payload: pkh,
                }).address;
                if (resultingCashaddr === cashaddr) {
                    pkhMatch = true;
                }
            }
        }
        else if (publicKey) {
            if (secp256k1.verifySignatureDER(sig, publicKey, messageHash)) {
                signatureType = "der";
                signatureValid = true;
                keyMatch = true;
            }
            else if (secp256k1.verifySignatureSchnorr(sig, publicKey, messageHash)) {
                signatureType = "schnorr";
                signatureValid = true;
                keyMatch = true;
            }
            else if (secp256k1.verifySignatureCompact(sig, publicKey, messageHash)) {
                signatureType = "ecdsa";
                signatureValid = true;
                keyMatch = true;
            }
            else {
                signatureType = "na";
            }
        }
        return {
            valid: signatureValid && (keyMatch || pkhMatch),
            details: {
                signatureValid: signatureValid,
                signatureType: signatureType,
                messageHash: binToBase64(messageHash),
                publicKeyHashMatch: pkhMatch,
                publicKeyMatch: keyMatch,
            },
        };
    }
    static verify(message, signature, cashaddr, publicKey) {
        return new this().verify(message, signature, cashaddr, publicKey);
    }
}

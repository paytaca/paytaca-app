/*
 * Vendored from mainnet-js 3.1.7, https://github.com/mainnet-cash/mainnet-js
 * Copyright (c) 2020 mainnet-cash, MIT License, see src/vendor/mainnet-js/LICENSE
 * File: dist/module/util/hash160.js of the npm package
 *
 * Why vendored: signed.js imports it.
 *
 * Changes from the source: the libauth import names Paytaca's libauth 3 (bitauth-libauth-v3),
 * the source map comment is dropped, and this header is added.
 * The code below is otherwise verbatim.
 */
import { ripemd160, sha256 } from "bitauth-libauth-v3";
/**
 * hash160 - Calculate the sha256, ripemd160 hash of a value
 *
 * @param {message} Uint8Array       value to hash as a binary array
 *
 * @returns a promise to the hash160 value of the input
 */
export function hash160(message) {
    return ripemd160.hash(sha256.hash(message));
}

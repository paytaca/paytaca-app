#!/usr/bin/env node
// Emit one app-shaped signed request for the offline cross-language check.
//
// The key is a throwaway constant (0x22 repeated). It signs nothing of value
// and is never used by the app; do not send funds to it. The wallet hash is a
// placeholder: the Python verifier maps the signing key to a digest with
// Watchtower mocked, and only checks that the header hint matches that digest.
//
// Usage: node scripts/verify-signing.mjs > /tmp/paytaca-signed.json

import { encodePrivateKeyWif, hexToBin } from 'bitauth-libauth-v3'

import {
  buildCanonical,
  createNonce,
  sha256Hex,
  signingHeaders,
  toBodyBytes
} from '../src/utils/request-signing.js'

// Throwaway key. Never a real wallet.
const THROWAWAY_KEY_HEX = '22'.repeat(32)
const WIF = encodePrivateKeyWif(hexToBin(THROWAWAY_KEY_HEX), 'mainnet')

const WALLET_HASH = 'a'.repeat(64)
const METHOD = 'post'
const FULL_PATH = '/api/devicenotif/notification/get_unread_notifs/'
const RAW_BODY = JSON.stringify({ wallet_hash: WALLET_HASH })

const headers = signingHeaders({
  wif: WIF,
  method: METHOD,
  fullPath: FULL_PATH,
  rawBody: RAW_BODY,
  walletHash: WALLET_HASH,
  nonce: createNonce()
})

const canonical = buildCanonical({
  method: METHOD,
  fullPath: FULL_PATH,
  timestamp: headers.timestamp,
  nonce: headers.nonce,
  rawBody: RAW_BODY
})

const output = {
  description: 'app-shaped signed request, throwaway key 0x22 x32, no real wallet',
  method: METHOD.toUpperCase(),
  fullPath: FULL_PATH,
  rawBody: RAW_BODY,
  bodyHash: sha256Hex(toBodyBytes(RAW_BODY)),
  walletHash: WALLET_HASH,
  canonical,
  headers
}

process.stdout.write(JSON.stringify(output, null, 2) + '\n')

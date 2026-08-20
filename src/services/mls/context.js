import {
  getCiphersuiteFromName,
  getCiphersuiteImpl,
  defaultCapabilities,
  defaultLifetime,
} from 'ts-mls'
import { defaultClientConfig } from 'ts-mls/clientConfig.js'

const CIPHERSUITE = 'MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519'

let _impl = null
let _capabilities = null
let _clientConfig = null

export async function ensureMlsCrypto() {
  if (!_impl) {
    const cs = getCiphersuiteFromName(CIPHERSUITE)
    _impl = await getCiphersuiteImpl(cs)
    _capabilities = defaultCapabilities()
    _clientConfig = defaultClientConfig
  }
  return { impl: _impl, capabilities: _capabilities, clientConfig: _clientConfig, ciphersuiteName: CIPHERSUITE }
}

export function getMlsCrypto() {
  if (!_impl) throw new Error('MLS crypto not initialized — call ensureMlsCrypto() first')
  return { impl: _impl, capabilities: _capabilities, clientConfig: _clientConfig, ciphersuiteName: CIPHERSUITE }
}

export { defaultLifetime, defaultCapabilities, defaultClientConfig }
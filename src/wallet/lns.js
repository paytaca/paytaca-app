import { ethers } from 'ethers'

// https://docs.bch.domains/contract-developer-guide/resolving-names-on-chain
const ENS_ADDRESS = '0xCfb86556760d03942EBf1ba88a9870e67D77b627'


class LNSProvider extends ethers.providers.JsonRpcBatchProvider {
  async detectNetwork() {
    const network = await super.detectNetwork()
    network.ensAddress = ENS_ADDRESS // ENS address
    return Promise.resolve(network)
  }
}

/**
 * Resolve a human readable address 'name' to an address
 * @param {String} name name of address (e.g. 'alice.bch')
 * @param {Number} coinType address type to resolve
 * @see {@link https://eips.ethereum.org/EIPS/eip-2304#address-encoding} for coin type
 */
export async function resolveName(name, coinType=60) {
  const provider = new LNSProvider('https://smartbch.fountainhead.cash/mainnet')
  const resolver = await provider.getResolver(name)
  if (!resolver) return null

  return resolver.getAddress(coinType)
}

/**
 * Converts ethereum(coinType=60) address to human readable name, cannot reverse convert other
 * @param {String} address
 */
export async function resolveAddress(address) {
  const provider = new LNSProvider('https://smartbch.fountainhead.cash/mainnet')
  return await provider.lookupAddress(address)
}

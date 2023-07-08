import { ethers, utils, BigNumber } from 'ethers'
import BCHJS from '@psf/bch-js'
const bchjs = new BCHJS()

// https://docs.bch.domains/contract-developer-guide/resolving-names-on-chain
const ENS_ADDRESS = '0xCfb86556760d03942EBf1ba88a9870e67D77b627'

class LNSProvider extends ethers.providers.JsonRpcBatchProvider {
  async detectNetwork () {
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
export async function resolveName (name, coinType = 60) {
  const provider = new LNSProvider('https://smartbch.fountainhead.cash/mainnet')
  const resolver = await provider.getResolver(name)
  if (!resolver) return null

  if (coinType === 145) { // specific bitcoin cash coinType since ethers dont support them
    const encodedCoinType = utils.hexZeroPad(BigNumber.from(coinType).toHexString(), 32)
    const hexBytes = await resolver._fetchBytes('0xf1cb7e06', encodedCoinType)
    if (hexBytes == null || hexBytes === '0x') return null

    const address = decodeBCHAddress(hexBytes)
    if (address) return address
    else return null
  }

  return resolver.getAddress(coinType)
}

/**
 * Converts ethereum(coinType=60) address to human readable name, cannot reverse convert other
 * @param {String} address
 */
export async function resolveAddress (address) {
  const provider = new LNSProvider('https://smartbch.fountainhead.cash/mainnet')
  return await provider.lookupAddress(address)
}

function base58Encode (data) {
  return utils.base58.encode(
    utils.concat([
      data,
      utils.hexDataSlice(
        utils.sha256(utils.sha256(data)),
        0, 4
      )
    ])
  )
}

export function isNameLike (value) {
  // Regex is from: https://www.regextester.com/111178
  const regexTest = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/.test(String(value))
  return regexTest && !value.startsWith('bitcoincash:') && !value.startsWith('bchtest:')

  // return /^\w+(\.\w+)+$/.test(String(value))
}

/**
 *
 * @param {String} hexBytes
 * @returns {String}
 * @note implementation is copied from ether-js codebase for bitcoin address (coinTyp=0)
 */
function decodeBCHAddress (hexBytes) {
  //
  const p2pkh = hexBytes.match(/^0x76a9([0-9a-f][0-9a-f])([0-9a-f]*)88ac$/)
  const p2sh = hexBytes.match(/^0xa9([0-9a-f][0-9a-f])([0-9a-f]*)87$/)

  if (p2pkh) {
    const legacyAddress = base58Encode(utils.concat([[0x00], ('0x' + p2pkh[2])]))
    return bchjs.Address.toCashAddress(legacyAddress)
  } else if (p2sh) {
    // not yet tested
    const legacyAddress = base58Encode(utils.concat([[0x05], ('0x' + p2sh[2])]))
    return bchjs.Address.toCashAddress(legacyAddress)
  }

  return null
}

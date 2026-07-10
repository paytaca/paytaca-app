import { decodeCashAddress } from '@bitauth/libauth'

export function getPkhash() {
  if (/^[0-9a-fA-F]{40}$/.test(addr)) {
    return new Uint8Array(addr.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  }
  if (!addr.includes(':')) addr = 'bitcoincash:' + addr
  const decoded = decodeCashAddress(addr)
  if (typeof decoded === 'string') throw new Error(decoded)
  return decoded.payload
}

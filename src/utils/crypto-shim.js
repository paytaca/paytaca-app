import { Buffer } from 'buffer'
import { randomBytes as secureRandomBytes } from '@noble/hashes/utils.js'

export function randomBytes (size) {
  return Buffer.from(secureRandomBytes(size))
}

export default { randomBytes }

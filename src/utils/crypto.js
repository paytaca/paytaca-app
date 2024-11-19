import crypto from 'crypto'
import {
  binToBase58,
  CashAddressType,
  decodeBase58Address,
  decodeCashAddress,
  encodeCashAddress,
  ripemd160,
  binToHex,
  hexToBin,
  cashAddressToLockingBytecode,
  lockingBytecodeToBase58Address,
  encodeBase58Address,
} from "@bitauth/libauth"

export function sha256(data='', encoding='utf8') {
  const _sha256 = crypto.createHash('sha256')
  _sha256.update(Buffer.from(data, encoding))
  return _sha256.digest().toString('hex')
}

/**
 * @param {String} transaction 
 */
export function getTxid(transaction) {
  const hash1 = sha256(transaction, 'hex')
  return sha256(hash1, 'hex')
}

export function pubkeyToPkHash(pubkey='') {
  return binToHex(ripemd160.hash(hexToBin(sha256(pubkey, 'hex'))))
}


export function toLegacyAddress(address='') {
  const lockingBytecode = cashAddressToLockingBytecode(address) 
  if (typeof lockingBytecode === 'string') throw lockingBytecode

  const legacyAddress = lockingBytecodeToBase58Address(lockingBytecode.bytecode)
  if (typeof legacyAddress !== 'string') {
    return encodeBase58Address(legacyAddress.type, legacyAddress.payload)
  }
  return legacyAddress
}

export function addressToPkHash(address='') {
  const legacyAddress = toLegacyAddress(address)

  // Decode the Base58Check-encoded legacy address
  const decodedLegacyAddress = decodeBase58Address(legacyAddress)
  if (typeof decodedLegacyAddress === 'string') throw decodedLegacyAddress

  return binToHex(decodedLegacyAddress.payload);
}

export function pkHashToLegacyAddress(pkhash='') {
  const pkHashBin = Buffer.from(pkhash, 'hex')
  const versionByte = Buffer.from([0x00]); // Version byte for legacy addresses

  // Step 2: Prepend version byte
  const data = Buffer.concat([versionByte, pkHashBin]);

  // Step 3: Append checksum
  const hash1 = sha256(data)
  const hash = sha256(hash1, 'hex')
  const checksum = Buffer.from(hash, 'hex').slice(0, 4);
  const dataWithChecksum = Buffer.concat([data, checksum]);

  // Step 5: Base58 encode the data with checksum
  const legacyAddress = binToBase58(dataWithChecksum);

  return legacyAddress;
}

export function pubkeyToAddress(pubkey, chipnet=false) {
  const pkhash = pubkeyToPkHash(pubkey)
  const legacyAddress = pkHashToLegacyAddress(pkhash)
  const decodedLegacyAddress = decodeBase58Address(legacyAddress)
  const prefix = chipnet ? 'bitcoincash' : 'bchtest'
  return encodeCashAddress(prefix, 'p2pkh', decodedLegacyAddress.payload)
}

export function toTokenAddress(address ='') {
  const decodedAddress = decodeCashAddress(address)
  if (typeof decodedAddress == 'string') throw decodedAddress
  const addrType = decodedAddress.type
  const payload = decodedAddress.payload
  switch(addrType) {
    case (CashAddressType.p2pkhWithTokens):
    case (CashAddressType.p2shWithTokens):
      return address
    case (CashAddressType.p2pkh):
      return encodeCashAddress(decodedAddress.prefix, CashAddressType.p2pkhWithTokens, payload)
    case (CashAddressType.p2sh):
      return encodeCashAddress(decodedAddress.prefix, CashAddressType.p2shWithTokens, payload)
  }
}

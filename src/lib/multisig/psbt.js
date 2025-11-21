import { bigIntToBinUint64LE, numberToBinInt32LE } from "@bitauth/libauth"
import { base64ToBin, bigIntToCompactUint, binsAreEqual, binToBase64, binToBigIntUint64LE, binToBigIntUintLE, binToHex, binToNumberInt32LE, binToNumberUint32LE, binToUtf8, compactUintToBigInt, decodeHdPublicKey, decodeTransaction, decodeTransactionBch, encodeHdPublicKeyPayload, encodeTokenPrefix, encodeTransactionOutput, hexToBin, isBase64, isHex, numberToBinUint32LE, readBytes, readCompactUint, readMultiple, readRemainingBytes, readTokenPrefix, readTransactionOutput, sortObjectKeys, utf8ToBin } from "bitauth-libauth-v3"
import { bip32DecodeDerivationPath, bip32EncodeDerivationPath } from "./utils"
import { MultisigTransactionBuilder } from "./transaction-builder"
export const PSBT_MAGIC = '70736274ff'

// export const PSBT_KEY_TYPES = {
  // ---------- Global map ----------
const PSBT_GLOBAL_UNSIGNED_TX= '00'         // The unsigned transaction (no witnesses)                
const PSBT_GLOBAL_XPUB= '01'                // Extended public keys and their derivation paths
const PSBT_GLOBAL_TX_VERSION= '02'          // Transaction Version                                
const PSBT_GLOBAL_FALLBACK_LOCKTIME= '03'
const PSBT_GLOBAL_INPUT_COUNT= '04'         // Number of inputs (BIP 370)
const PSBT_GLOBAL_OUTPUT_COUNT= '05'        // Number of inputs (BIP 370)
const PSBT_GLOBAL_TX_MODIFIABLE= '06'       // Allowed modifications (BIP 370)
const PSBT_GLOBAL_SP_ECDH_SHARE= '07'
const PSBT_GLOBAL_SP_DLEQ= '08'
const PSBT_GLOBAL_VERSION= 'fb'             // PSBT version number (added in BIP 370)
const PSBT_GLOBAL_PROPRIETARY= 'fc'         // Custom (proprietary) key-value pair

  // ---------- Input map ----------
const PSBT_IN_NON_WITNESS_UTXO= '00'        // Full previous transaction
const PSBT_IN_WITNESS_UTXO= '01'            // Output being spent
const PSBT_IN_PARTIAL_SIG= '02'             // Partial signature
const PSBT_IN_SIGHASH_TYPE= '03'            // Sighash type (uint32)
const PSBT_IN_REDEEM_SCRIPT= '04'           // Redeem script (for P2SH)
const PSBT_IN_WITNESS_SCRIPT= '05'          // Witness script (for P2WSH)

const PSBT_IN_BIP32_DERIVATION= '06'        // Derivation path data
const PSBT_IN_FINAL_SCRIPTSIG= '07'         // Final scriptSig
const PSBT_IN_FINAL_SCRIPTWITNESS= '08'     // Final scriptWitness
const PSBT_IN_POR_COMMITMENT= '09'          // Proof of reserves commitment
const PSBT_IN_RIPEMD160= '0a'
const PSBT_IN_SHA256= '0b'
const PSBT_IN_HASH160= '0c'
const PSBT_IN_HASH256= '0d'
const PSBT_IN_PREVIOUS_TXID= '0e'
const PSBT_IN_OUTPUT_INDEX= '0f'
const PSBT_IN_SEQUENCE= '10'
const PSBT_IN_REQUIRED_TIME_LOCKTIME= '11'
const PSBT_IN_REQUIRED_HEIGHT_LOCKTIME= '12'
const PSBT_IN_TAP_KEY_SIG= '13'             // Taproot key path signature (BIP 371)
const PSBT_IN_TAP_SCRIPT_SIG= '14'          // Taproot script path signatures
const PSBT_IN_TAP_LEAF_SCRIPT= '15'         // Taproot leaf scripts
const PSBT_IN_TAP_BIP32_DERIVATION= '16'    // Taproot BIP32 derivation
const PSBT_IN_TAP_INTERNAL_KEY= '17'        // Taproot internal key
const PSBT_IN_TAP_MERKLE_ROOT= '18'         // Taproot merkle root
const PSBT_IN_MUSIG2_PARTICIPANT_PUBKEYS= '1a'
const PSBT_IN_MUSIG2_PUB_NONCE= '1b'
const PSBT_IN_MUSIG2_PARTIAL_SIG= '1c'
const PSBT_IN_SP_ECDH_SHARE= '1d'
const PSBT_IN_SP_DLEQ = '1e'
const PSBT_IN_PROPRIETARY= 'fc'             // Custom (proprietary) key-value pair

  // ---------- Output map ----------
const PSBT_OUT_REDEEM_SCRIPT= '00'          // Redeem script (for P2SH)
const PSBT_OUT_WITNESS_SCRIPT= '01'         // Witness script (for P2WSH)
const PSBT_OUT_BIP32_DERIVATION= '02'       // Derivation path data
const PSBT_OUT_AMOUNT= '03'
const PSBT_OUT_SCRIPT= '04'
const PSBT_OUT_TAP_INTERNAL_KEY= '05'
const PSBT_OUT_TAP_TREE= '06'
const PSBT_OUT_TAP_BIP32_DERIVATION= '07'
const PSBT_OUT_MUSIG2_PARTICIPANT_PUBKEYS= '08'
const PSBT_OUT_SP_V0_INFO= '09'
const PSBT_OUT_SP_V0_LABEL= '0a'
const PSBT_OUT_DNSSEC_PROOF= '35'
const PSBT_OUT_CASHTOKEN= '36'               // Version(145) token prefix encoded
const PSBT_OUT_PROPRIETARY= 'fc'
// }


export const ProprietaryFields = Object.freeze({
  paytaca: {
    identifier: utf8ToBin('paytaca'),
    subKey: {
      walletHash: {
        subType: bigIntToCompactUint(0),
        subKeyData: utf8ToBin('walletHash')
      },
      origin: {
        subType: bigIntToCompactUint(1),
        subKeyData: utf8ToBin('origin')
      },
      purpose: {
        subType: bigIntToCompactUint(2),
        subKeyData: utf8ToBin('purpose')
      },
      network: {
        subType: bigIntToCompactUint(3),
        subKeyData: utf8ToBin('network')
      }
    } 
  }
})


export class Magic {
  
  serialize() {
    return hexToBin('70736274ff')
  }

  deserialize(serialized) {

  }
}

export class Key {

  constructor(keyType, keyData = new Uint8Array([])){
    this.keyType = keyType // Should be compact uint, future proof this by converting to compact uint
    this.keyData = keyData
    this.keyLen = keyType && keyData && bigIntToCompactUint(keyType.length + keyData.length)
  }

  serialize(){
    return new Uint8Array([...this.keyLen, ...this.keyType, ...this.keyData])
  }
  
  deserialize(nextKeyReadPosition) {
    const keyLenReadResult = readCompactUint(nextKeyReadPosition)
    const keyLen = keyLenReadResult.result
    this.keyLen = bigIntToCompactUint(keyLen)
    if (keyLen === 0n) return keyLenReadResult.position
    const keyReader = readBytes(Number(keyLen))
    const keyReadResult = keyReader(keyLenReadResult.position)
    const keyType = keyReadResult.result.slice(0, 1) // first byte is key type
    const keyData = keyReadResult.result.slice(1)
    this.keyType = keyType
    this.keyData = keyData
    return keyReadResult.position
  }

  toString(){
    return binToHex(this.serialize())
  }
}

export class Value {
  
  constructor(value) {
    this.value = value
    this.valueLen = value && bigIntToCompactUint(this.value.length)
  }

  serialize(){
    return new Uint8Array([...this.valueLen, ...this.value])
  }

  /**
   * @param {import('@bitauth/libauth').ReadPosition} valueReadPosition The ReadPosition of the value to read
   * @returns {import('@bitauth/libauth').ReadPosition|undefined} Next Read Position after reading the value at this position
   */
  deserialize(valueReadPosition) {
    const valueLenReadResult = readCompactUint(valueReadPosition)
    const valueLen = valueLenReadResult.result 
    const valueDataReader = readBytes(Number(valueLen))
    const valueDataReadResult = valueDataReader(valueLenReadResult.position)
    const valueData = valueDataReadResult.result
    this.valueLen = bigIntToCompactUint(valueLen)
    this.value = valueData
    return valueDataReadResult.position
  }

  toString() {
    return binToHex(this.serialize())
  }
}

export class KeyPair {
  
  constructor(key, value) {
    this.key = key,
    this.value = value
  }

  serialize(){
    this.s = new Uint8Array([...this.key.serialize(), ...this.value.serialize()]) 
    return this.s
  }

   /**
   * @param {import('@bitauth/libauth').ReadPosition} keyPairReadPosition The ReadPosition of the keypair to read
   * @returns {import('@bitauth/libauth').ReadPosition} Next Read Position after reading the keypair at this position
   */
  deserialize(keyPairReadPosition) {
    const key = new Key()
    const value = new Value()
    const nextReadPosition = key.deserialize(keyPairReadPosition)
    this.key = key 
    if (compactUintToBigInt(key.keyLen) === 0n) return keyPairReadPosition 
    const nextKeyPairReadPosition = value.deserialize(nextReadPosition)
    this.value = value 
    return nextKeyPairReadPosition
  }

  toString(){
    return binToHex(this.serialize())
  }
}

export class Bip32DerivationKeyPair extends KeyPair {
  
  constructor(key, value) {
    super(key, value)
  }

  /**
   * @returns {Uint8Array}
   */
  getMasterFingerprint() {
    const masterFingerprintReader = readBytes(4)
    const masterFingerPrintReadResult = masterFingerprintReader({ bin: this.value.value, index: 0 })
    return masterFingerPrintReadResult.result
  }

  getDerivationPath() {
    const derivationPathReadResult = readRemainingBytes({ bin: this.value.value, index: 4 })
    return derivationPathReadResult.result
  }

  static fromKeyPair(keypair) {
    return new Bip32DerivationKeyPair(keypair.key, keypair.value)
  }
}

export class ProprietaryField {
  constructor({identifier, subKeyData, subType, value}){
    this.identifier = identifier
    this.subKeyData = subKeyData
    this.subType = subType
    this.value = value
  }


  /**
   * @param {Function} decoder Function that knows how to decode the value
   */
  getIdentifier(decoder) {
    return decoder ? decoder(this.identifier): this.identifier 
  }

  /**
   * @param {Function} decoder Function that knows how to decode the value
   */
  getValue(decoder) {
    if (!this.value) return 
    return decoder ? decoder(this.value): this.value 
  }
  
  /**
   * @param {Function} decoder Function that knows how to decode the value
   */
  getSubKeyData(decoder) {
    return decoder ? decoder(this.subKeyData): this.subKeyData 
  }

  static extractProprietaryFields(keypairs, identifier) {
    const KEY_TYPE = 'fc'
    if (!keypairs[KEY_TYPE]) return
    
    const proprietaryFields = []
    
    const _keypairs = keypairs[KEY_TYPE] instanceof KeyPair ? 
      [ keypairs[KEY_TYPE] ] : 
      keypairs[KEY_TYPE]

    for (const keypair of _keypairs) {
      const keyData = keypair.key?.keyData
      if (!keyData) return proprietaryFields

      const identifierLenReadResult = readCompactUint({ bin: keyData, index: 0})
      const identifierReader = readBytes(Number(identifierLenReadResult.result))
      const identifierReadResult = identifierReader(identifierLenReadResult.position)
      if (!binsAreEqual(identifier, identifierReadResult.result)) {
        return 
      }
      
      const proprietaryField = {
        identifier: identifierReadResult.result
      }

      const subTypeReadResult = readCompactUint(identifierReadResult.position)
      const subKeyDataReadResult = readRemainingBytes(subTypeReadResult.position)
      proprietaryField.subType = subTypeReadResult.result 
      proprietaryField.subKeyData = subKeyDataReadResult.result
      
      proprietaryField.value = readRemainingBytes({
        bin: keypair?.value?.value || Uint8Array.from([]),
        index: 0
      })?.result
      proprietaryFields.push(new ProprietaryField(proprietaryField))
    }

    return proprietaryFields
  }
}

export class GlobalMap {

  constructor() {
    this.keypairs = {}
  }

  getInputCount() {
    
    if (this.keypairs[PSBT_GLOBAL_INPUT_COUNT]?.value?.value) {
      return compactUintToBigInt(this.keypairs[PSBT_GLOBAL_INPUT_COUNT].value.value)
    }
    if (this.keypairs[PSBT_GLOBAL_UNSIGNED_TX]?.value?.value) {
      const decoded = decodeTransaction(this.keypairs[PSBT_GLOBAL_UNSIGNED_TX]?.value?.value)
      return decoded?.inputs?.length
    }
  }

  getOutputCount() {
    
    if (this.keypairs[PSBT_GLOBAL_OUTPUT_COUNT]?.value?.value) {
      return compactUintToBigInt(this.keypairs[PSBT_GLOBAL_OUTPUT_COUNT].value.value)
    }
    if (this.keypairs[PSBT_GLOBAL_UNSIGNED_TX]?.value?.value) {
      const decoded = decodeTransaction(this.keypairs[PSBT_GLOBAL_UNSIGNED_TX]?.value?.value)
      return decoded?.outputs?.length
    }
  }

  // Should be removed, testing for psbt0 only
  setUnsignedTx(tx) {
    const _tx = isHex(tx)? hexToBin(tx): tx
    const k = new Key(hexToBin(PSBT_GLOBAL_UNSIGNED_TX))
    const v = new Value(_tx)
    this.keypairs[PSBT_GLOBAL_UNSIGNED_TX] = new KeyPair(k, v)
  }

  /**
   * @returns {Uint8Array} The unsigned tx value
   */
  getUnsignedTx() {
    if (this.keypairs[PSBT_GLOBAL_UNSIGNED_TX]?.value?.value) {
      return this.keypairs[PSBT_GLOBAL_UNSIGNED_TX]?.value?.value
    }
  }
  
  /**
   * Optional
   * 
   * @param {string} xpub 
   * @param {string|Uint8Array} masterFingerprint
   * @param {string|Uint8Array} derivationPath
   */
  addXPub(xpub, masterFingerprint, derivationPath) {
    const encodedHdPublicKey = encodeHdPublicKeyPayload(decodeHdPublicKey(xpub))
    const k = new Key(hexToBin(PSBT_GLOBAL_XPUB), encodedHdPublicKey)
    let mf = isHex(masterFingerprint) ? hexToBin(masterFingerprint): masterFingerprint 
    let dp = bip32EncodeDerivationPath(derivationPath)

    const v = new Value(new Uint8Array([...mf, ...dp]))

    if (!this.keypairs[PSBT_GLOBAL_XPUB]) {
      this.keypairs[PSBT_GLOBAL_XPUB] = []
    }
    this.keypairs[PSBT_GLOBAL_XPUB].push(new KeyPair(k, v))
    return this
  }

  /**
   * 
   * @param {number} [version = 2] 
   */
  setTxVersion(version = 2){
    const k = new Key(hexToBin(PSBT_GLOBAL_TX_VERSION))
    const v = new Value(numberToBinInt32LE(version))
    this.keypairs[PSBT_GLOBAL_TX_VERSION] = new KeyPair(k, v)
    return this
  }

  getTxVersion() {
    const v = this.keypairs[PSBT_GLOBAL_TX_VERSION]?.value?.value 
    if (v) {
      return binToNumberInt32LE(v)
    }
    return v
  }


  /**
   * @param {number} locktime
   */
  setFallbackLocktime(locktime){

    const k = new Key(hexToBin(PSBT_GLOBAL_FALLBACK_LOCKTIME))
    const v = new Value(numberToBinInt32LE(locktime))

    this.keypairs[PSBT_GLOBAL_FALLBACK_LOCKTIME] = new KeyPair(k, v)

    return this
  }

  getFallbackLocktime() {
    const v = this.keypairs[PSBT_GLOBAL_FALLBACK_LOCKTIME]?.value?.value 
    if (v) {
      return binToNumberUint32LE(v)
    }
    return v
  }

  /**
   * Should only be called internally
   * @param {number} count
   */
  setInputCount(count){

    const k = new Key(hexToBin(PSBT_GLOBAL_INPUT_COUNT))
    const v = new Value(bigIntToCompactUint(count))

    this.keypairs[PSBT_GLOBAL_INPUT_COUNT] = new KeyPair(k, v)
    return this
  }
  /**
   * Should only be called internally
   * @param {number} count
   */
  setOutputCount(count){

    const k = new Key(hexToBin(PSBT_GLOBAL_OUTPUT_COUNT))
    const v = new Value(bigIntToCompactUint(count))

    this.keypairs[PSBT_GLOBAL_OUTPUT_COUNT] = new KeyPair(k, v)
    return this
  }

  setTxModifiable(modifiable) {

  }

  /**
   * TODO: Create CHIP
   * 
   * @param {number} [version = 145] Using BCH's bip44 cointype as PSBT version
   */
  setPsbtVersion(version = 145){
    const k = new Key(hexToBin(PSBT_GLOBAL_VERSION))
    const v = new Value(numberToBinUint32LE(version))
    this.keypairs[PSBT_GLOBAL_VERSION] = new KeyPair(k, v)
    return this
  }

  /**
   * @param {Uint8Array} identifier Example: utf8ToBin('paytaca')
   * @param {Uint8Array} subtype compact size uint
   * @param {Uint8Array} subkeydata Example: utf8ToBin('origin')
   * @param {Uint8Array} value Example: utf8ToBin('https://paytaca.com')
   */
  addProprietaryField(identifier, value, subtype = new Uint8Array([]), subkeydata = new Uint8Array([])){
    const k = new Key(
      hexToBin(PSBT_GLOBAL_PROPRIETARY), 
      new Uint8Array([...bigIntToCompactUint(identifier.length), ...identifier, ...subtype, ...subkeydata])
    )

    const v = new Value(value)
    
    if (!this.keypairs[PSBT_GLOBAL_PROPRIETARY]) {
      this.keypairs[PSBT_GLOBAL_PROPRIETARY] = []
    }
    this.keypairs[PSBT_GLOBAL_PROPRIETARY].push(new KeyPair(k, v))
    return this
  }

  getProprietaryFields(identifier) {
    return ProprietaryField.extractProprietaryFields(this.keypairs, identifier)
  }

  /**
   * @param {Uint8Array} identifier 
   * @param {Uint8Array|number} subType
   */
  getProprietaryFieldBySubType(identifier, subType) {
    const proprietaryFields = this.getProprietaryFields(identifier)
    return proprietaryFields.find(pf => {
      const _subType = subType instanceof Uint8Array? compactUintToBigInt(subType): BigInt(subType)
      return pf.subType === _subType
    })
  }

  sanitizeForVersion(psbtVersion, keypairs) {
    const sorted = { ...keypairs }
    for (const key of Object.keys(sorted)) {
      if (psbtVersion === 145) break
      if (psbtVersion === 0) {
        switch(key) {
          case PSBT_GLOBAL_TX_VERSION:
          case PSBT_GLOBAL_FALLBACK_LOCKTIME:
          case PSBT_GLOBAL_INPUT_COUNT:
          case PSBT_GLOBAL_OUTPUT_COUNT:
          case PSBT_GLOBAL_TX_MODIFIABLE:
          case PSBT_GLOBAL_SP_ECDH_SHARE:
          case PSBT_GLOBAL_SP_DLEQ:
            delete sorted[key]
        }
      }
      if (psbtVersion === 2) {
        switch(key) {
          case PSBT_GLOBAL_UNSIGNED_TX:
            delete sorted[key]
        }
      }
      // allow inclusion of all fields on version 145
    }
    return sorted
  }
  /**
   * @params {number} psbtVersion
   */
  serialize(psbtVersion) {
    const sorted = sortObjectKeys(this.sanitizeForVersion(psbtVersion, this.keypairs))
    let s = new Uint8Array([])
    for (const keyType of Object.keys(sorted)) {
      if (sorted[keyType] instanceof Array) {
        sorted[keyType].forEach((keypair) => {
          s = new Uint8Array([...s, ...keypair.serialize()])
        })
        continue
      }
      if (sorted[keyType] instanceof KeyPair) {
        s = new Uint8Array([...s, ...sorted[keyType].serialize()])
      }
    }
    s = new Uint8Array([...s, hexToBin('00')]) // Add separator
    return s
  }

  /**
   * @param {import('@bitauth/libauth').ReadPosition} readPosition Psbt global map (starting at its first key length) and remaining bytes
   */
  deserialize(readPosition) {
    let limit = readPosition.bin.length
    let index = readPosition.index
    let nextReadPosition = readPosition

    while (index < limit) {
      const keyPair = new KeyPair()
      nextReadPosition = keyPair.deserialize(nextReadPosition)
      if (compactUintToBigInt(keyPair.key.keyLen) === 0n) {
        break
      }
      const keyTypeHex = binToHex(keyPair.key.keyType)
      if (this.keypairs[keyTypeHex] === undefined) {
        this.keypairs[keyTypeHex] = keyPair
      } else if (this.keypairs[keyTypeHex] instanceof Array) {
        this.keypairs[keyTypeHex].push(keyPair)
      } else {
        // Convert existing single entry to array to accommodate keytype with multiple values
        this.keypairs[keyTypeHex] = [this.keypairs[keyTypeHex], keyPair]
      }
      index = nextReadPosition.index
    }

    return {...nextReadPosition, index: nextReadPosition.index + 1}
  }
}



export class PsbtInput {
  constructor() {
    this.keypairs = {}
  }
  /**
   * @param {string|Uint8Array} tx
   */
  setOutpointTransaction(tx){
    const _tx = isHex(tx) ? hexToBin(tx) : tx
    const k = new Key(hexToBin(PSBT_IN_NON_WITNESS_UTXO))
    const v = new Value(_tx)
    this.keypairs[PSBT_IN_NON_WITNESS_UTXO] = new KeyPair(k, v)
    return this
  }

  getOutpointTransaction() {
    return this.keypairs[PSBT_IN_NON_WITNESS_UTXO]?.value?.value
  }

  /**
   * @param {string|Uint8Array} publicKey 
   * @param {string|Uint8Array} sig
   */
  addPartialSig(publicKey, sig){
    const _publicKey = isHex(publicKey) ? hexToBin(publicKey) : publicKey
    const _sig = isHex(sig) ? hexToBin(sig) : sig
    const k = new Key(hexToBin(PSBT_IN_PARTIAL_SIG), _publicKey)
    const v = new Value(_sig)

    if (!this.keypairs[PSBT_IN_PARTIAL_SIG]) {
      this.keypairs[PSBT_IN_PARTIAL_SIG] = []
    }

    this.keypairs[PSBT_IN_PARTIAL_SIG].push(new KeyPair(k, v))
    return this
  }

  /**
   * @returns {Object<Object<string, Uint8Array>>} Array of objects where each key is a public key (hex string)
   * and each value is a signature (Uint8Array).
   */
  getPartialSigs(){
    if (!this.keypairs[PSBT_IN_PARTIAL_SIG]) return {}
    const partialSigs = {}
    if (this.keypairs[PSBT_IN_PARTIAL_SIG] instanceof Array) {
      for(const keypair of this.keypairs[PSBT_IN_PARTIAL_SIG]) {
        const publicKey = binToHex(keypair.key.keyData)
        const sig = keypair.value.value
        partialSigs[publicKey] = sig
      }
      return partialSigs
    }
    const keypair = this.keypairs[PSBT_IN_PARTIAL_SIG]
    const publicKey = binToHex(keypair.key.keyData)
    const sig = keypair.value.value
    partialSigs[publicKey] = sig
    return partialSigs
  }

  /**
   * Sighash
   */
  setSighashType(number){
    if (number === undefined) return 
    const k = new Key(hexToBin(PSBT_IN_SIGHASH_TYPE))
    const v = new Value(numberToBinUint32LE(number))
    this.keypairs[PSBT_IN_SIGHASH_TYPE] = new KeyPair(k, v)
    return this
  }

  /**
   * @param {string|Uint8Array} redeemScript
   */
  setRedeemScript(redeemScript){
    if (!redeemScript) return
    const _redeemScript = isHex(redeemScript) ? hexToBin(redeemScript): redeemScript
    const k = new Key(hexToBin(PSBT_IN_REDEEM_SCRIPT))
    const v = new Value(_redeemScript)
    this.keypairs[PSBT_IN_REDEEM_SCRIPT] = new KeyPair(k, v)
    return this
  }

  /**
   * @param {Uint8Array|undefined} redeemScript
   */
  getRedeemScript() {
    return this.keypairs[PSBT_IN_REDEEM_SCRIPT]?.value?.value
  }

  /**
   * @param {string|Uint8Array} publicKey
   * @param {string|Uint8Array} masterFingerprint
   * @param {string} derivationPath
   */
  addBip32Derivation(publicKey, masterFingerprint, derivationPath){

    const pk = isHex(publicKey)? hexToBin(publicKey): publicKey
    const mf = isHex(masterFingerprint)? hexToBin(masterFingerprint): masterFingerprint
    const k = new Key(hexToBin(PSBT_IN_BIP32_DERIVATION), pk)
    let dp = bip32EncodeDerivationPath(derivationPath)
    const v = new Value(new Uint8Array([...mf, ...dp]))

    if (!this.keypairs[PSBT_IN_BIP32_DERIVATION]) {
      this.keypairs[PSBT_IN_BIP32_DERIVATION] = []
    }
    this.keypairs[PSBT_IN_BIP32_DERIVATION].push(new KeyPair(k, v))
    return this
  }

  /**
   * @returns {Object<string, Object<string,string>>} Example: { <publickey>: { path: m'..., masterFingerPrint: 0a121212 } }
   */
  getBip32Derivation(){
    if (!this.keypairs[PSBT_IN_BIP32_DERIVATION]) return {}
    const bip32Derivation = {}
    if (this.keypairs[PSBT_IN_BIP32_DERIVATION] instanceof Array) {
      for(const keypair of this.keypairs[PSBT_IN_BIP32_DERIVATION]) {
        
        const bip32DerKeyPair = Bip32DerivationKeyPair.fromKeyPair(keypair)
        const publicKey = bip32DerKeyPair.key.keyData        
        const masterFingerprint = bip32DerKeyPair.getMasterFingerprint()
        const derivationPath = bip32DerKeyPair.getDerivationPath()
        bip32Derivation[binToHex(publicKey)] = {
          path: bip32DecodeDerivationPath(derivationPath),
          masterFingerprint: binToHex(masterFingerprint)
        }
      }
      return bip32Derivation
    }
  }

  /**
   * @param {string|Uint8Array} scriptSig
   */
  setFinalScriptSig(scriptSig){
    if (!scriptSig) return

    const _scriptSig = isHex(scriptSig) ? hexToBin(scriptSig): scriptSig
    const k = new Key(hexToBin(PSBT_IN_FINAL_SCRIPTSIG))
    const v = new Value(_scriptSig)

    this.keypairs[PSBT_IN_FINAL_SCRIPTSIG] = new KeyPair(k, v)
    return this
  }

  getFinalScriptSig() {
    return this.keypairs[PSBT_IN_FINAL_SCRIPTSIG]?.value?.value 
  }

  /**
   * @param {string|Uint8Array} index The outpoint transaction hash
   */
  setOutpointTransactionHash(outpointTxHash){
    if (!outpointTxHash) return

    const _txid = isHex(outpointTxHash) ? hexToBin(outpointTxHash): outpointTxHash

    const k = new Key(hexToBin(PSBT_IN_PREVIOUS_TXID))

    const v = new Value(_txid)

    this.keypairs[PSBT_IN_PREVIOUS_TXID] = new KeyPair(k, v)
    return this
  }

  getOutpointTransactionHash() {
    return this.keypairs[PSBT_IN_PREVIOUS_TXID]?.value?.value
  }
  /**
   * @param {number} index The outpoint index
   */
  setOutpointIndex(index){
    const k = new Key(hexToBin(PSBT_IN_OUTPUT_INDEX))
    const v = new Value(numberToBinUint32LE(index))
    this.keypairs[PSBT_IN_OUTPUT_INDEX] = new KeyPair(k, v)
    return this
  }

  getOutpointIndex() {
    if(!this.keypairs[PSBT_IN_OUTPUT_INDEX]?.value?.value) return 
    return binToNumberUint32LE(this.keypairs[PSBT_IN_OUTPUT_INDEX]?.value?.value)
  }


  setSequenceNumber(sequenceNumber) {
    const k = new Key(hexToBin(PSBT_IN_SEQUENCE))
    const v = new Value(numberToBinUint32LE(sequenceNumber))
    this.keypairs[PSBT_IN_SEQUENCE] = new KeyPair(k, v)
    return this
  }

  getSequenceNumber() {
    const v = this.keypairs[PSBT_IN_SEQUENCE]?.value?.value 
    if (!v) return v
    return binToNumberUint32LE(v)
  }

  /**
   * Sets either PSBT_IN_REQUIRED_TIME_LOCKTIME or PSBT_IN_REQUIRED_HEIGHT_LOCKTIME
   */
  setRequiredLocktime(locktime) {
    const keyType = locktime >= 500000000 ? PSBT_IN_REQUIRED_TIME_LOCKTIME: PSBT_IN_REQUIRED_HEIGHT_LOCKTIME
    const k = new Key(hexToBin(keyType))
    const v = new Value(numberToBinUint32LE(locktime))
    this.keypairs[keyType] = new KeyPair(k, v)
  }

  /**
   * Helper method that retrieves source output from the PSBT_IN_NON_WITNESS_UTXO
   * @returns {import('@bitauth/libauth').Output}
   */
  getSourceUtxo(){
    const prevTx = this.getOutpointTransaction() 
    if (!prevTx) return 
    const decodedPrevTx = decodeTransactionBch(prevTx)
    const index = this.getOutpointIndex()
    return decodedPrevTx.outputs[index]
  }

  /**
   * @param {Uint8Array} identifier Example: utf8ToBin('paytaca')
   * @param {Uint8Array} subtype compact size uint
   * @param {Uint8Array} subkeydata Example: utf8ToBin('origin')
   * @param {Uint8Array} value Example: utf8ToBin('https://paytaca.com')
   */
  addProprietaryField(identifier, value, subtype = new Uint8Array([]), subkeydata = new Uint8Array([])){
    const k = new Key(
      hexToBin(PSBT_IN_PROPRIETARY), 
      new Uint8Array([...bigIntToCompactUint(identifier.length), ...identifier, ...subtype, ...subkeydata])
    )

    const v = new Value(value)
    
    if (!this.keypairs[PSBT_IN_PROPRIETARY]) {
      this.keypairs[PSBT_IN_PROPRIETARY] = []
    }
    this.keypairs[PSBT_IN_PROPRIETARY].push(new KeyPair(k, v))
    return this
  }

  getProprietaryFields(identifier) {
    return ProprietaryField.extractProprietaryFields(this.keypairs, identifier)
  }

  sanitizeForVersion(psbtVersion, keypairs) {
    const sorted = sortObjectKeys({ ...keypairs })
    for (const key of Object.keys(sorted)) {
      if (psbtVersion === 0) {
        switch(key) {
          case PSBT_IN_PREVIOUS_TXID:
          case PSBT_IN_OUTPUT_INDEX:
          case PSBT_IN_SEQUENCE:
          case PSBT_IN_REQUIRED_TIME_LOCKTIME:
          case PSBT_IN_REQUIRED_HEIGHT_LOCKTIME:
          case PSBT_IN_SP_ECDH_SHARE:
          case PSBT_IN_SP_DLEQ:  
            delete sorted[key]
        }
      }
      if (psbtVersion > 0) {
        switch(key) {
          case PSBT_IN_PREVIOUS_TXID:
            if (!keypairs[key]) throw new Error(`PSBT_IN_PREVIOUS_TXID missing, required on version: ${psbtVersion}`)
          case PSBT_IN_OUTPUT_INDEX:
            if (!keypairs[key]) throw new Error(`PSBT_IN_OUTPUT_INDEX missing, required on version: ${psbtVersion}`)
        }
      }
    }
    return sorted
  }

  /**
   * @params {number} [psbtVersion = 3]
   */
  serialize(psbtVersion) {
    
    const sorted = sortObjectKeys(this.sanitizeForVersion(psbtVersion, this.keypairs))
    let s = new Uint8Array([])
    for (const keyType of Object.keys(sorted)) {
      if (sorted[keyType] instanceof Array) {
        sorted[keyType].forEach((keypair) => {
          keypair.prototype = KeyPair
          s = new Uint8Array([...s, ...keypair.serialize()])
        })
        continue
      }
      if (sorted[keyType] instanceof KeyPair) {
        s = new Uint8Array([...s, ...sorted[keyType].serialize()])
      }
    }
    return new Uint8Array([...s, hexToBin('00')])
  }

  /**
   * @param {Uint8Array} readPosition PsbtInput map (starting at its first key length) and remaining bytes
   */
  deserialize(readPosition) {
    let limit = readPosition.bin.length
    let index = readPosition.index
    let nextReadPosition = readPosition

    while (index < limit) {
      const keyPair = new KeyPair()
      nextReadPosition = keyPair.deserialize(nextReadPosition)
      if (compactUintToBigInt(keyPair.key.keyLen) === 0n) {
        break
      }
      const keyTypeHex = binToHex(keyPair.key.keyType)

      if (this.keypairs[keyTypeHex] === undefined) {
        this.keypairs[keyTypeHex] = keyPair
      } else if (this.keypairs[keyTypeHex] instanceof Array) {
        this.keypairs[keyTypeHex].push(keyPair)
      } else {
        // Convert existing single entry to array to accommodate keytype with multiple values
        this.keypairs[keyTypeHex] = [this.keypairs[keyTypeHex], keyPair]
      }
      index = nextReadPosition.index
    }

    return { ...nextReadPosition, index: nextReadPosition.index + 1 } // next index after separator
  }

}

export class PsbtOutput {
  constructor() {
    this.keypairs = {}
  }
  /**
   * @param {string|Uint8Array} redeemScript
   */
  setRedeemScript(redeemScript){
    if (!redeemScript) return

    const _redeemScript = isHex(redeemScript) ? hexToBin(redeemScript): redeemScript

    const k = new Key(hexToBin(PSBT_OUT_REDEEM_SCRIPT))

    const v = new Value(_redeemScript)

    this.keypairs[PSBT_OUT_REDEEM_SCRIPT] = new KeyPair(k, v)
    return this
  }


  /**
   * @param {string|Uint8Array} publicKey
   * @param {string|Uint8Array} masterFingerprint
   * @param {string} derivationPath
   */
  addBip32Derivation(publicKey, masterFingerprint, derivationPath){

    const pk = isHex(publicKey)? hexToBin(publicKey): publicKey
    const mf = isHex(masterFingerprint)? hexToBin(masterFingerprint): masterFingerprint
    const k = new Key(hexToBin(PSBT_OUT_BIP32_DERIVATION), pk)

    let dp = bip32EncodeDerivationPath(derivationPath)

    const v = new Value(new Uint8Array([...mf, ...dp]))

    if (!this.keypairs[PSBT_OUT_BIP32_DERIVATION]) {
      this.keypairs[PSBT_OUT_BIP32_DERIVATION] = []
    }

    this.keypairs[PSBT_OUT_BIP32_DERIVATION].push(new KeyPair(k, v))
    return this
  }


  /**
   * @returns {Object<string, Object<string,string>>} Example: { <publickey>: { path: m'..., masterFingerPrint: 0a121212 } }
   */
  getBip32Derivation(){
    if (!this.keypairs[PSBT_OUT_BIP32_DERIVATION]) return {}
    const bip32Derivation = {}
    if (this.keypairs[PSBT_OUT_BIP32_DERIVATION] instanceof Array) {
      for(const keypair of this.keypairs[PSBT_OUT_BIP32_DERIVATION]) {
        const bip32DerKeyPair = Bip32DerivationKeyPair.fromKeyPair(keypair)
        const publicKey = bip32DerKeyPair.key.keyData        
        const masterFingerprint = bip32DerKeyPair.getMasterFingerprint()
        const derivationPath = bip32DerKeyPair.getDerivationPath()
        bip32Derivation[binToHex(publicKey)] = {
          path: bip32DecodeDerivationPath(derivationPath),
          masterFingerprint: binToHex(masterFingerprint)
        }
      }
      return bip32Derivation
    }
  }

  /**
   * @param {bigint} satoshis Satoshi value
   */
  setAmount(satoshis){
    const k = new Key(hexToBin(PSBT_OUT_AMOUNT))
    const v = new Value(bigIntToBinUint64LE(satoshis))
    this.keypairs[PSBT_OUT_AMOUNT] = new KeyPair(k, v)
    return this
  }

  getAmount() {
    return this.keypairs[PSBT_OUT_AMOUNT]?.value?.value && 
      binToBigIntUint64LE(this.keypairs[PSBT_OUT_AMOUNT]?.value?.value) 
  }

  /**
   * @param { {
   *     amount: bigint;
   *     category: Uint8Array;
   *     nft?: {
   *         capability: "none" | "mutable" | "minting";
   *         commitment: Uint8Array;
   *     };
   * } | string | Uint8Array} [token] Output.token or token prefix encoded Uint8Array or Hex value 
   *
   */
  setToken(token) {
    if (!token) return

    let _token = token 
    
    if (typeof token === 'object' && token.category) {
      _token = encodeTokenPrefix(token)
    }

    if (isHex(token)) {
      _token = hexToBin(token)
    }

    const k = new Key(hexToBin(PSBT_OUT_CASHTOKEN))
    const v = new Value(_token)

    this.keypairs[PSBT_OUT_CASHTOKEN] = new KeyPair(k, v)
    return this
  }

  getToken() {
    return this.keypairs[PSBT_OUT_CASHTOKEN]?.value?.value && 
      readTokenPrefix({ bin: this.keypairs[PSBT_OUT_CASHTOKEN]?.value?.value, index: 0 })
  }

  /**
   * The locking script or scriptPubKey
   * @param {string|Uint8Array} lockingScript
   * 
   */
  setOutScript(lockingScript){
    
    if (!lockingScript) return
    
    const _lockingScript = isHex(lockingScript) ? hexToBin(lockingScript): lockingScript

    const k = new Key(hexToBin(PSBT_OUT_SCRIPT))
    const v = new Value(_lockingScript)

    this.keypairs[PSBT_OUT_SCRIPT] = new KeyPair(k, v)
    return this
  }

  getOutScript() {
    return this.keypairs[PSBT_OUT_SCRIPT]?.value?.value
  }

  /**
   * @param {Uint8Array} identifier Example: utf8ToBin('paytaca')
   * @param {Uint8Array} subtype compact size uint
   * @param {Uint8Array} subkeydata Example: utf8ToBin('origin')
   * @param {Uint8Array} value Example: utf8ToBin('https://paytaca.com')
   */
  addProprietaryField(identifier, value, subtype = new Uint8Array([]), subkeydata = new Uint8Array([])){
    const k = new Key(
      hexToBin(PSBT_OUT_PROPRIETARY), 
      new Uint8Array([...bigIntToCompactUint(identifier.length), ...identifier, ...subtype, ...subkeydata])
    )

    const v = new Value(value)
    
    if (!this.keypairs[PSBT_OUT_PROPRIETARY]) {
      this.keypairs[PSBT_OUT_PROPRIETARY] = []
    }
    this.keypairs[PSBT_OUT_PROPRIETARY].push(new KeyPair(k, v))
    return this
  }

  getProprietaryFields(identifier) {
    return ProprietaryField.extractProprietaryFields(this.keypairs, identifier)
  }

  sanitizeForVersion(psbtVersion, keypairs) {
    const sorted = { ...keypairs }
    for (const key of Object.keys(sorted)) {
      if (psbtVersion === 0) {
        switch(key) {
          case PSBT_OUT_AMOUNT:
          case PSBT_OUT_SCRIPT:
          case PSBT_OUT_SP_V0_INFO:
          case PSBT_OUT_SP_V0_LABEL:
            delete sorted[key]
        }
      }
      if (psbtVersion > 0) {
        switch(key) {
          case PSBT_OUT_AMOUNT:
            if (!keypairs[key]) throw new Error(`PSBT_OUT_AMOUNT missing, required on version ${psbtVersion}`)
        }
      }
    }
    return sorted
  }

  /**
   * @param {number} psbtVersion
   */
  serialize(psbtVersion) {
    const sorted = sortObjectKeys(this.sanitizeForVersion(psbtVersion, this.keypairs))
    let s = new Uint8Array([])
    for (const keyType of Object.keys(sorted)) {
      if (sorted[keyType] instanceof Array) {
        sorted[keyType].forEach((keypair) => {
          
          s = new Uint8Array([...s, ...keypair.serialize()])
        })
        continue
      }
      if (sorted[keyType] instanceof KeyPair) {
        s = new Uint8Array([...s, ...sorted[keyType].serialize()])
      }
    }
    
    return new Uint8Array([...s, hexToBin('00')])
  }
  /**
   * @param {import('@bitauth/libauth').ReadPosition} readPosition PsbtOutput map (starting at its first key length) and remaining bytes
   */
   deserialize(readPosition) {
    let limit = readPosition.bin.length
    let index = readPosition.index
    let nextReadPosition = readPosition

    while (index < limit) {
      const keyPair = new KeyPair()
      nextReadPosition = keyPair.deserialize(nextReadPosition)
      if (compactUintToBigInt(keyPair.key.keyLen) === 0n) {
        break
      }
      const keyTypeHex = binToHex(keyPair.key.keyType)

      if (this.keypairs[keyTypeHex] === undefined) {
        this.keypairs[keyTypeHex] = keyPair
      } else if (this.keypairs[keyTypeHex] instanceof Array) {
        this.keypairs[keyTypeHex].push(keyPair)
      } else {
        // Convert existing single entry to array to accommodate keytype with multiple values
        this.keypairs[keyTypeHex] = [this.keypairs[keyTypeHex], keyPair]
      }
      index = nextReadPosition.index
    }

    return { ...nextReadPosition, index: nextReadPosition.index + 1}
  }
}


export class InputMap {
  constructor() {
    this.inputs = []
  }

  /**
   * 
   * @param {PsbtInput} input
   */ 
  add(input){
    this.inputs.push(input)
  }

  serialize() {
    let s = new Uint8Array([])
    this.inputs.forEach((input) => {
      s = new Uint8Array([...s, ...input.serialize()])
    })
    return new Uint8Array([...s, hexToBin('00')])
  }

  deserialize(readPosition, inputCount) {
    let nextReadPosition = readPosition
    let i = 0
    while (i < inputCount) {
      const input = new PsbtInput()
      nextReadPosition = input.deserialize(nextReadPosition)
      this.inputs.push(input)
      i++
    }
    return {...nextReadPosition, index: nextReadPosition.index + 1} 
  }
}

export class OutputMap {
  constructor() {
    this.outputs = []
  }
  /**
   * 
   * @param {PsbtOutput} output
   */
  add(output){
    this.outputs.push(output)
  } 

  serialize() {
    let s = new Uint8Array([])
    this.outputs.forEach((output) => {
      s = new Uint8Array([...s, ...output.serialize()])
    })
    return s
  }

  deserialize(readPosition, outputCount) {
    let nextReadPosition = readPosition
    let i = 0
    while (i < outputCount) {
      const output = new PsbtOutput()
      nextReadPosition = output.deserialize(nextReadPosition)
      this.outputs.push(output)
      i++
    }
    // not really necessary increment index to next byte that's isn't separator, 
    // just to make it consistent
    return { ...nextReadPosition, index: nextReadPosition.index + 1 }  
  }
}

export class Psbt {

  constructor() {
    this.magic = new Magic()
    this.globalMap = new GlobalMap()
    this.inputMap = new InputMap()
    this.outputMap = new OutputMap()
  }

  /**
   * Helper if unsigned tx isn't set on the global map
   * @returns {Uint8Array} The unsigned tx value
   */
  getUnsignedTx() {
    if (this.globalMap.getUnsignedTx()) {
      return this.globalMap.getUnsignedTx()
    }
    const tx = {}
    tx.version = this.globalMap.getTxVersion()
    tx.locktime = this.globalMap.getFallbackLocktime()
    for(const psbtInput of this.inputMap?.inputs) {
      tx.inputs.push({
        outpointIndex: psbtInput.getOutpointIndex(),
        outpointTransactionHash: psbtInput.getOutpointTransactionHash(),
        sequenceNumber: psbtInput.getSequenceNumber(),
        sourceOutput: psbtInput.getSourceUtxo(),
        unlockingBytecode: []
      })
    }

    for(const psbtOutput of psbt.outputMap?.outputs) {
      const o = {
        valueSatoshis: psbtOutput.getAmount()
      }
      const token = psbtOutput.getToken()
      const lockingBytecode = psbtOutput.getOutScript()
      if (token) o.token = token 
      if (lockingBytecode) o.lockingBytecode = lockingBytecode
      tx.outputs.push(o)
    }
    const unsignedTx = new MultisigTransactionBuilder()
    unsignedTx.setVersion(tx.version)
    unsignedTx.setLocktime(tx.locktime)
    unsignedTx.addInputs(tx.inputs)
    unsignedTx.addOutputs(tx.outputs)
    return hexToBin(unsignedTx.build())
  }

  serialize() {
    const magic = (new Magic()).serialize()
    const psbtVersion = Number(
      binToBigIntUintLE(this.globalMap.keypairs[PSBT_GLOBAL_VERSION]?.value?.value ?? new Uint8Array[0])
    )
    const globalMap = this.globalMap.serialize(psbtVersion)
    const inputMap = this.inputMap.serialize(psbtVersion)
    const outputMap = this.outputMap.serialize(psbtVersion)
    const size = new Uint8Array(magic.length +  globalMap.length + inputMap.length + outputMap.length)
    this.serialized = new Uint8Array(size.length)
    this.serialized.set(magic)
    this.serialized.set(globalMap, magic.length)
    this.serialized.set(inputMap, magic.length + globalMap.length)
    this.serialized.set(outputMap, magic.length + globalMap.length + inputMap.length)
    return this.serialized
  }
  
  /**
   * @param {Uint8Array|string} serialized Full PSBT binary or base64 encoded binary including magic bytes
   */
  deserialize(serialized){

    const bin = isBase64(serialized) ? base64ToBin(serialized) : serialized

    const readMagicBytes = readBytes(5)

    const readMagicBytesResult = readMagicBytes({ bin, index: 0 })

    if (!binsAreEqual(readMagicBytesResult.result, hexToBin(PSBT_MAGIC))) throw new Error('Not Psbt')
    
    this.globalMap = new GlobalMap()
    
    let nextReadPosition = this.globalMap.deserialize(readMagicBytesResult.position)

    const inputCount = this.globalMap.getInputCount()
    
    const outputCount = this.globalMap.getOutputCount()
    
    if (!inputCount) {
      throw new Error('Unable to parse input count!')
    }

    if (!outputCount) {
      throw new Error('Unable to parse output count!')
    }
    this.inputMap = new InputMap()
    this.outputMap = new OutputMap()
    nextReadPosition = this.inputMap.deserialize(nextReadPosition, inputCount)
    nextReadPosition = this.outputMap.deserialize(nextReadPosition, outputCount) 
    return nextReadPosition
  }

  /**
   * Encodes decoded data to this PSBT instance
   * @param {Object} decode The decodeResult from decode()
   */
  encode(decoded, version = 145) {
    this.globalMap = new GlobalMap()
    this.inputMap = new InputMap()
    this.outputMap = new OutputMap()
    const txVersionReadResult = readCompactUint({ bin: hexToBin(decoded.unsignedTransactionHex), index: 0})
    this.globalMap.setUnsignedTx(decoded.unsignedTransactionHex)
    this.globalMap.setTxVersion(Number(txVersionReadResult.result))
    this.globalMap.setInputCount(decoded.inputs.length)
    this.globalMap.setOutputCount(decoded.outputs.length)
    this.globalMap.setPsbtVersion(version)
    this.globalMap.setFallbackLocktime(decoded.locktime)

    this.globalMap.addProprietaryField(
      ProprietaryFields.paytaca.identifier, 
      hexToBin(decoded.walletHash), 
      ProprietaryFields.paytaca.subKey.walletHash.subType, 
      ProprietaryFields.paytaca.subKey.walletHash.subKeyData
    )

    decoded.origin && this.globalMap.addProprietaryField(
      ProprietaryFields.paytaca.identifier, 
      utf8ToBin(decoded.origin), 
      ProprietaryFields.paytaca.subKey.origin.subType, 
      ProprietaryFields.paytaca.subKey.origin.subKeyData
    )

    decoded.purpose && this.globalMap.addProprietaryField(
      ProprietaryFields.paytaca.identifier, 
      utf8ToBin(decoded.purpose), 
      ProprietaryFields.paytaca.subKey.purpose.subType, 
      ProprietaryFields.paytaca.subKey.purpose.subKeyData
    )

    this.globalMap.addProprietaryField(
      ProprietaryFields.paytaca.identifier, 
        utf8ToBin(decoded.network),
        ProprietaryFields.paytaca.subKey.network.subType, 
        ProprietaryFields.paytaca.subKey.network.subKeyData
      )


    for(const input of decoded.inputs) {
      const psbtInput = new PsbtInput()
      psbtInput.setOutpointTransaction(input.outpointTransaction)
      Object.keys(input.signatures || {}).forEach(publicKey => {
        psbtInput.addPartialSig(hexToBin(publicKey), input.signatures[publicKey])
      })
      psbtInput.setSighashType(input.sigHash)
      psbtInput.setRedeemScript(input.redeemScript)
      Object.keys(input.bip32Derivation || {}).forEach(publicKey => {
        psbtInput.addBip32Derivation(
          hexToBin(publicKey), 
          input.bip32Derivation[publicKey].masterFingerprint,
          input.bip32Derivation[publicKey].path
        )
      })
      psbtInput.setFinalScriptSig(input.scriptSig)
      psbtInput.setOutpointTransactionHash(input.outpointTransactionHash)
      psbtInput.setOutpointIndex(input.outpointIndex)
      psbtInput.setSequenceNumber(input.sequenceNumber)
      this.inputMap.add(psbtInput)
    }
    for (const output of decoded.outputs) {
      const psbtOutput = new PsbtOutput()
      psbtOutput.setRedeemScript(output.redeemScript)
      Object.keys(output.bip32Derivation || {}).forEach(publicKey => {
        psbtOutput.addBip32Derivation(
          hexToBin(publicKey), 
          output.bip32Derivation[publicKey].masterFingerprint,
          output.bip32Derivation[publicKey].path
        )
      })
      psbtOutput.setAmount(output.valueSatoshis)
      psbtOutput.setToken(output.token)
      psbtOutput.setOutScript(output.lockingBytecode)
      if (output.purpose) {
        psbtOutput.addProprietaryField(
          ProprietaryFields.paytaca.identifier, 
          utf8ToBin(output.purpose), 
          ProprietaryFields.paytaca.subKey.purpose.subType, 
          ProprietaryFields.paytaca.subKey.purpose.subKeyData)
      }
      
      this.outputMap.add(psbtOutput)
    }
    return this
  }

  /**
   * @param {string} base64 Encoded PSBT
   * @param {Object} decodeResult Mutable object, recipient of decoded values
   */
  decode (base64, decodeResult) {

    this.deserialize(base64ToBin(base64))
    decodeResult.version = this.globalMap.getTxVersion()
    decodeResult.locktime = this.globalMap.getFallbackLocktime()
    this.globalMap.getProprietaryFields(ProprietaryFields.paytaca.identifier)?.forEach(pf => {
      if (pf.subKeyData && pf.value) {
        let valueDecoder = binToUtf8
        if (binsAreEqual(pf.subKeyData,  ProprietaryFields.paytaca.subKey.walletHash.subKeyData)) {
          valueDecoder = binToHex
        }
        decodeResult[pf.getSubKeyData(binToUtf8)] = pf.getValue(valueDecoder)
      }
    })

    decodeResult.inputs = []

    for(const psbtInput of this.inputMap?.inputs) {
      decodeResult.inputs.push({
        outpointIndex: psbtInput.getOutpointIndex(),
        outpointTransactionHash: psbtInput.getOutpointTransactionHash(),
        outpointTransaction: psbtInput.getOutpointTransaction(),
        sequenceNumber: psbtInput.getSequenceNumber(),
        signatures: psbtInput.getPartialSigs(),
        bip32Derivation: psbtInput.getBip32Derivation(),
        redeemScript: psbtInput.getRedeemScript(),
        sourceOutput: psbtInput.getSourceUtxo(),
        unlockingBytecode: psbtInput.getFinalScriptSig() || []
      })
    }

    decodeResult.outputs = []

    for(const psbtOutput of this.outputMap?.outputs) {
      const o = {
        valueSatoshis: psbtOutput.getAmount()
      }
      const bip32Derivation = psbtOutput.getBip32Derivation()
      const token = psbtOutput.getToken()
      const lockingBytecode = psbtOutput.getOutScript()

      const purpose = psbtOutput.getProprietaryFields(ProprietaryFields.paytaca.identifier)?.find(pf => {
        return binsAreEqual(pf.getSubKeyData(), ProprietaryFields.paytaca.subKey.purpose.subKeyData)
      })

      if (token) o.token = token 
      if (Object.keys(bip32Derivation).length > 0) o.bip32Derivation = bip32Derivation
      if (lockingBytecode) o.lockingBytecode = lockingBytecode
      if (purpose?.value) o.purpose = purpose.getValue(binToUtf8)
      decodeResult.outputs.push(o)
    }
    return this
  }

  toString() {
    return binToBase64(this.serialize())
  }
}


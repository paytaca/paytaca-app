import { bigIntToBinUint64LE, bigIntToCompactSize, numberToBinInt32LE } from "@bitauth/libauth"
import { bigIntToCompactUint, binToHex, decodeHdPublicKey, encodeTokenPrefix, hexToBin, isHex, numberToBinUint32LE, readCompactUint, readRemainingBytes, sortObjectKeys, utf8ToBin } from "bitauth-libauth-v3"
import { bip32EncodeDerivationPath } from "."

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
const PSBT_IN_SP_DLEQ = '0x1e'
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
const PSBT_OUT_TOKEN= '36'                  // Token Prefix
const PSBT_OUT_PROPRIETARY= 'fc'
// }


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
  
  deserialize(serialized){
    const keyLenReadResult = readCompactUint({ bin: serialized, index: 0 }) // Result is bigint
    const keyTypeReadResult = readCompactUint(keyLenReadResult.position)    // Key Type is compactUint
    const keyDataReadResult = readRemainingBytes(keyTypeReadResult.position)
    this.keyLen = bigIntToCompactUint(keyLenReadResult.result)
    this.keyType = bigIntToCompactUint(keyTypeReadResult.result)
    this.keyData = keyDataReadResult.result 
    return this 
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
   * @param {Uint8Array} serialized value
   * @returns {Uint8Array} The extracted value
   */
  deserialize(serialized){
    const valueLenReadResult = readCompactUint({ bin: serialized, index: 0 }) // Result is bigint
    this.valueLen = bigIntToCompactUint(valueLenReadResult.result)
    const valueDataReadResult = readRemainingBytes(valueLenReadResult.position)  
    this.value = valueDataReadResult.result
    return this 
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
   * @param {Uint8Array} serialized KeyPair
   */
  deserialize(serialized) {
    const keyLenReadResult = readCompactUint(serialized)
    const key = serialized.slice(0, Number(keyLenReadResult.result))
    const value = readRemainingBytes({ 
      bin: serialized, index: Number(keyLenReadResult.result) + 1 
    })
    this.key  = (new Key()).deserialize(key)
    this.value = (new Value()).deserialize(value)
    return this
  }

  toString(){
    return binToHex(this.serialize())
  }
}

export class GlobalMap {
  constructor() {
    this.keypairs = {}
  }

  // Should be removed, testing for psbt0 only
  setUnsignedTx(tx) {
    const _tx = isHex(tx)? hexToBin(tx): tx
    const k = new Key(hexToBin(PSBT_GLOBAL_UNSIGNED_TX))
    const v = new Value(_tx)
    this.keypairs[PSBT_GLOBAL_UNSIGNED_TX] = new KeyPair(k, v)
  }

  /**
   * Optional
   * 
   * @param {string} xpub 
   * @param {string|Uint8Array} masterFingerprint
   * @param {string|Uint8Array} derivationPath
   */
  addXPub(xpub, masterFingerprint, derivationPath) {

    const publicKey = decodeHdPublicKey(xpub).node.publicKey
    const k = new Key(hexToBin(PSBT_GLOBAL_XPUB), publicKey)
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
   * @param {number} [version=2]
   */
  setTxVersion(version = 2){
    const k = new Key(hexToBin(PSBT_GLOBAL_TX_VERSION))
    const v = new Value(numberToBinInt32LE(version ?? 2))
    this.keypairs[PSBT_GLOBAL_TX_VERSION] = new KeyPair(k, v)
    return this
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
   * Version 3, requires CHIP
   * 
   * @param {number} [version = 3]
   */
  setPsbtVersion(version = 3){

    const k = new Key(hexToBin(PSBT_GLOBAL_VERSION))
    const v = new Value(numberToBinUint32LE(version ?? 3))
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
      new Uint8Array([bigIntToCompactUint(...identifier.length), ...identifier, ...subtype, ...subkeydata])
    )

    const v = new Value(value)
    
    if (!this.keypairs[PSBT_GLOBAL_PROPRIETARY]) {
      this.keypairs[PSBT_GLOBAL_PROPRIETARY] = []
    }
    this.keypairs[PSBT_GLOBAL_PROPRIETARY].push(new KeyPair(k, v))
    return this
  }

  sanitizeForVersion(psbtVersion, keypairs) {
    const sorted = { ...keypairs }
    for (const key of Object.keys(sorted)) {
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
}

export const PaytacaProprietaryIdentifierPrefix = utf8ToBin('paytaca')
export const PaytacaProprietarySubtypeOrigin = new Uint8Array([...bigIntToCompactUint(1)])
export const PaytacaProprietarySubkeyDataOrigin = utf8ToBin('origin')
export const PaytacaProprietarySubtypePurpose = new Uint8Array([...bigIntToCompactUint(2)], ...utf8ToBin('purpose'))

export class PsbtInput {
  constructor() {
    this.keypairs = {}
  }
  /**
   * @param {string|Uint8Array} tx
   */
  setUtxo(tx){
    const _tx = isHex(tx) ? hexToBin(tx) : tx
    const k = new Key(hexToBin(PSBT_IN_NON_WITNESS_UTXO))
    const v = new Value(_tx)
    this.keypairs[PSBT_IN_NON_WITNESS_UTXO] = new KeyPair(k, v)
    return this
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

  /**
   * @param {string|Uint8Array} index The outpoint transaction hash
   */
  setPrevTxid(outpointTxHash){
    if (!outpointTxHash) return

    const _txid = isHex(outpointTxHash) ? hexToBin(outpointTxHash): outpointTxHash

    const k = new Key(hexToBin(PSBT_IN_PREVIOUS_TXID))

    const v = new Value(_txid)

    this.keypairs[PSBT_IN_PREVIOUS_TXID] = new KeyPair(k, v)
    return this
  }

  /**
   * @param {number} index The outpoint index
   */
  setOutputIndex(index){

    const k = new Key(hexToBin(PSBT_IN_OUTPUT_INDEX))

    const v = new Value(numberToBinUint32LE(index))

    this.keypairs[PSBT_IN_OUTPUT_INDEX] = new KeyPair(k, v)
  }


  setSequenceNumber(sequenceNumber) {

    // const _sequenceNumber = sequenceNumber > 0 ? numberToBinUint32LE(sequenceNumber) : hexToBin('ffffffff')
    const k = new Key(hexToBin(PSBT_IN_SEQUENCE))
    const v = new Value(numberToBinUint32LE(sequenceNumber))

    this.keypairs[PSBT_IN_SEQUENCE] = new KeyPair(k, v)
    return this
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
   * @param {Uint8Array} identifier Example: utf8ToBin('paytaca')
   * @param {Uint8Array} subtype compact size uint
   * @param {Uint8Array} subkeydata Example: utf8ToBin('origin')
   * @param {Uint8Array} value Example: utf8ToBin('https://paytaca.com')
   */
  addProprietaryField(identifier, value, subtype = new Uint8Array([]), subkeydata = new Uint8Array([])){
    const k = new Key(
      hexToBin(PSBT_IN_PROPRIETARY), 
      new Uint8Array([bigIntToCompactUint(...identifier.length), ...identifier, ...subtype, ...subkeydata])
    )

    const v = new Value(value)
    
    if (!this.keypairs[PSBT_IN_PROPRIETARY]) {
      this.keypairs[PSBT_IN_PROPRIETARY] = []
    }
    this.keypairs[PSBT_IN_PROPRIETARY].push(new KeyPair(k, v))
    return this
  }

  sanitizeForVersion(psbtVersion, keypairs) {
    console.log('KEYPAIRS', keypairs)
    const sorted = { ...keypairs }
    console.log('SORTED', sorted)
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
          console.log('KEYPAIR', keypair)
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
   * @param {bigint} satoshis Satoshi value
   */
  setAmount(satoshis){
    const k = new Key(hexToBin(PSBT_OUT_AMOUNT))
    const v = new Value(bigIntToBinUint64LE(satoshis))
    this.keypairs[PSBT_OUT_AMOUNT] = new KeyPair(k, v)
    return this
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

    const k = new Key(hexToBin(PSBT_OUT_TOKEN))
    const v = new Value(_token)

    this.keypairs[PSBT_OUT_TOKEN] = new KeyPair(k, v)
    return this
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

  /**
   * @param {Uint8Array} identifier Example: utf8ToBin('paytaca')
   * @param {Uint8Array} subtype compact size uint
   * @param {Uint8Array} subkeydata Example: utf8ToBin('origin')
   * @param {Uint8Array} value Example: utf8ToBin('https://paytaca.com')
   */
  addProprietaryField(identifier, value, subtype = new Uint8Array([]), subkeydata = new Uint8Array([])){
    const k = new Key(
      hexToBin(PSBT_OUT_PROPRIETARY), 
      new Uint8Array([bigIntToCompactUint(...identifier.length), ...identifier, ...subtype, ...subkeydata])
    )

    const v = new Value(value)
    
    if (!this.keypairs[PSBT_OUT_PROPRIETARY]) {
      this.keypairs[PSBT_OUT_PROPRIETARY] = []
    }
    this.keypairs[PSBT_OUT_PROPRIETARY].push(new KeyPair(k, v))
    return this
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
   * @params {number} [psbtVersion = 3]
   */
  serialize(psbtVersion) {
    console.log('outputmap', this.keypairs)
    const sorted = sortObjectKeys(this.sanitizeForVersion(psbtVersion, this.keypairs))
    console.log('sorted', sorted)
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
}

export class Psbt {

  constructor() {
    this.magic = new Magic()
    this.globalMap = new GlobalMap()
    this.inputMap = new InputMap()
    this.outputMap = new OutputMap()
  }

  serialize() {
    const magic = (new Magic()).serialize()
    const psbtVersion = this.globalMap.keypairs[PSBT_GLOBAL_TX_VERSION]?.value
    console.log('PSBT VERSION', psbtVersion)
    const globalMap = this.globalMap.serialize()
    const inputMap = this.inputMap.serialize()
    const outputMap = this.outputMap.serialize()
    const size = new Uint8Array(magic.length +  globalMap.length + inputMap.length + outputMap.length)
    this.serialized = new Uint8Array(size.length)
    this.serialized.set(magic)
    this.serialized.set(globalMap, magic.length)
    this.serialized.set(inputMap, magic.length + globalMap.length)
    this.serialized.set(outputMap, magic.length + globalMap.length + inputMap.length)
    return this.serialized
  }
  
}


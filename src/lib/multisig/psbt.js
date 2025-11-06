import { bigIntToBinUint64LE, bigIntToCompactSize, numberToBinInt32LE } from "@bitauth/libauth"
import { bigIntToCompactUint, binToHex, decodeHdPublicKey, encodeTokenPrefix, hexToBin, isHex, numberToBinUint32LE, sortObjectKeys } from "bitauth-libauth-v3"
import { bip32EncodeDerivationPath } from "."

export const PSBT_MAGIC = '70736274ff'

export const PSBT_KEY_TYPES = {
  // ---------- Global map ----------
  PSBT_GLOBAL_UNSIGNED_TX: '00',         // The unsigned transaction (no witnesses)                
  PSBT_GLOBAL_XPUB: '01',                // Extended public keys and their derivation paths
  PSBT_GLOBAL_TX_VERSION: '02',          // Transaction Version                                
  PSBT_GLOBAL_FALLBACK_LOCKTIME: '03',
  PSBT_GLOBAL_INPUT_COUNT: '04',         // Number of inputs (BIP 370)
  PSBT_GLOBAL_OUTPUT_COUNT: '05',        // Number of inputs (BIP 370)
  PSBT_GLOBAL_TX_MODIFIABLE: '06',       // Allowed modifications (BIP 370)
  PSBT_GLOBAL_SP_ECDH_SHARE: '07',
  PSBT_GLOBAL_SP_DLEQ: '08',
  PSBT_GLOBAL_VERSION: 'fb',             // PSBT version number (added in BIP 370)
  PSBT_GLOBAL_PROPRIETARY: 'fc',         // Custom (proprietary) key-value pair

  // ---------- Input map ----------
  // PSBT_IN_NON_WITNESS_UTXO: '00',        // Full previous transaction
  PSBT_IN_WITNESS_UTXO: '01',            // Output being spent
  PSBT_IN_PARTIAL_SIG: '02',             // Partial signature
  PSBT_IN_SIGHASH_TYPE: '03',            // Sighash type (uint32)
  PSBT_IN_REDEEM_SCRIPT: '04',           // Redeem script (for P2SH)
  PSBT_IN_WITNESS_SCRIPT: '05',          // Witness script (for P2WSH)
  PSBT_IN_BIP32_DERIVATION: '06',        // Derivation path data
  PSBT_IN_FINAL_SCRIPTSIG: '07',         // Final scriptSig
  PSBT_IN_FINAL_SCRIPTWITNESS: '08',     // Final scriptWitness
  PSBT_IN_POR_COMMITMENT: '09',          // Proof of reserves commitment
  PSBT_IN_RIPEMD160: '0a',
  PSBT_IN_SHA256: '0b',
  PSBT_IN_HASH160: '0c',
  PSBT_IN_HASH256: '0d',
  PSBT_IN_PREVIOUS_TXID: '0e',
  PSBT_IN_OUTPUT_INDEX: '0f',
  PSBT_IN_SEQUENCE: '10',
  PSBT_IN_REQUIRED_TIME_LOCKTIME: '11',
  PSBT_IN_REQUIRED_HEIGHT_LOCKTIME: '12',
  PSBT_IN_TAP_KEY_SIG: '13',             // Taproot key path signature (BIP 371)
  PSBT_IN_TAP_SCRIPT_SIG: '14',          // Taproot script path signatures
  PSBT_IN_TAP_LEAF_SCRIPT: '15',         // Taproot leaf scripts
  PSBT_IN_TAP_BIP32_DERIVATION: '16',    // Taproot BIP32 derivation
  PSBT_IN_TAP_INTERNAL_KEY: '17',        // Taproot internal key
  PSBT_IN_TAP_MERKLE_ROOT: '18',         // Taproot merkle root
  PSBT_IN_MUSIG2_PARTICIPANT_PUBKEYS: '1a',
  PSBT_IN_MUSIG2_PUB_NONCE: '1b',
  PSBT_IN_MUSIG2_PARTIAL_SIG: '1c',
  PSBT_IN_SP_ECDH_SHARE: '1d',
  PSBT_IN_SP_ECDH_SHARE: '1d',
  PSBT_IN_PROPRIETARY: 'fc',             // Custom (proprietary) key-value pair

  // ---------- Output map ----------
  PSBT_OUT_REDEEM_SCRIPT: '00',          // Redeem script (for P2SH)
  PSBT_OUT_WITNESS_SCRIPT: '01',         // Witness script (for P2WSH)
  PSBT_OUT_BIP32_DERIVATION: '02',       // Derivation path data
  PSBT_OUT_AMOUNT: '03',
  PSBT_OUT_SCRIPT: '04',
  PSBT_OUT_TAP_INTERNAL_KEY: '05',
  PSBT_OUT_TAP_TREE: '06',
  PSBT_OUT_TAP_BIP32_DERIVATION: '07',
  PSBT_OUT_MUSIG2_PARTICIPANT_PUBKEYS: '08',
  PSBT_OUT_SP_V0_INFO: '09',
  PSBT_OUT_SP_V0_LABEL: '0a',
  PSBT_OUT_DNSSEC_PROOF: '35',
  PSBT_OUT_TOKEN: '36',                  // Token Prefix
  PSBT_OUT_PROPRIETARY: 'fc'
}


export class Magic {
  serialize() {
    return hexToBin('70736274ff')
  }
}

export class Key {
  constructor(keyType, keyData = new Uint8Array([])){
    this.keyType = keyType
    this.keyData = keyData
    this.keyLen = keyType && keyData && bigIntToCompactUint(keyType.length + keyData.length)
  }
  serialize(){
    this.s = new Uint8Array([...this.keyLen, ...this.keyType, ...this.keyData])
    return this.s
  }
  deserialize(s){}
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
    this.s = new Uint8Array([...this.valueLen, ...this.value])
    return this.s
  }
  deserialize(s){}
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
  deserialize(s){}

  toString(){
    return binToHex(this.serialize())
  }
}

export class GlobalMap {
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
    const v = new Value(numberToBinInt32LE(version ?? 3))
    this.keypairs[PSBT_GLOBAL_VERSION] = new KeyPair(k, v)
    return this
  }

  serialize() {
    const sorted = sortObjectKeys(this.keypairs)
    let s = new Uint8Array([])
    for (const keyType in Object.keys(sorted)) {
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

export class PsbtInput {
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
   * @param {string|Uint8Array} identifier
   * @param {string|Uint8Array} subtype 
   */
  addProprietaryField(identifier, subtype){
    // TODO
  }

  serialize() {
    const sorted = sortObjectKeys(this.keypairs)
    let s = new Uint8Array([])
    for (const keyType in Object.keys(sorted)) {
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
    s = new Uint8Array([...s, hexToBin('00')])
    return s
  }
}

export class PsbtOutput {
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

  addProprietaryField(){}

  serialize() {
    const sorted = sortObjectKeys(this.keypairs)
    let s = new Uint8Array([])
    for (const keyType in Object.keys(sorted)) {
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
    s = new Uint8Array([...s, hexToBin('00')])
    return s
  }
}

export class Psbt {


  addPsbtInput(input){
    if (!this.inputs) {
      this.inputs = []
      return this
    }
    this.inputs.push(input)
    return this
  }

  addPsbtOutput(){
    if (!this.outputs) {
      this.outputs = []
      return this 
    }
    this.outputs.push(output)
    return this
  }

  
}


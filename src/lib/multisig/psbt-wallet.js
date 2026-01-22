import { base64ToBin, bigIntToCompactUint, binsAreEqual, binToBase64, binToHex, binToUtf8, compactUintToBigInt, decodeHdPublicKey, encodeHdPublicKey, encodeHdPublicKeyPayload, hexToBin, isBase64, isHex, readBytes, readCompactUint, readRemainingBytes, sortObjectKeys, utf8ToBin } from "bitauth-libauth-v3"
import { bip32DecodeDerivationPath, bip32EncodeDerivationPath, decodeHdPublicKeyPayload } from "./utils.js"
export const WALLET_MAGIC = '6d6f666eff'        // mofn

// export const WALLET_KEY_TYPES = {
  // ---------- Global map ----------
const WALLET_GLOBAL_M= '00'                   // Compact size uint, The required number of signers          
const WALLET_GLOBAL_XPUB= '01'                // Extended public keys and their derivation paths
const WALLET_GLOBAL_PROPRIETARY= 'fc'         // Custom (proprietary) key-value pair


export const ProprietaryFields = Object.freeze({
  wallet: {
    identifier: utf8ToBin('psbt-mofn-wallet'),
    subKey: {
      name: {
        subType: bigIntToCompactUint(0),
        subKeyData: utf8ToBin('name')
      },
      signer: { // *
        subType: bigIntToCompactUint(1),
        subKeyData: utf8ToBin('xpub')
      },
      mainnetLastUsedDepositAddressIndex: {
        subType: bigIntToCompactUint(2),
        subKeyData: utf8ToBin('di')
      },
      mainnetLastUsedChangeAddressIndex: {
        subType: bigIntToCompactUint(3),
        subKeyData: utf8ToBin('ci')
      },
      chipnetLastUsedDepositAddressIndex: {
        subType: bigIntToCompactUint(4),
        subKeyData: utf8ToBin('cdi')
      },
      chipnetLastUsedChangeAddressIndex: {
        subType: bigIntToCompactUint(5),
        subKeyData: utf8ToBin('cci')
      },
    }
  },
  walletName: {
    identifier: utf8ToBin('w-name'),
  },

  signers: {
    identifier: utf8ToBin('w-signers'),
    subKey: {
        // subType: bigIntToCompactUint(0), dynamic, index of signer's xpub
        // subKeyData: utf8ToBin('name')
        name: {
            // subType: <dynamic, based on index of the xpub> 
            subKeyData: utf8ToBin('name')
        }
    }
  },
  mainnet: {
    identifier: utf8ToBin('w-net-mainnet'),
    subKey: {
        lastUsedDepositAddressIndex: {
            subType: bigIntToCompactUint(0n),
            subKeyData: utf8ToBin('di') 
        },
        lastUsedChangeAddressIndex: {
            subType: bigIntToCompactUint(1n),
            subKeyData: utf8ToBin('ci')
        }
    }
  },
  chipnet: {
    identifier: utf8ToBin('w-net-chipnet'),
    subKey: {
        lastUsedDepositAddressIndex: {
            subType: bigIntToCompactUint(0n),
            subKeyData: utf8ToBin('di') 
        },
        lastUsedChangeAddressIndex: {
            subType: bigIntToCompactUint(1n),
            subKeyData: utf8ToBin('ci')
        }
    }
  }
})

export class Magic {
  
  serialize() {
    return hexToBin(WALLET_MAGIC)
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

  /**
   * @param {Uint8Array} identifier
   * @param {KeyPair[]} keypairs
   * @returns {ProprietaryField[]}
   */
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
        continue
      }

      const proprietaryField = {
        identifier: identifierReadResult.result
      }

      const subTypeReadResult = readCompactUint(identifierReadResult.position)
      
      if (subTypeReadResult.result !== undefined) {
        const subKeyDataReadResult = readRemainingBytes(subTypeReadResult.position)
        proprietaryField.subType = subTypeReadResult.result 
        proprietaryField.subKeyData = subKeyDataReadResult.result  
      }
      
      proprietaryField.value = readRemainingBytes({
        bin: keypair?.value?.value || Uint8Array.from([]),
        index: 0
      })?.result
      if (binToUtf8(identifier) === 'w-name') {
        console.log('identifier', binToUtf8(identifier))
        console.log('proprietaryField', proprietaryField)
      }
      proprietaryFields.push(new ProprietaryField(proprietaryField))
    }

    return proprietaryFields
  }
}

export class XPubField {

    constructor({ serializedXpub, derivationPath, masterFingerprint }){
        this.xpub = serializedXpub
        this.path = derivationPath
        this.masterFingerprint = masterFingerprint
    }

    /**
     * @returns {Uint8Array}
     */
    getXPub(decoder){
        return decoder ? decoder(this.xpub) : this.xpub   
    }


    /**
     * @returns {Uint8Array}
     */
    getPath(decoder) {
       return decoder ? decoder(this.path): this.path 
    }


    /**
     * @returns {Uint8Array} Uint8Array or the result of decoding with decoder 
     */
    getMasterFingerprint(decoder){
       return decoder ? decoder(this.masterFingerprint): this.masterFingerprint
    }

    /**
     * Extract XPubFields from KeyPairs
     * @param {KeyPair[]} keypairs
     * @returns {XPubField[]}
     */
    static extractXPubFields(keypairs) {

        if (!keypairs[WALLET_GLOBAL_XPUB]) return
        
        const xpubFields = []
        
        const _keypairs = keypairs[WALLET_GLOBAL_XPUB] instanceof KeyPair ? 
          [ keypairs[WALLET_GLOBAL_XPUB] ] : 
          keypairs[WALLET_GLOBAL_XPUB]
    
        for (const keypair of _keypairs) {
          const keyData = keypair.key?.keyData
          if (!keyData) return xpubFields
        
          const serializedXpub = keypair.key.keyData
          const masterFingerprintReader = readBytes(4)
          const masterFingerprintReadResult = masterFingerprintReader({bin: keypair.value.value, index: 0})
          const derivationPathReadResult = readRemainingBytes(masterFingerprintReadResult.position)

          xpubFields.push(
            new XPubField({ 
                serializedXpub: serializedXpub,
                masterFingerprint: masterFingerprintReadResult.result,
                derivationPath: derivationPathReadResult.result
            })
          )
        }
        return xpubFields
      }
}

export class GlobalMap {

  constructor() {
    this.keypairs = {}
  }


  // Should be removed, testing for psbt0 only
  setM(m) {
    const k = new Key(hexToBin(WALLET_GLOBAL_M))
    const v = new Value(bigIntToCompactUint(m))
    this.keypairs[WALLET_GLOBAL_M] = new KeyPair(k, v)
  }

  getM() {
    return this.keypairs[WALLET_GLOBAL_M]?.value?.value && 
        Number(compactUintToBigInt(this.keypairs[WALLET_GLOBAL_M]?.value?.value))
  }
  
  /**
   * Optional
   * 
   * @param {string} xpub 
   * @param {string|Uint8Array} masterFingerprint
   * @param {string|Uint8Array} derivationPath
   */
  addXPub(xpub, masterFingerprint, derivationPath) {
    const k = new Key(hexToBin(WALLET_GLOBAL_XPUB), encodeHdPublicKeyPayload(decodeHdPublicKey(xpub)))
    let mf = isHex(masterFingerprint) ? hexToBin(masterFingerprint): masterFingerprint 
    let dp = bip32EncodeDerivationPath(derivationPath)
    const v = new Value(new Uint8Array([...mf, ...dp]))

    if (!this.keypairs[WALLET_GLOBAL_XPUB]) {
      this.keypairs[WALLET_GLOBAL_XPUB] = []
    }
    this.keypairs[WALLET_GLOBAL_XPUB].push(new KeyPair(k, v))
    return this
  }

  getXPubs() {
    return XPubField.extractXPubFields(this.keypairs)
  }

  
  /**
   * @param {Uint8Array} identifier Example: utf8ToBin('paytaca')
   * @param {Uint8Array} subtype compact size uint
   * @param {Uint8Array} subkeydata Example: utf8ToBin('origin')
   * @param {Uint8Array} value Example: utf8ToBin('https://paytaca.com')
   */
  addProprietaryField(identifier, value, subtype = new Uint8Array([]), subkeydata = new Uint8Array([])){
    const k = new Key(
      hexToBin(WALLET_GLOBAL_PROPRIETARY), 
      new Uint8Array([...bigIntToCompactUint(identifier.length), ...identifier, ...subtype, ...subkeydata])
    )

    const v = new Value(value)
    
    if (!this.keypairs[WALLET_GLOBAL_PROPRIETARY]) {
      this.keypairs[WALLET_GLOBAL_PROPRIETARY] = []
    }
    this.keypairs[WALLET_GLOBAL_PROPRIETARY].push(new KeyPair(k, v))
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
          case WALLET_GLOBAL_TX_VERSION:
          case WALLET_GLOBAL_FALLBACK_LOCKTIME:
          case WALLET_GLOBAL_INPUT_COUNT:
          case WALLET_GLOBAL_OUTPUT_COUNT:
          case WALLET_GLOBAL_TX_MODIFIABLE:
          case WALLET_GLOBAL_SP_ECDH_SHARE:
          case WALLET_GLOBAL_SP_DLEQ:
            delete sorted[key]
        }
      }
      if (psbtVersion === 2) {
        switch(key) {
          case WALLET_GLOBAL_M:
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
  serialize() {
    const sorted = sortObjectKeys(this.keypairs)
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

export class PsbtWallet {

  constructor() {
    this.magic = new Magic()
    this.globalMap = new GlobalMap()
  }

  serialize() { 
    const magic = this.magic.serialize()
    const globalMap = this.globalMap.serialize()
    const size = new Uint8Array(magic.length +  globalMap.length)
    this.serialized = new Uint8Array(size.length)
    this.serialized.set(magic)
    this.serialized.set(globalMap, magic.length)
    return this.serialized
  }
  
  /**
   * @param {Uint8Array|string} serialized Full PSBT binary or base64 encoded binary including magic bytes
   */
  deserialize(serialized){
    const bin = isBase64(serialized) ? base64ToBin(serialized) : serialized

    const readMagicBytes = readBytes(5)

    const readMagicBytesResult = readMagicBytes({ bin, index: 0 })

    if (!binsAreEqual(readMagicBytesResult.result, hexToBin(WALLET_MAGIC))) throw new Error('Not Psbt')
    this.globalMap = new GlobalMap()
    let nextReadPosition = this.globalMap.deserialize(readMagicBytesResult.position)
    return nextReadPosition
  }

  /**
   * Encodes decoded data to this PSBT instance
   * @param {Object} decoded The decodeResult from decode(). The decoded wallet
   */
  encode(decoded) {
    this.globalMap = new GlobalMap()   
    this.globalMap.setM(decoded.m)
    console.log('decoded', decoded)
    
    this.globalMap.addProprietaryField(
      ProprietaryFields.walletName.identifier, 
      utf8ToBin(decoded.name || '')
  )
    // return
    if (decoded.signers) {
        for (const i in decoded.signers) {
            const s = decoded.signers[i]
            this.globalMap.addXPub(s.xpub, s.masterFingerprint, s.path || `m/44'/145'/0'`)
            this.globalMap.addProprietaryField(
                ProprietaryFields.signers.identifier, 
                utf8ToBin(s.name || ''), 
                bigIntToCompactUint(i), 
                ProprietaryFields.signers.subKey.name.subKeyData
            )
        }
    }
    
    if(decoded.networks?.mainnet?.lastUsedDepositAddressIndex !== undefined) {
        this.globalMap.addProprietaryField(
            ProprietaryFields.mainnet.identifier, 
            bigIntToCompactUint(decoded.networks.mainnet.lastUsedDepositAddressIndex),
            ProprietaryFields.mainnet.subKey.lastUsedDepositAddressIndex.subType, 
            ProprietaryFields.mainnet.subKey.lastUsedDepositAddressIndex.subKeyData
        )
    }

    if (decoded.networks?.mainnet?.lastUsedChangeAddressIndex !== undefined) {
        this.globalMap.addProprietaryField(
            ProprietaryFields.mainnet.identifier, 
            bigIntToCompactUint(decoded.networks.mainnet.lastUsedChangeAddressIndex),
            ProprietaryFields.mainnet.subKey.lastUsedChangeAddressIndex.subType, 
            ProprietaryFields.mainnet.subKey.lastUsedChangeAddressIndex.subKeyData
        )
    }
    
    if(decoded.networks?.chipnet?.lastUsedDepositAddressIndex !== undefined) {
        this.globalMap.addProprietaryField(
            ProprietaryFields.chipnet.identifier, 
            bigIntToCompactUint(decoded.networks.chipnet.lastUsedDepositAddressIndex),
            ProprietaryFields.chipnet.subKey.lastUsedDepositAddressIndex.subType, 
            ProprietaryFields.chipnet.subKey.lastUsedDepositAddressIndex.subKeyData
        )
    }
        
    if(decoded.networks?.chipnet?.lastUsedChangeAddressIndex !== undefined) {
        this.globalMap.addProprietaryField(
            ProprietaryFields.chipnet.identifier, 
            bigIntToCompactUint(decoded.networks.chipnet.lastUsedChangeAddressIndex),
            ProprietaryFields.chipnet.subKey.lastUsedChangeAddressIndex.subType, 
            ProprietaryFields.chipnet.subKey.lastUsedChangeAddressIndex.subKeyData
        )

    }
    return this
  }

  /**
   * @param {string} base64 Encoded PSBT
   * @param {Object} decodeResult Mutable object, recipient of decoded values
   */
  decode (base64, decodeResult) {

    this.deserialize(base64ToBin(base64))

    decodeResult.m = this.globalMap.getM()
    // console.log('DECODED', decodeResult.m)
    // return
    decodeResult.signers = []
    const walletName = this.globalMap.getProprietaryFields(ProprietaryFields.walletName.identifier)
    decodeResult.name = walletName[0]?.getValue(binToUtf8)
    const xPubFields = this.globalMap.getXPubs()
    const signersProprietaryFields = this.globalMap.getProprietaryFields(ProprietaryFields.signers.identifier)
    for (const i in xPubFields) {
        const xpub = encodeHdPublicKey(xPubFields[i].getXPub(decodeHdPublicKeyPayload)).hdPublicKey
        const masterFingerprint = xPubFields[i].getMasterFingerprint(binToHex)
        const path = xPubFields[i].getPath(bip32DecodeDerivationPath)
        const name = signersProprietaryFields[i]?.getValue(binToUtf8)
        decodeResult.signers.push({
            xpub,
            masterFingerprint,
            path,
            name
        })
    }
    
    const networks = {}
    this.globalMap.getProprietaryFields(ProprietaryFields.mainnet.identifier)?.forEach(pf => {
        if (!networks.mainnet) {
            networks.mainnet = {}
        }
        if(pf.getSubKeyData(binToUtf8) === 'di') {
            let lastUsedDepositAddressIndex = pf.getValue() && pf.getValue(compactUintToBigInt)
            if (lastUsedDepositAddressIndex !== undefined) {
                networks.mainnet.lastUsedDepositAddressIndex = Number(lastUsedDepositAddressIndex)
            }
        }
        if(pf.getSubKeyData(binToUtf8) === 'ci') {
            let lastUsedChangeAddressIndex = pf.getValue() && pf.getValue(compactUintToBigInt)
            if (lastUsedChangeAddressIndex !== undefined) {
                networks.mainnet.lastUsedChangeAddressIndex = Number(lastUsedChangeAddressIndex)
            }
        }
    })
    
    this.globalMap.getProprietaryFields(ProprietaryFields.chipnet.identifier)?.forEach(pf => {
        if (!networks.chipnet) {
            networks.chipnet = {}
        }
        if(pf.getSubKeyData(binToUtf8) === 'cdi') {
            let lastUsedDepositAddressIndex = pf.getValue() && pf.getValue(compactUintToBigInt)
            if (lastUsedDepositAddressIndex !== undefined) {
                networks.mainnet.lastUsedDepositAddressIndex = Number(lastUsedDepositAddressIndex)
            }
        }
        if(pf.getSubKeyData(binToUtf8) === 'cci') {
            let lastUsedChangeAddressIndex = pf.getValue() && pf.getValue(compactUintToBigInt)
            if (lastUsedChangeAddressIndex !== undefined) {
                networks.mainnet.lastUsedChangeAddressIndex = Number(lastUsedChangeAddressIndex)
            }
        }
    })

    if (Object.keys(networks)) {
        decodeResult.networks = networks
    } 

    return this
  }

  toString() {
    return binToBase64(this.serialize())
  }
}


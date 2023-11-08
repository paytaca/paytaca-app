import crypto from 'crypto'
import * as secp from '@noble/secp256k1'

const CHUNK_SIZE = 15

/**
 * @param {Object} opts
 * @param {String} opts.data 
 * @param {String} opts.privkey 32bit hex string
 * @param {String[] | String} opts.pubkeys 33bit secp256k1 pubkey/s
 */
export function encryptMessage(opts={ data: '', privkey: '', pubkeys: '' }) {
  const data = opts?.data
  const privkey = opts?.privkey
  const pubkeys = opts?.pubkeys

  const ourPubkey = privToPub(privkey)
  const pks = Array.isArray(pubkeys) ? [...pubkeys] : [pubkeys]

  if (pks.length === 1) {
    const ourPriv = secp.etc.hexToBytes(privkey)
    const otherPub = secp.etc.hexToBytes(pks?.[0])

    const sharedPoint = secp.getSharedSecret(ourPriv, otherPub)
    const sharedX = sharedPoint.slice(1, 33)
    const iv = crypto.randomFillSync(new Uint8Array(16))

    const encrypted = encryptData(data, Buffer.from(sharedX), iv)

    return { data: encrypted, authorPubkey: ourPubkey, pubkeys: pks, iv: Buffer.from(iv).toString('base64') }
  } else {
    // const globalKey = crypto.createHash('sha256').update(Buffer.from(data)).digest()
    const globalKey = Buffer.from(crypto.randomFillSync(new Uint8Array(32)))
    const iv = crypto.randomFillSync(new Uint8Array(16))
    const encrypted = encryptData(data, globalKey, iv)

    const pubkeys = pks.map(pubkey => {
      const ourPriv = secp.etc.hexToBytes(privkey)
      const otherPub = secp.etc.hexToBytes(pubkey)
      const sharedPoint = secp.getSharedSecret(ourPriv, otherPub)
      const sharedX = sharedPoint.slice(1, 33)
      const sharedSecret = encryptData(globalKey.toString('hex'), Buffer.from(sharedX), iv)
      return `${pubkey}|${sharedSecret}`
    })
    return { data: encrypted, authorPubkey: ourPubkey, pubkeys, iv: Buffer.from(iv).toString('base64') }
  }
}


/**
 * @param {Object} opts
 * @param {String} opts.data base64 encoded encrypted message
 * @param {String} opts.iv base64 encoded initialization vector(IV)
 * @param {String} opts.privkey 32bit hex encoded privkey
 * @param {String} opts.authorPubkey 33bit hex encoded pubkey of the author
 * @param {String[]} opts.pubkeys combined pubkey & sharedSecret delimited by a bar '|'. Use pubkey directly if no sharedSecret is provided
 */
export function decryptMessage(opts={data: '', iv: '', privkey: '', authorPubkey: '', pubkeys: []}) {
  const data = opts?.data
  const iv = opts?.iv
  const privkey = opts?.privkey
  const authorPubkey =  opts?.authorPubkey
  const pubkeys = opts?.pubkeys

  const ourPubkey = privToPub(privkey)
  const ivBytes = Buffer.from(iv, 'base64')

  for(var i = 0; i < pubkeys.length; i++) {
    try {
      const pubkeyData = pubkeys[i]
      let [pubkey, sharedSecret, ..._] = pubkeyData.split('|', 2)
      if (pubkey == ourPubkey) pubkey = authorPubkey
      const ourPriv = secp.etc.hexToBytes(privkey)
      const otherPub = secp.etc.hexToBytes(pubkey)
      const sharedPoint = secp.getSharedSecret(ourPriv, otherPub)
      const sharedX = sharedPoint.slice(1, 33)
    
      let key
      if (sharedSecret) {
        const globalKey = decryptData(sharedSecret, Buffer.from(sharedX), ivBytes)
        key = Buffer.from(globalKey, 'hex')
      } else {
        key = Buffer.from(sharedX)
      }
      return decryptData(data, key, ivBytes)
    } catch (error) {
      console.error(error)
      continue
    }
  }
}

function privToPub(priv) {
  const privBytes = secp.etc.hexToBytes(priv)
  const pub = secp.getPublicKey(privBytes)
  const pubHex = secp.etc.bytesToHex(pub)
  return pubHex
}

/**
 * @param {String} data 
 * @param {Buffer | Uint8Array} key 
 * @param {Buffer | Uint8Array} iv 
 */
function encryptData(data, key, iv) {
  const bytes = Buffer.from(data)
  let encrypted = ''
  for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.toString('hex', i, i+CHUNK_SIZE)
    const cipheriv = crypto.createCipheriv('aes-256-cbc', key, iv)
    cipheriv.update(chunk, 'hex', 'hex')
    encrypted += cipheriv.final('hex')
  }
  return Buffer.from(encrypted, 'hex').toString('base64')
}

/**
 * @param {String} data base64 encoded encrypted message
 * @param {Buffer | Uint8Array} key 
 * @param {Buffer | Uint8Array} iv 
 */
function decryptData(data, key, iv) {
  const dataHex = Buffer.from(data, 'base64').toString('hex')
  let decryptedData = ''
  const HEX_CHUNK_SIZE = CHUNK_SIZE*2+2

  for(var i = 0; i < dataHex.length; i += HEX_CHUNK_SIZE) {
    const chunk = dataHex.substring(i, i + HEX_CHUNK_SIZE)
    const decipheriv = crypto.createDecipheriv('aes-256-cbc', key, iv)
    decipheriv.update(chunk, 'hex', 'utf8')
    decryptedData += decipheriv.final('utf8')
  }

  return decryptedData
}

/**
 * @param {Object} messagePayload
 * @param {String} messagePayload.data
 * @param {String} messagePayload.iv
 * @param {String} messagePayload.authorPubkey
 * @param {String[]} messagePayload.pubkeys
 */
export function compressEncryptedMessage(messagePayload) {
  const serializedPayload = {
    d: messagePayload?.data,
    iv: messagePayload?.iv,
    pk: messagePayload?.authorPubkey,
    pks: messagePayload?.pubkeys,
  }

  return Buffer.from(JSON.stringify(serializedPayload), 'utf-8').toString('base64')
}

export function decompressEncryptedMessage(data='') {
  const dataStr = Buffer.from(data, 'base64').toString('utf-8')
  const deserialized = JSON.parse(dataStr)

  const response = { data: '', iv: '', authorPubkey: '', pubkeys: [].map(String) }
  response.data = deserialized?.d
  response.iv = deserialized?.iv
  response.authorPubkey = deserialized?.pk
  response.pubkeys = deserialized?.pks
  return response
}

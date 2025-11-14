import crypto from 'crypto'
import * as secp from '@noble/secp256k1'
import { Store } from 'src/store'
import { nativeFileAPI } from 'src/utils/native-file'

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
  const _pks = Array.isArray(pubkeys) ? [...pubkeys] : [pubkeys]
  const pks = _pks.filter((pk, index, list) => list.indexOf(pk) === index)
  if (pks.length <= 0) pks.push(ourPubkey)

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
 * @param {Boolean} opts.tryAllKeys will attempt to decrypt using other pubkeys instead of using only matching pubkey
 */
export function decryptMessage(opts={data: '', iv: '', privkey: '', authorPubkey: '', pubkeys: [], tryAllKeys: false }) {
  const data = opts?.data
  const iv = opts?.iv
  const privkey = opts?.privkey
  const authorPubkey =  opts?.authorPubkey
  const pubkeys = opts?.pubkeys
  const tryAllKeys = opts?.tryAllKeys

  const ourPubkey = privToPub(privkey)
  const ivBytes = Buffer.from(iv, 'base64')
  const sortedPubkeys = pubkeys.sort(pkData => {
    const pubkey = pkData.split('|', 2)[0]
    return pubkey == ourPubkey ? -1 : 0
  }).filter(pkData => {
    if (tryAllKeys) return true
    const pubkey = pkData.split('|', 2)[0]
    return pubkey == ourPubkey ? -1 : 0
  })

  for(var i = 0; i < sortedPubkeys.length; i++) {
    try {
      const pubkeyData = sortedPubkeys[i]
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
  let encryptedHex = ''
  for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.toString('hex', i, i+CHUNK_SIZE)
    const cipheriv = crypto.createCipheriv('aes-256-cbc', key, iv)
    const updatedHex = cipheriv.update(chunk, 'hex', 'hex')
    const finalHex = cipheriv.final('hex')
    encryptedHex += (updatedHex || '') + (finalHex || '')
  }
  return Buffer.from(encryptedHex, 'hex').toString('base64')
}

/**
 * @param {String} data base64 encoded encrypted message
 * @param {Buffer | Uint8Array} key 
 * @param {Buffer | Uint8Array} iv 
 */
function decryptData(data, key, iv, opts={ inputEncoding: 'base64', outputEncoding: 'utf8' }) {
  const inputEncoding = opts?.inputEncoding || 'base64'
  const outputEncoding = opts?.outputEncoding || 'utf8'
  const dataBytes = Buffer.from(data, inputEncoding === 'binary' ? undefined : inputEncoding)
  let decryptedHex = ''
  const HEX_CHUNK_SIZE = CHUNK_SIZE+1

  for(var i = 0; i < dataBytes.length; i += HEX_CHUNK_SIZE) {
    const chunk = dataBytes.toString('hex', i, i + HEX_CHUNK_SIZE)
    const decipheriv = crypto.createDecipheriv('aes-256-cbc', key, iv)
    const updatedHex = decipheriv.update(chunk, 'hex', 'hex')
    const finalHex = decipheriv.final('hex')
    decryptedHex += (updatedHex || '') + (finalHex || '')
  }

  if (outputEncoding !== 'hex') {
    if (outputEncoding === 'binary') return Buffer.from(decryptedHex, 'hex')
    return Buffer.from(decryptedHex, 'hex').toString(outputEncoding)
  }

  return decryptedHex
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
  const response = { data: '', iv: '', authorPubkey: '', pubkeys: [].map(String) }
  if (dataStr) {
    const deserialized = JSON.parse(dataStr)
    response.data = deserialized?.d
    response.iv = deserialized?.iv
    response.authorPubkey = deserialized?.pk
    response.pubkeys = deserialized?.pks
  }

  return response
}


/**
 * @param {Object} opts
 * @param {File} opts.file
 * @param {String} opts.privkey 32bit hex string
 * @param {String[] | String} opts.pubkeys 33bit secp256k1 pubkey/s
 */
export async function encryptImage(opts={ file: '', privkey: '', pubkeys: '' }) {
  const file = opts?.file
  const privkey = opts?.privkey
  const pubkeysOpt = opts?.pubkeys
  
  const ourPubkey = privToPub(privkey)
  const _pks = Array.isArray(pubkeysOpt) ? [...pubkeysOpt] : [pubkeysOpt]
  const pks = _pks.filter((pk, index, list) => list.indexOf(pk) === index)
  if (pks.length <= 0) pks.push(ourPubkey)

  const globalKey = Buffer.from(crypto.randomFillSync(new Uint8Array(32)))
  const iv = crypto.randomFillSync(new Uint8Array(16))  

  const arrayBuffer = await file.arrayBuffer()
  const encrypted = encryptData(arrayBuffer, globalKey, iv)

  const pubkeys = pks.map(pubkey => {
    const ourPriv = secp.etc.hexToBytes(privkey)
    const otherPub = secp.etc.hexToBytes(pubkey)
    const sharedPoint = secp.getSharedSecret(ourPriv, otherPub)
    const sharedX = sharedPoint.slice(1, 33)
    const sharedSecret = encryptData(globalKey.toString('hex'), Buffer.from(sharedX), iv)
    return `${pubkey}|${sharedSecret}`
  })

  const encryptedBytes = Buffer.from(encrypted, 'base64')
  const encryptedBlob = new Blob([encryptedBytes])
  const newFile = new nativeFileAPI.File([encryptedBlob], file?.name, { type: 'application/octet-stream' })
  return { file: newFile, authorPubkey: ourPubkey, pubkeys, iv: Buffer.from(iv).toString('base64') }
}

/**
 * @param {Object} opts
 * @param {File} opts.file
 * @param {String} opts.iv base64 encoded initialization vector(IV)
 * @param {String} opts.privkey 32bit hex encoded privkey
 * @param {String} opts.authorPubkey 33bit hex encoded pubkey of the author
 * @param {String[]} opts.pubkeys combined pubkey & sharedSecret delimited by a bar '|'. Use pubkey directly if no sharedSecret is provided
 * @param {Boolean} opts.tryAllKeys will attempt to decrypt using other pubkeys instead of using only matching pubkey
 */
export async function decryptImage(opts={ file: null, privkey: '', pubkeys: '', tryAllKeys: false }) {
  const file = opts?.file
  const iv = opts?.iv
  const privkey = opts?.privkey
  const authorPubkey =  opts?.authorPubkey
  const pubkeys = opts?.pubkeys
  const tryAllKeys = opts?.tryAllKeys

  const ourPubkey = privToPub(privkey)
  const ivBytes = Buffer.from(iv, 'base64')
  const sortedPubkeys = pubkeys.sort(pkData => {
    const pubkey = pkData.split('|', 2)[0]
    return pubkey == ourPubkey ? -1 : 0
  }).filter(pkData => {
    if (tryAllKeys) return true
    const pubkey = pkData.split('|', 2)[0]
    return pubkey == ourPubkey ? -1 : 0
  })

  const arrayBuffer = await file?.arrayBuffer()

  for(var i = 0; i < sortedPubkeys.length; i++) {
    try {
      const pubkeyData = sortedPubkeys[i]
      let [pubkey, sharedSecret, ..._] = pubkeyData.split('|', 2)

      if (pubkey == ourPubkey) {
        pubkey = authorPubkey
      }
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
      const decryptedData = decryptData(arrayBuffer, key, ivBytes, { inputEncoding: 'binary', outputEncoding: 'binary' })
      const decryptedBlob = new Blob([decryptedData])
      const decryptedFile = new nativeFileAPI.File([decryptedBlob], file?.name)
      return decryptedFile
    } catch (error) {
      console.error(error)
      continue
    }
  }
}


/**
 * @param {Object} messagePayload
 * @param {File} messagePayload.file
 * @param {String} messagePayload.iv base64 encoded initialization vector(IV)
 * @param {String} messagePayload.authorPubkey 33bit hex encoded pubkey of the author
 * @param {String[]} messagePayload.pubkeys combined pubkey & sharedSecret delimited by a bar '|'. Use pubkey directly if no sharedSecret is provided
 */
export async function compressEncryptedImage(messagePayload) {
  const file = messagePayload?.file
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileB64 = fileBuffer.toString('base64')
  const serializedPayload = {
    data: fileB64,
    iv: messagePayload?.iv,
    pk: messagePayload?.authorPubkey,
    pks: messagePayload?.pubkeys,
  }
  const bytes = Buffer.from(JSON.stringify(serializedPayload))
  const blob = new Blob([bytes])
  const newFile = new nativeFileAPI.File([blob], file?.name, { type: 'application/octet-stream' })
  return newFile
}

/**
 * @param {File} file 
 */
export async function decompressEncryptedImage(file) {
  const arrayBuffer = await file.arrayBuffer()
  const payload = Buffer.from(arrayBuffer).toString('utf8')
  const parsedPayload = JSON.parse(payload)
  const encryptedFileBytes = Buffer.from(parsedPayload?.data, 'base64')
  const encryptedFileBlob = new Blob([encryptedFileBytes])
  const encryptedFile = new nativeFileAPI.File([encryptedFileBlob], file?.name)

  const response = {
    file: [].map(() => new nativeFileAPI.File())[0],
    authorPubkey: '',
    pubkeys: [].map(String),
  }
  response.file = encryptedFile
  response.iv = parsedPayload?.iv
  response.authorPubkey = parsedPayload?.pk
  response.pubkeys = parsedPayload?.pks

  return response
}

/**
 * Encrypt wallet name using wallet hash
 */
export function encryptWalletName (walletName, walletIndex) {
  const walletHash = Store.getters['global/getVault'][walletIndex].wallet.bch.walletHash
  const walletHashCode = Uint8Array.from(walletHash).slice(0, 32)
  const iv = Uint8Array.from(walletHash).slice(32, 48)
  return encryptData(walletName, Buffer.from(walletHashCode), iv)
}

/**
 * Decrypt retrieved wallet name using wallet hash
 */
export function decryptWalletName (encryptedWalletName, walletHash) {
  const walletHashCode = Uint8Array.from(walletHash).slice(0, 32)
  const iv = Uint8Array.from(walletHash).slice(32, 48)
  return decryptData(encryptedWalletName, Buffer.from(walletHashCode), iv)
}

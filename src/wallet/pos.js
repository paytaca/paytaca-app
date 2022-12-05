import * as crypto from 'crypto'
import Watchtower from 'watchtower-cash-js'
// import axios from 'axios'
// export const backend = axios.create({
//   baseURL: 'http://localhost:8000/api',
// })

export const backend = (new Watchtower()).BCH._api

/**
 * 
 * @param {Object} data 
 * @param {String} data.wallet_hash
 * @param {Number} data.posid
 * @param {Number} [data.branch_id]
 * @param {Object} [data.linked_device]
 * @param {String} [data.linked_device.link_code]
 * @param {String} [data.linked_device.name]
 * @param {String} [data.linked_device.device_model]
 * @param {String} [data.linked_device.os]
 * @param {Boolean} data.linked_device.is_suspended
 * @param {Object} [data.linked_device.unlink_request]
 * @param {Number} data.linked_device.unlink_request.id
 * @param {Boolean} data.linked_device.unlink_request.force
 * @param {Number} data.linked_device.unlink_request.nonce
 * @param {String} data.linked_device.unlink_request.signature
 * @param {String} data.linked_device.unlink_request.updated_at
 */
export function parsePosDeviceData(data) {
  const response = {
    walletHash: data?.wallet_hash,
    posid: data?.posid,
    name: data?.name,
    branchId: data?.branch_id,
    linkedDevice: {
      linkCode: data?.linked_device?.link_code,
      name: data?.linked_device?.name,
      deviceModel: data?.linked_device?.device_model,
      os: data?.linked_device?.os,
      isSuspended: data?.linked_device?.is_suspended,
      unlinkRequest: {
        id: data?.linked_device?.unlink_request?.id,
        force: data?.linked_device?.unlink_request?.force,
        nonce: data?.linked_device?.unlink_request?.nonce,
        signature: data?.linked_device?.unlink_request?.signature,
        updatedAt: data?.linked_device?.unlink_request?.updated_at,
      },
    },
    isLinked(){
      return Boolean(this.linkedDevice.linkCode)
    }
  }

  return response
}

export class PosDeviceManager {
  static DEFAULT_STORAGE_KEY = 'posDevices'
  constructor(opts) {
    this._STORAGE_KEY = opts?.STORAGE_KEY || PosDeviceManager.DEFAULT_STORAGE_KEY
  }

  get STORAGE_KEY() {
    if (typeof this._STORAGE_KEY !== 'string') return PosDeviceManager.DEFAULT_STORAGE_KEY
    return this._STORAGE_KEY
  }

  fetchPosDevices() {
    const posDevices = []
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY))
      if (Array.isArray(data)) {
        data.forEach(posDevice => {
          if (Number.isInteger(posDevice?.posid)) {
            posDevices.push({ posid: posDevice.posid, name: posDevice?.name || '' })
          }
        })
      }
    } catch(error) {
      console.error(error)
    }
    return this.cleanPosDevicesData(posDevices)
  }

  /**
   * 
   * @param {{ posid: String, name: String }[]} posDevices
   */
  savePosDevices(posDevices) {
    const cleanedData = this.cleanPosDevicesData(posDevices)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedData))
  }

  /**
   * 
   * @param {{ posid: String, name: String }[]} posDevices
   */
  cleanPosDevicesData(posDevices) {
    if (!Array.isArray(posDevices)) return []
    // 1st filter remove non integer posid
    // 2nd filter remove duplicate posids
    return posDevices
      .filter(posDevice => Number.isInteger(posDevice?.posid))
      .filter((e, i, s) => s.findIndex(e1 => e1?.posid === e?.posid) === i)
      .filter(posDevice => posDevice?.posid >= 0)
  }
}

/**
 * 
 * @param {Number} posId 
 */
export function padPosId(posId, digits=4) {
  let val = String(posId)
  while(val.length < digits) {
    val = "0" + val
  }
  return val
}

/**
 * 
 * @param {{walletHash: String, xPubKey: String, posId: Number }} data 
 * @param {{ compressed: Boolean }} opts
 * @param {Boolean} compressed
 */
export function createQrCodeData(data, opts) {
  if (!data?.walletHash || !data?.xPubKey || !Number.isInteger(data?.posId) || data.posId < 0) return null

  if (!opts?.compressed) return JSON.stringify(data)

  // const compressedWalletHash = Buffer.from(data.walletHash, 'hex').toString('base64')
  // const xPubKeyBytes = new Buffer(base58_to_binary(data.xPubKey.substring(4)))
  // const compressedxPubKey = xPubKeyBytes.toString('base64')
  // const compressedPosId = data.posId === 0
  //   ? '0'
  //   : Buffer.from(data.posId.toString(16), 'hex').toString('base64')
  // const compressedData = [compressedWalletHash, compressedxPubKey, compressedPosId].join('|')
  const compressedData2 = [data.walletHash, data.xPubKey, data.posId].join('|')
  return compressedData2
}


/**
 * 
 * @param {String} data 
 */
export function parsePOSLabel(data) {
  const response = { walletHash: '', posId: -1 }
  const match = data.match(/^([0-9a-fA-F]{64})-(\d+)$/)
  if (match.length >= 3) {
    response.walletHash = match[1]
    response.posId = Number(match[2])
  }
  return response
}

export const aes = {
  generateKey() {
    return {
      password: crypto.randomBytes(16).toString('hex'),
      iv: crypto.randomBytes(8).toString('hex'),
    }
  },
  encrypt(data, password, iv) {
    const CHUNK_SIZE = 15
    const bytes = Buffer.from(data)
    let encrypted = ''
    for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.toString('hex', i, i+CHUNK_SIZE)
      const cipheriv = crypto.createCipheriv('aes-256-cbc', password, iv)
      cipheriv.update(chunk, 'hex', 'hex')
      encrypted += cipheriv.final('hex')
    }
    return encrypted
  },

  decrypt(encryptedData='', password, iv) {
    const CHUNK_SIZE = 32
    let decryptedData = ''
    for(var i = 0; i < encryptedData.length; i += CHUNK_SIZE) {
      const chunk = encryptedData.substring(i, i + CHUNK_SIZE)
      const decipheriv = crypto.createDecipheriv('aes-256-cbc', password, iv)
      decipheriv.update(chunk, 'hex', 'utf8')
      decryptedData += decipheriv.final('utf8')
    }
    return decryptedData
  }
}

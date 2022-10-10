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
          if (Number.isInteger(posDevice?.id)) {
            posDevices.push({ id: posDevice.id, name: posDevice?.name || '' })
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
   * @param {{ id: String, name: String }[]} posDevices
   */
  savePosDevices(posDevices) {
    const cleanedData = this.cleanPosDevicesData(posDevices)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedData))
  }

  /**
   * 
   * @param {{ id: String, name: String }[]} posDevices
   */
  cleanPosDevicesData(posDevices) {
    if (!Array.isArray(posDevices)) return []
    // 1st filter remove non integer id
    // 2nd filter remove duplicate ids
    return posDevices
      .filter(posDevice => Number.isInteger(posDevice?.id))
      .filter((e, i, s) => s.findIndex(e1 => e1?.id === e?.id) === i)
      .filter(posDevice => posDevice?.id >= 0)
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
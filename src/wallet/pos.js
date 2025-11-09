import { decodePrivateKeyWif, binToHex, secp256k1, utf8ToBin, sha256 } from '@bitauth/libauth'
import * as crypto from 'crypto'
import axios from 'axios'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

import { Store } from 'src/store'
import { Wallet } from 'src/wallet'
import { getCurrentWalletStorageKey, getWalletStorageKey, getWalletHash } from 'src/utils/wallet-storage'

import packageInfo from '../../package.json'

export const backend = axios.create({
  baseURL: process.env.MAINNET_WATCHTOWER_BASE_URL
})

backend.interceptors.request.use(async (config) => {
  const wallet = Store.getters['global/getWallet']('bch')
  config.headers["X-Paytaca-App-Version"] = packageInfo.version
  config.headers['wallet-hash'] = wallet.walletHash
  if (config.authorize) {
    const token = await authToken.get()
    config.headers.Authorization = `Token ${token}`
  }
  return config
})


const AUTH_TOKEN_STORAGE_KEY_PREFIX = 'paytacapos-admin-auth-key'

/**
 * Get wallet-specific storage key for PaytacaPOS auth token
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {string} Storage key with wallet hash
 */
function getAuthTokenStorageKey(walletHash = null) {
  if (walletHash) {
    return getWalletStorageKey(AUTH_TOKEN_STORAGE_KEY_PREFIX, walletHash)
  }
  return getCurrentWalletStorageKey(AUTH_TOKEN_STORAGE_KEY_PREFIX)
}

export const authToken = Object.freeze({
  /**
   * @param {Wallet} wallet 
   */
  async generate(wallet) {
    wallet.BCH.getPrivateKey(`0/0`)
    const response = await backend.get(`auth/otp/main`)
    const otp = response?.data?.otp

    const privkey = await wallet.BCH.getPrivateKey(`0/0`)
    const pubkey = await wallet.BCH.getPublicKey(`0/0`)
    const signature = await signMessage(privkey, otp)

    const body = {
      wallet_hash: wallet.BCH.walletHash,
      signature: signature,
      public_key: pubkey
    }
    const loginResponse = await backend.post(`/auth/login/main`, body)
    // Use wallet hash from the wallet parameter for storage key
    const storageKey = getAuthTokenStorageKey(wallet.BCH.walletHash)
    await SecureStoragePlugin.set({ key: storageKey, value: loginResponse.data.token })
    return loginResponse.data.token
  },
  save(value, walletHash = null) {
    const key = getAuthTokenStorageKey(walletHash)
    return SecureStoragePlugin
      .set({ key, value })
      .then(success => { return success.value })
  },
  get(walletHash = null) {
    const key = getAuthTokenStorageKey(walletHash)
    return SecureStoragePlugin.get({ key })
      .then(token => {
        return token?.value
      })
      .catch(async error => {
        // Fallback: try old global key for backward compatibility with existing users
        try {
          const oldToken = await SecureStoragePlugin.get({ key: AUTH_TOKEN_STORAGE_KEY_PREFIX })
          // If found, trigger migration (async, non-blocking)
          // Get walletHash from parameter or from store
          const targetWalletHash = walletHash || getWalletHash()
          if (oldToken?.value && targetWalletHash) {
            const newKey = getAuthTokenStorageKey(targetWalletHash)
            SecureStoragePlugin.set({ key: newKey, value: oldToken.value })
              .catch(e => console.warn('Failed to migrate PaytacaPOS token:', e))
          }
          return oldToken?.value || null
        } catch (e) {
          // No token found in either location
          return null
        }
      })
  },
  delete(walletHash = null) {
    const key = getAuthTokenStorageKey(walletHash)
    return SecureStoragePlugin.remove({ key })
  },
  /**
   * Delete authentication token for a specific wallet hash
   * @param {string} walletHash - The wallet hash to delete token for
   */
  deleteForWallet(walletHash) {
    if (walletHash) {
      const key = getAuthTokenStorageKey(walletHash)
      return SecureStoragePlugin.remove({ key })
    }
  },
})

export async function signMessage(wif, message) {
  const messageHash = await sha256.hash(utf8ToBin(message))
  const privateKeyBin = decodePrivateKeyWif(wif).privateKey
  if (typeof privateKeyBin === 'string') throw new Error(privateKeyBin)

  const signatureBin = secp256k1.signMessageHashDER(privateKeyBin, messageHash)
  if (typeof signatureBin === 'string') throw new Error(signatureBin)
  const signature = binToHex(signatureBin)
  return signature
}


/**
 * 
 * @param {Object} data 
 * @param {String} data.wallet_hash
 * @param {Number} data.posid
 * @param {Number} [data.merchant_id]
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
    merchantId: data?.merchant_id,
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


/**
 * @typedef {Object} SalesReportData
 * @property {Number} month
 * @property {Number} year
 * @property {Number} day
 * @property {Number} total
 * @property {String} currency
 * @property {Number} total_market_value
 * @property {Number} count
 * @property {String} ft_category
 */

/**
 * @param {SalesReportData[]} reports
 */
export function summarizeSalesReports(reports) {
  /** @type {Map<String, Number>} */
  let tokenAmountsMap = new Map();
  let total = 0;
  let totalMarketValue = 0;
  let count = 0;
  let currency;
  let hasMissingMarketValue = false;

  for (const reportData of reports) {
    count += reportData.count;
    if (reportData.ft_category) {
      tokenAmountsMap.set(
        reportData.ft_category,
        (tokenAmountsMap.get(reportData.ft_category) || 0) + reportData.total
      );
    } else {
      total += reportData.total;
    }

    if (!reportData.currency || !reportData.total_market_value || hasMissingMarketValue) {
      hasMissingMarketValue = true;
      currency = null;
      totalMarketValue = null;
    } else {
      currency = reportData.currency;
      totalMarketValue += reportData.total_market_value;
    }
  }

  const tokenAmounts = [];
  for (const [ft_category, amount] of tokenAmountsMap.entries()) {
    tokenAmounts.push({ category: ft_category, amount })
  }

  total = Number(total.toFixed(8));
  totalMarketValue = Number(totalMarketValue?.toFixed?.(2));
  return { total, currency, totalMarketValue, tokenAmounts, count }
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

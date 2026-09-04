import { encodeGroupState, decodeGroupState } from 'ts-mls'
import { defaultClientConfig } from 'ts-mls/clientConfig.js'
import { Store } from 'src/store'

const DB_NAME = 'PaytacaMLS'
const STORE_NAME = 'groupStates'
const DB_VERSION = 1

function getCurrentWalletHash() {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch { return null }
}

function walletKey(groupId) {
  const hash = getCurrentWalletHash()
  return hash ? `${hash}:${groupId}` : groupId
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveMlsState(mlsGroupId, clientState) {
  const bytes = encodeGroupState(clientState)
  const db = await openDb()
  const key = walletKey(mlsGroupId)
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(bytes, key)
      if (key !== mlsGroupId) {
        tx.objectStore(STORE_NAME).delete(mlsGroupId)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadMlsState(mlsGroupId, impl, clientConfig) {
  const db = await openDb()
  try {
    const key = walletKey(mlsGroupId)
    let bytes = null
    try {
      bytes = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(key)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    } catch (err) {
      console.warn('[MLS] loadMlsState read failed:', err?.message || err)
    }
    if (!bytes && key !== mlsGroupId) {
      try {
        bytes = await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly')
          const req = tx.objectStore(STORE_NAME).get(mlsGroupId)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      } catch (err) {
        console.warn('[MLS] loadMlsState legacy-key read failed:', err?.message || err)
      }
    }
    if (!bytes) return null
    const result = decodeGroupState(bytes, 0)
    if (!result) return null
    return { ...result[0], clientConfig: defaultClientConfig }
  } finally {
    db.close()
  }
}

export async function removeMlsState(mlsGroupId) {
  const db = await openDb()
  const key = walletKey(mlsGroupId)
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      if (key !== mlsGroupId) {
        tx.objectStore(STORE_NAME).delete(mlsGroupId)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}


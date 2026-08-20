import { encodeGroupState, decodeGroupState } from 'ts-mls'
import { defaultClientConfig } from 'ts-mls/clientConfig.js'

const DB_NAME = 'PaytacaMLS'
const STORE_NAME = 'groupStates'
const DB_VERSION = 1

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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(bytes, mlsGroupId)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function loadMlsState(mlsGroupId, impl, clientConfig) {
  const db = await openDb()
  const bytes = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(mlsGroupId)
    req.onsuccess = () => { db.close(); resolve(req.result) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
  if (!bytes) return null
  const result = decodeGroupState(bytes, 0)
  if (!result) return null
  return { ...result[0], clientConfig: defaultClientConfig }
}

export async function removeMlsState(mlsGroupId) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(mlsGroupId)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}
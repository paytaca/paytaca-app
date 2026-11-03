const store = new Map()
const getErrors = new Map()
const state = { resets: 0 }

export const SECURE_STORAGE_KEY_MISSING = 'SECURE_STORAGE_KEY_MISSING'
export const SECURE_STORAGE_DECRYPT_ERROR = 'SECURE_STORAGE_DECRYPT_FAILED'
export const SECURE_STORAGE_PREFIX = 'cap_sec_'

export const SecureStoragePlugin = {
  _store: store,
  _getErrors: getErrors,
  _state: state,
  async get ({ key }) {
    if (getErrors.has(key)) throw new Error(getErrors.get(key))
    if (!store.has(key)) throw new Error('Item with given key does not exist')
    return { value: store.get(key) }
  },
  async set ({ key, value }) {
    store.set(key, value)
    return { value }
  },
  async remove ({ key }) {
    store.delete(key)
    return { value: true }
  },
  async keys () {
    return { value: [...store.keys()] }
  },
  async clear () {
    store.clear()
    return { value: true }
  }
}

export async function resetAesKeyForRecovery () {
  state.resets++
  getErrors.clear()
  return { value: true }
}

export default { SecureStoragePlugin }

const store = new Map()

export const SECURE_STORAGE_KEY_MISSING = 'SECURE_STORAGE_KEY_MISSING'
export const SECURE_STORAGE_DECRYPT_ERROR = 'SECURE_STORAGE_DECRYPT_FAILED'
export const SECURE_STORAGE_PREFIX = 'cap_sec_'

export const SecureStoragePlugin = {
  _store: store,
  async get ({ key }) {
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

export default { SecureStoragePlugin }

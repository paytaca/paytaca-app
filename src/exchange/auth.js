import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
const TOKEN_STORAGE_KEY = 'ramp-p2p-auth-key'

export function saveAuthToken (value) {
  SecureStoragePlugin.set({ TOKEN_STORAGE_KEY, value }).then(success => { return success.value })
}

export function getAuthToken () {
  return new Promise((resolve, reject) => {
    SecureStoragePlugin.get({ TOKEN_STORAGE_KEY })
      .then(token => {
        resolve(token.value)
      })
      .catch(error => {
        console.error('Item with specified key does not exist:', error)
        resolve(null)
      })
  })
}

export function deleteAuthToken () {
  SecureStoragePlugin.remove({ TOKEN_STORAGE_KEY })
}

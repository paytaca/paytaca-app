const store = new Map()
const state = { available: true, sets: 0 }

export const EscrowKey = {
  _store: store,
  _state: state,
  _setAvailable (value) { state.available = value },
  async isAvailable () {
    return { value: state.available }
  },
  async get ({ key }) {
    return { value: store.has(key) ? store.get(key) : null }
  },
  async set ({ key, value }) {
    state.sets++
    store.set(key, value)
    return { value: true }
  },
  async remove ({ key }) {
    store.delete(key)
    return { value: true }
  }
}

export default EscrowKey

export function addIdentity ({ commit }, data) {
  commit('addIdentity', data)
}

export function appendMessage ({ commit }, data) {
  commit('appendMessage', data)
}

export function deleteHistory ({ commit }, topic) {
  commit('deleteHistory', topic)
}

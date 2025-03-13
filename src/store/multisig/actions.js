export function saveTemplateDraft ({ commit }, templateDraft) {
  commit('saveTemplateDraft', templateDraft)
}

export function deleteTemplateDraft ({ commit }, templateDraft) {
  commit('deleteTemplateDraft', templateDraft)
}

export function commitTemplateDraft ({ commit }, { address, lockingBytecode, template }) {
  commit('commitTemplateDraft', { address, lockingBytecode, template })
  // TODO: save template in watchtower
}

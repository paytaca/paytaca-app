export function saveTemplateDraft (state, templateDraft) {
  state.templateDraft = templateDraft
}

export function deleteTemplateDraft (state) {
  state.templateDraft = null
}

export function commitTemplateDraft (state, { address, lockingBytecode, template }) {
  state.templates.push({ address, lockingBytecode, template })
}

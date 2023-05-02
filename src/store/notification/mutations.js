/**
 * 
 * @param {Object} state 
 * @param {Object} payload
 * @param {String} payload.id
 * @param {String} [payload.badge]
 * @param {String} [payload.title]
 * @param {String} [payload.subtitle]
 * @param {String} [payload.body]
 * @param {Map<String, any>} payload.data
 */
export function setOpenedNotification(state, payload) {
  // Using Object.assign to capture any undocumented data in payload
  Object.assign(state.openedNotification, payload, {
    id: payload?.id,
    badge: payload?.badge,
    title: payload?.title,
    subtitle: payload?.subtitle,
    body: payload?.body,
    data: payload?.data,
  }, state.openedNotification)
}

export function clearOpenedNotification(state) {
  state.openedNotification = {
    badge: '',
    title: '',
    subtitle: '',
    body: '',
    id: '',
    data: { type: '' }
  }
}

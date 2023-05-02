/**
 * @typedef {Object} AndroidNotificationPayload
 * @property {String} id
 * @property {Object} data values passed as extra is stored here. some extra values are
 * 
 * @typedef {Object} IOSNotificationPayload
 * @property {String} id
 * @property {String} badge
 * @property {String} title
 * @property {String} subtitle
 * @property {String} body
 * @property {Object} data values passed as extra is stored here
 * 
 * @typedef {Object} NotificationAction
 * @property {String} actionId
 * @property {AndroidNotificationPayload | IOSNotificationPayload} notification
 */

export default function () {
  return {
    /** @type {AndroidNotificationPayload | IOSNotificationPayload} */
    openedNotification: {
      /**
       * It's better to use global state like vuex/pinia (than to implement another) for a
       * global event bus functionality.
       * https://stackoverflow.com/a/70442724/13022138
       * 
       * - This object should contain the latest opened push notification
       * - Should immediately be cleared after proper routing & displaying of info
       */
      // ios
      badge: '',
      title: '',
      subtitle: '',
      body: '',

      // ios & android
      id: '',
      data: {
        type: '',
        // <key> : <value> pairs taken from `extra` data
      }
    },
  }
}

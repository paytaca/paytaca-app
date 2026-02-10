import { Notify } from "quasar"

export function raiseNotifySuccess (message, timeout = 3000, position = 'bottom') {
  Notify.create({
    type: 'positive',
    timeout,
    message,
    position
  })
}

export function raiseNotifyError (message, timeout = 3000, position = 'bottom') {
  Notify.create({
    type: 'negative',
    color: 'red-4',
    timeout,
    message,
    position
  })
}
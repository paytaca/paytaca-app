import { Notify } from "quasar"

export function raiseNotifySuccess (message, timeout=3000, position='bottom', icon='check-circle') {
  Notify.create({
    type: 'positive',
    timeout,
    message,
    position,
    icon
  })
}

export function raiseNotifyError (message, timeout=3000, position='bottom', icon='error') {
  Notify.create({
    type: 'negative',
    color: 'red-4',
    timeout,
    message,
    position,
    icon
  })
}
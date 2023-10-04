import { types } from './getters'

const NotificationTypes = types()

export async function handleOpenedNotification(context) {
  const $router = this.$router
  const route = await context.dispatch('getOpenedNotificationRoute')
  if (route) $router.push(route)
}

export function getOpenedNotificationRoute(context) {
  const $router = this.$router
  const openedNotification = context.getters['openedNotification']

  let route = null
  switch(openedNotification?.data?.type) {
    case(NotificationTypes.MAIN_TRANSACTION):
    case(NotificationTypes.SBCH_TRANSACTION):
      route = { name: 'transaction-index' }
      break
    case(NotificationTypes.ANYHEDGE_MATURED):
    case(NotificationTypes.ANYHEDGE_CONTRACT_CANCELLED):
    case(NotificationTypes.ANYHEDGE_OFFER_SETTLED):
    case(NotificationTypes.ANYHEDGE_REQUIRE_FUNDING):
    case(NotificationTypes.ANYHEDGE_MUTUAL_REDEMPTION_UPDATE):
    case(NotificationTypes.ANYHEDGE_MUTUAL_REDEMPTION_COMPLETE):
      route = { name: 'app-any-hedge' }
      break
    case (NotificationTypes.MARKETPLACE_ORDER_STATUS_UPDATE):
    case (NotificationTypes.MARKETPLACE_ORDER_INCOMING_CALL):
      route = {
        name: 'app-marketplace-order',
        params: { orderId: openedNotification?.data?.order_id },
      }
      break
  }

  try {
    return $router.resolve(route)
  } catch (error) { console.error(error) }
  return null
}

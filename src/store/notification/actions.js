import { types } from './getters'

const NotificationTypes = types()

export async function handleOpenedNotification(context) {
  const $router = this.$router
  const openedNotification = context.getters['openedNotification']
  const route = await context.dispatch('getOpenedNotificationRoute')

  const multiWalletIndex = parseInt(openedNotification?.data?.multi_wallet_index)
  const currentWalletIndex = context.rootGetters['global/getWalletIndex']
  if (Number.isSafeInteger(multiWalletIndex) && multiWalletIndex !== currentWalletIndex) {
    console.log(
      'current wallet index:', currentWalletIndex,
      'push notification wallet index:', multiWalletIndex,
      'redirecting to push notification page',
    )
    $router.push({ name: 'push-notification-router' })
    return
  }

  if (route) $router.push(route)
}

export function getOpenedNotificationRoute(context) {
  const $router = this.$router
  const openedNotification = context.getters['openedNotification']
  console.log('openedNotification', openedNotification)

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
    case (NotificationTypes.MARKETPLACE_CHAT_UNREAD_MESSAGES):
      route = {
        name: 'app-marketplace-order',
        params: { orderId: openedNotification?.data?.order_id },
      }
      break
    case(NotificationTypes.PAYMENT_REQUEST):
      route = {
        name: 'transaction-send',
        query: Object.assign({
          assetId: openedNotification?.data?.assetId || 'bch',
          network: openedNotification?.data?.network ||'BCH',
          tokenType: openedNotification?.data?.token_type || undefined,
          simpleNft: openedNotification?.data?.simple_nft,
          symbol: openedNotification?.data?.symbol,
          amount: openedNotification?.data?.amount,
          fixed: openedNotification?.data?.fixed,
          recipient: openedNotification?.data?.recipient,
          image: openedNotification?.data?.image,
          commitment: openedNotification?.data?.commitment,
          capability: openedNotification?.data?.capability,
          paymentUrl: String(openedNotification?.data?.payment_url),
          useAddressPath: openedNotification?.data?.use_address_path,
        }),
      }
      break
  }

  try {
    console.log('route', route)
    return $router.resolve(route)
  } catch (error) { console.error(error) }
  return null
}

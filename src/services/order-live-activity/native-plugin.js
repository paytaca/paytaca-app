import { registerPlugin } from '@capacitor/core'

/**
 * @typedef {import('./model').OrderLiveActivity} OrderLiveActivityPayload
 *
 * @typedef {Object} OrderLiveActivityPlugin
 * @property {() => Promise<{ supported:Boolean, platform:String, version:Number }>} isSupported
 * @property {(options:{ activity:OrderLiveActivityPayload }) => Promise<{ id:String }>} start
 * @property {(options:{ activity:OrderLiveActivityPayload }) => Promise<{ id:String }>} update
 * @property {(options:{ id:String, activity?:OrderLiveActivityPayload }) => Promise<void>} end
 * @property {() => Promise<void>} endAll
 * @property {(eventName:'activityPushToken', cb:(data:{ token:String, activityId:String, kind:String, orderId:Number|String })=>void) => Promise<any>} addListener
 */

const OrderLiveActivity = registerPlugin('OrderLiveActivity', {
  web: () => import('./native-plugin-web').then(m => new m.OrderLiveActivityWeb()),
})

export default OrderLiveActivity

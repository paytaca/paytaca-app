import { backend } from "./backend";

/**
 * @param {Object} opts
 * @param {Number} [opts.shopId]
 * @param {Number} [opts.storefrontId]
 */
export function getCashbackCampaign(opts) { 
  const params = {
    shop_id: opts?.shopId || undefined,
    storefront_id: opts?.storefrontId || undefined,
  }
  return backend.get(`cashback/get_campaign/`, { params })
    .then(response => {
      return parseCashbackCampaign(response?.data)
    })
}

/**
 * @param {Object} data 
 * @param {Number} data.id
 * @param {String} data.name
 * @param {String} data.description
 * @param {String} data.start_period
 * @param {String} data.end_period
 * @param {Number} data.first_cashback_percentage
 * @param {Number} data.succeeding_cashback_percentage
 * @param {Number} data.per_merchant_cashback_limit
 * @param {Number} data.per_customer_cashback_limit
 * @param {Number} data.per_transaction_cashback_limit
 */
export function parseCashbackCampaign(data) {
  const result = Object.assign({
    startPeriod: new Date(data?.start_period),
    endPeriod: new Date(data?.end_period),
    firstCashbackPercentage: data?.first_cashback_percentage,
    succeedingCashbackPercentage: data?.succeeding_cashback_percentage,
    perMerchantCashbackLimit: data?.per_merchant_cashback_limit,
    perCustomerCashbackLimit: data?.per_customer_cashback_limit,
    perTransansactionCashbackLimit: data?.per_transaction_cashback_limit,
  }, data)

  return result
}

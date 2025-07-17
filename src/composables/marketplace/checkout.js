import { Checkout } from "src/marketplace/objects";
import { computed, toValue } from "vue";
/**
 * @typedef {import("vue").Ref<Checkout>} CheckoutRef
 */



/**
 * @param {Checkout | CheckoutRef} checkoutDataOrRef
 */
export function useCheckoutDetails(checkoutDataOrRef) {
  const checkout = computed(() => toValue(checkoutDataOrRef))
  const isStorePickup = computed(() => {
    return checkout.value?.deliveryType === Checkout.DeliveryTypes.STORE_PICKUP &&
      checkout.value.payment?.deliveryFee == 0
  })

  const checkoutCurrency = computed(() => checkout.value?.currency?.symbol)
  const checkoutBchPrice = computed(() => {
    return checkout?.value?.payment?.bchPrice?.price || undefined
  })

  const checkoutAmounts = computed(() => {
    const parseBch = num => Math.floor(num * 10 ** 8) / 10 ** 8
    const data = {
      subtotal: { currency: checkout.value?.cart?.markupSubtotal || 0, bch: 0 },
      deliveryFee: { currency: checkout.value?.payment?.deliveryFee || 0, bch: 0 },
      total: { currency: checkout.value?.total, bch: 0 },
      totalPaymentsSent: { currency: parseFloat(checkout.value.totalPaymentsSent), bch: 0 },
      balanceToPay: { currency: parseFloat(checkout.value?.balanceToPay), bch: 0 },
      change: { currency: checkout.value?.change, bch: 0 },
    }

    if (!isNaN(checkoutBchPrice.value)) {
      data.subtotal.bch = parseBch(data.subtotal.currency / checkoutBchPrice.value)
      data.deliveryFee.bch = parseBch(data.deliveryFee.currency / checkoutBchPrice.value)
      data.total.bch = parseBch(data.total.currency / checkoutBchPrice.value)
      data.totalPaymentsSent.bch = parseBch(data.totalPaymentsSent.currency / checkoutBchPrice.value)
      data.balanceToPay.bch = parseBch(data.balanceToPay.currency / checkoutBchPrice.value)
      data.change.bch = parseBch(data.change.currency / checkoutBchPrice.value)
    } else {
      data.subtotal.bch = null
      data.deliveryFee.bch = null
      data.total.bch = null
      data.totalPaymentsSent.bch = null
      data.balanceToPay.bch = null
      data.change.bch = null
    }
    return data
  })


  return {
    isStorePickup,
    checkoutCurrency,
    checkoutBchPrice,
    checkoutAmounts,
  }
}

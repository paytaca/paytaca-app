<template>
  <div class="q-pt-md text-right q-px-lg">
    <q-icon name="close" color="red" size="sm" @click="$emit('close')"/>
  </div>
  <div class="text-center text-bold q-pt-sm">
    Cashout Order #{{ order.id }}
  </div>

  <div class="q-mx-lg q-my-md" style="font-size: 13px" v-if="order">
    <div class="row">
      <div class="text-bold col">Payout Amount</div>
      <div class="text-right col">{{ order.payout_amount }} BCH</div>
    </div>
    <div class="row">
      <div class="text-bold col-4">Payout Address</div>
      <div class="text-right col-8">{{ arrangeAddressText(order.payout_address) }} <q-icon name="content_copy" color="grey" size="sm" @click="copyToClipboard(order.payout_address)"/></div>
    </div>

    <div class="row q-pt-md">
      <div class="text-bold col-4">Created At</div>
      <div class="text-right col-8">{{ arrangeDate(order.created_at) }}</div>
    </div>
    <div class="row">
      <div class="text-bold col">Payment Method</div>
      <div class="text-right col">{{ arrangePaymentMethod(order.payment_method) }}</div>
    </div>


    <div class="row q-pt-md">
      <div class="text-bold col-4">Transaction ID</div>
      <div class="text-right col-8 text-primary text-underline" style="overflow: auto;">{{ order.transactions.outputs[0].txid}} <q-icon name="content_copy" color="grey" size="sm" @click="copyToClipboard(order.payout_address)"/></div>
    </div>
    <div class="row">
      <div class="text-bold col">Status</div>
      <div class="text-right col" style="font-size: 15px;">{{ order.status }}</div>
    </div>
  </div>
</template>
<script>

export default {
  data() {
    return {

    }
  },
  props: {
    order: Object
  },
  emits: ['close'],
  mounted () {
    // console.log('order: ', this.order)
  },
  methods: {
    arrangeAddressText (address) {
      return address.slice(0, 15) + '.....' + address.slice(50)
    },
    arrangeDate (date) {
      const createDate = new Date(date)

      return createDate.toLocaleDateString()
    },
    arrangePaymentMethod (method) {
      let text = `${method.payment_type.full_name}: `

      method.values.forEach(val => {
        text =  `${text}(${val.value}) `
      })
      return text
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    },
  }
}
</script>

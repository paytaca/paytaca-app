<template>
  <div class="q-pt-md text-right q-px-lg">
    <q-icon name="close" color="red" size="sm" @click="$emit('close')"/>
  </div>
  <div class="text-center text-bold q-pt-sm">
    Cashout Order #{{ order.id }}
  </div>

  <div class="q-mx-lg q-my-md q-pb-md" style="font-size: 13px;" v-if="order">
    <div>
      <div class="text-grey text-bold">Payout Amount</div>
      <div style="font-size: 15px">{{ order.payout_amount }} {{ order.currency }} ({{ Number(order.payout_details?.total_bch_amount) }} BCH)</div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Payment Method</div>
      <div style="font-size: 15px;"><span class="text-bold">{{ order?.payment_method.payment_type.full_name }}:</span> {{ arrangePaymentMethod(order.payment_method) }}</div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Payout Address</div>
      <div class="text-primary text-underline" style="overflow-wrap: anywhere; font-size: 15px;">
        <span @click="openURL(explorerLink('address'))">{{ order.payout_address }}</span>
      </div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Transaction ID</div>
      <div class="text-primary text-underline" style="overflow-wrap: anywhere; font-size: 15px;">
        <span @click="openURL(explorerLink())">{{ order.transactions.outputs[0].txid}}</span>
      </div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Status</div>
      <div class="text-bold" style="font-size: 15px;">{{ order.status }}</div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">{{ statusTimestampLabel }}</div>
      <div style="font-size: 15px;">{{ statusTimestamp }}</div>
    </div>
  </div>
</template>
<script>
import { openURL } from 'quasar'
import { getExplorerLink, getExplorerAddressLink } from 'src/utils/send-page-utils'

export default {
  data() {
    return {

    }
  },
  props: {
    order: Object
  },
  computed: {
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    statusTimestampLabel () {
      switch(this.order.status) {
        case "PENDING":
          return "Created At"
        case "PROCESSING":
          return "Processed At"
        case "COMPLETED":
          return "Completed At"
      }
    },
    statusTimestamp () {
      let timestamp = null

      switch(this.order.status) {
        case "PENDING":
          timestamp = this.order.created_at
          break
        case "PROCESSING":
          timestamp = this.order.processed_at
          break
        case "COMPLETED":
          timestamp = this.order.completed_at
          break
      }
      return this.arrangeDate(timestamp)
    }
  },
  emits: ['close'],
  methods: {
    openURL,
    explorerLink (linkType='txid') { // linktype: ['txid', 'address']
      if (linkType === 'txid') {
        const txid = this.order?.transactions?.outputs?.[0]?.txid
        return getExplorerLink(txid || '')
      }
      const address = this.order?.payout_address?.replace('bitcoincash:', '') || ''
      return getExplorerAddressLink(address)
    },
    arrangeAddressText (address) {
      return address.slice(0, 15) + '.....' + address.slice(50)
    },
    arrangeDate (date) {
      const createDate = new Date(date)

      // return createDate.toLocaleDateString()
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(createDate)
    },
    arrangePaymentMethod (method) {
      const methodFields = method.values?.map(val => val.value)
      return methodFields.join(' | ')
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
<style lang="scss" scoped>
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}
.lg-font-size {
  font-size: large;
}
</style>

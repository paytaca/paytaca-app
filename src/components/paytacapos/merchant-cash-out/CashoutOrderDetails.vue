<template>
  <div class="q-pt-md text-right q-px-lg">
    <q-icon name="close" color="red" size="sm" @click="$emit('close')"/>
  </div>
  <div class="text-center text-bold q-pt-sm">
    Cashout Order #{{ order.id }}
  </div>

  <div class="q-mx-lg q-my-md q-pb-md" style="font-size: 13px;" v-if="order">
    <div class="">
      <div class="text-grey text-bold">Payout Amount</div>
      <div style="font-size: 15px">{{ order.payout_amount }} BCH</div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Payout Address</div>
      <div style="overflow-wrap: anywhere; font-size: 15px;">
        <span @click="copyToClipboard(order.payout_address)">{{ order.payout_address }}</span>
        <q-icon name="content_copy" color="grey" size="sm" @click="copyToClipboard(order.payout_address)"/>
        <q-icon name="open_in_new" color="grey" size="sm" @click="openURL(explorerLink('address'))"/>
      </div>
      <!-- <div class="text-right" style="overflow-wrap: anywhere;">{{ arrangeAddressText(order.payout_address) }} <q-icon name="content_copy" color="grey" size="sm" @click="copyToClipboard(order.payout_address)"/></div> -->
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Created At</div>
      <div style="font-size: 15px;">{{ arrangeDate(order.created_at) }}</div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Payment Method</div>
      <div style="font-size: 15px;"><span class="text-bold">{{ order?.payment_method.payment_type.full_name }}:</span> {{ arrangePaymentMethod(order.payment_method) }}</div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Transaction ID</div>
      <div class="text-primary text-underline" style="overflow-wrap: anywhere; font-size: 15px;">
        <span @click="copyToClipboard(order.payout_address)">{{ order.transactions.outputs[0].txid}}</span>
        <q-icon name="content_copy" color="grey" size="sm" @click="copyToClipboard(order.payout_address)"/>
        <q-icon name="open_in_new" color="grey" size="sm" @click="openURL(explorerLink())"/>
      </div>
    </div>

    <div class="q-pt-sm">
      <div class="text-grey text-bold">Status</div>
      <div class="text-bold" style="font-size: 15px;">{{ order.status }}</div>
    </div>
  </div>
</template>
<script>
import { openURL } from 'quasar'

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
  },
  emits: ['close'],
  methods: {
    openURL,
    explorerLink (linkType='txid') { // linktype: ['txid', 'address']
      let url = ''

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash'
      } else {
        url = 'https://blockchair.com/bitcoin-cash'
      }

      if (linkType === 'txid') {
        const txid = this.order?.transactions.outputs[0].txid
        url = this.isChipnet ? `${url}/tx/` : `${url}/transaction/`
        return `${url}${txid}`
      } else {
        const address = this.order?.payout_address.replace('bitcoincash:', '')
        url = `${url}/address/`
        return `${url}${address}`
      }

      // if (this.transaction.asset.id.split('/')[0] === 'ct') {
      //   url = 'https://explorer.bitcoinunlimited.info/tx/'
      // }
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
      // let text = `${method.payment_type.full_name}: `
      let text = ''

      method.values.forEach(val => {
        text =  `${text}[ ${val.value} ] `
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

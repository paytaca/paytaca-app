<template>
  <div v-if="isloaded">
    <div
      class="q-mx-md text-bow"
      :class="getDarkModeClass(darkMode)">
      <div class="row justify-between sm-font-size subtext q-pt-xs q-mx-md q-px-sm">
        <span class="text-nowrap q-ml-xs" :style="balanceExceeded ? 'color:red' : ''">
          {{ $t('Fee') }}: {{ satoshiToBch(fees?.total) }} BCH<br>
          {{ $t('Balance') }}: {{ bchBalance }} BCH
        </span>
        <div class="text-red q-mr-xs" v-if="errorMessage"><q-icon name="o_info" /> <span>{{ errorMsg }}</span></div>
      </div>
      <div class="row q-pt-md q-px-sm">
        <q-btn
          :loading="loadConfirmButton"
          rounded
          label='confirm'
          class="q-space text-white q-mx-md button"
          :disable="disableButton || this.balanceExceeded === true"
          @click="$emit('confirm')"
        />
      </div>
      <div class="row q-pt-sm q-pb-md q-px-sm">
        <q-btn
          :loading="loadDeclineButton"
          :disable="disableButton"
          rounded
          label='decline'
          class="q-space text-white q-mx-md"
          color="white"
          text-color="black"
          @click="$emit('cancel')"
        />
      </div>
    </div>
  </div>
</template>
<script>
import { bus } from 'src/wallet/event-bus.js'
import { backend } from 'src/exchange/backend'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAppealCooldown, formatCurrency, satoshiToBch, bchToFiat } from 'src/exchange'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      order: null,
      ad: null,
      isloaded: false,
      byFiat: false,
      amount: null,
      price: null,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      loadConfirmButton: false,
      loadDeclineButton: false,
      fees: null
    }
  },
  props: {
    data: Object,
    errorMessage: String
  },
  emits: ['back', 'confirm', 'cancel'],
  computed: {
    balance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    balanceExceeded () {
      if (this.order?.ad?.trade_type === 'BUY' && this.order?.is_ad_owner) return false

      const transferAmount = satoshiToBch(this.order?.trade_amount + this.fees?.total)
      return (transferAmount > parseFloat(this.balance))
    },
    fiatAmount () {
      return bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(2)
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    errorMsg () {
      const msg = this.errorMessage.split(' ').map(word => {
        if (word.includes('_')) {
          return word.split('_').map(subWord =>
            subWord.charAt(0).toUpperCase() + subWord.slice(1)
          ).join(' ')
        } else {
          return word
        }
      }).join(' ')
      return msg
    },
    disableButton () {
      return this.loadConfirmButton || this.loadDeclineButton
    }
  },
  watch: {
    byFiat () {
      this.updateInput()
    }
  },
  async mounted () {
    this.order = this.data?.order
    this.fetchFees()
    this.price = this.formatCurrency(this.order?.locked_price, this.order?.ad?.fiat_currency?.symbol)
    this.updateInput()
    this.isloaded = true
  },
  methods: {
    formatCurrency,
    getDarkModeClass,
    satoshiToBch,
    formattedPlt (value) {
      return getAppealCooldown(value)
    },
    updateInput () {
      let amount = 0
      if (this.byFiat) {
        amount = bchToFiat(satoshiToBch(this.order?.trade_amount), this.order?.price)
      } else {
        amount = satoshiToBch(this.order?.trade_amount)
      }
      this.amount = Number(amount)
    },
    async fetchFees () { // need backend update
      const url = `/ramp-p2p/order/${this.order?.id}/contract/fees/`
      await backend.get(url, { authorize: true })
        .then(response => {
          this.fees = response.data
        })
        .catch(error => {
          if (error.response) {
            this.fees = { total: 3000 } // REMOVE THIS LATER
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          } else {
            console.error(error)
            bus.emit('network-error')
          }
        })
    }
  }
}
</script>
<style scoped>
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

<template>
  <div v-if="isloaded">
    <div
      class="q-mx-md text-bow"
      :class="getDarkModeClass(darkMode)">
      <div class="sm-font-size subtext q-pt-xs q-mx-md q-px-sm">
        <span class="text-nowrap q-ml-xs" :style="balanceExceeded ? 'color:red' : ''">
          {{ $t('Balance') }}: {{ bchBalance }} BCH
        </span>
      </div>
      <div class="row q-pt-md q-px-sm">
        <q-btn
          rounded
          label='confirm'
          class="q-space text-white q-mx-md button"
          :disable="balanceExceeded === true"
          @click="$emit('confirm')"
        />
      </div>
      <div class="row q-pt-sm q-pb-md q-px-sm">
        <q-btn
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAppealCooldown, formatCurrency } from 'src/exchange'

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
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100
    }
  },
  props: {
    data: Object
  },
  emits: ['back', 'confirm', 'cancel'],
  computed: {
    balance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    balanceExceeded () {
      if (this.order?.ad?.trade_type === 'BUY' && this.order?.is_ad_owner) return false
      return (parseFloat(this.order.crypto_amount) > parseFloat(this.balance))
    },
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)).toFixed(2)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(2)
    },
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    }
  },
  watch: {
    byFiat () {
      this.updateInput()
    }
  },
  async mounted () {
    this.order = this.data?.order
    this.price = this.formatCurrency(this.order?.locked_price, this.order?.ad?.fiat_currency?.symbol)
    this.updateInput()
    this.isloaded = true
  },
  methods: {
    formatCurrency,
    getDarkModeClass,
    formattedPlt (value) {
      return getAppealCooldown(value)
    },
    updateInput () {
      let amount = 0
      if (this.byFiat) {
        amount = parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)
      } else {
        amount = parseFloat(this.order.crypto_amount)
      }
      this.amount = Number(amount)
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

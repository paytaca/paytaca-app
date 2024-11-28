<template>
  <div v-if="isloaded">
    <div
      class="q-mx-md text-bow"
      :class="getDarkModeClass(darkMode)">
      <div class="row justify-between sm-font-size subtext q-pt-xs q-mx-md q-px-sm">
        <span class="text-nowrap q-ml-xs" :style="balanceExceeded ? 'color:red' : ''">
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
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      loadConfirmButton: false,
      loadDeclineButton: false
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

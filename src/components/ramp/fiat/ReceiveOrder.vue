<template>
  <div v-if="isloaded">
    <div
      class="q-mx-md text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="`height: ${minHeight}px;`">
      <q-btn
        flat
        icon="arrow_back"
        class="button button-text-primary"
        style="position: fixed; left: 20px; z-index: 3;"
        :style="$q.platform.is.ios ? 'top: 135px; ' : 'top: 110px; '"
        :class="getDarkModeClass(darkMode)"
        @click="$emit('back')"
      />
      <q-pull-to-refresh @refresh="$emit('refresh')">
        <div class="sm-font-size subtext q-pt-sm q-mx-md q-px-sm">
          <span>Balance: </span>
          <span class="text-nowrap q-ml-xs">
            {{ $parent.bchBalance }} BCH
          </span>
        </div>
        <div class="row q-pt-md q-mx-md q-px-sm">
          <q-btn
            rounded
            label='confirm'
            class="q-space text-white q-mx-md button"
            @click="$emit('confirm')"
          />
        </div>
        <div class="row q-pt-sm q-pb-md q-mx-md q-px-sm">
          <q-btn
            rounded
            label='decline'
            class="q-space text-white q-mx-md"
            color="white"
            text-color="black"
            @click="$emit('cancel')"
          />
        </div>
      </q-pull-to-refresh>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getAppealCooldown } from 'src/wallet/ramp'

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
  emits: ['back', 'confirm', 'cancel', 'refresh'],
  computed: {
    fiatAmount () {
      return (parseFloat(this.order.crypto_amount) * parseFloat(this.order.locked_price)).toFixed(2)
    },
    cryptoAmount () {
      return (this.fiatAmount / this.order.locked_price).toFixed(2)
    }
  },
  watch: {
    byFiat () {
      this.updateInput()
    }
  },
  async mounted () {
    this.order = this.data?.order
    this.price = this.$parent.formattedCurrency(this.order?.locked_price, this.order?.ad?.fiat_currency?.symbol)
    this.updateInput()
    this.isloaded = true
  },
  methods: {
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
    },
    onViewPeer (data) {
      this.peerInfo = data
      this.showPeerProfile = true
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

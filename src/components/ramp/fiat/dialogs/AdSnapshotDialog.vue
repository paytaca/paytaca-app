<template>
  <q-dialog full-width no-shake position="bottom" v-model="showDialog" @before-hide="$emit('back')">
    <q-card bordered flat class="br-15 q-pt-sm q-mx-none pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div v-if="loading">
        <div class="row justify-center q-mb-lg" style="margin-top: 50px">
          <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
        </div>
      </div>
      <div v-else>
        <div class="text-center text-weight-bold text-uppercase lg-font-size q-mt-md">Ad Snapshot</div>
        <div class="text-center sm-font-size subtext">Ad Reference ID: {{ snapshot?.ad }}</div>
        <q-separator class="q-my-sm" :dark="darkMode"/>
        <div class="sm-font-size q-px-md q-py-sm q-mb-lg">
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Price Type</span>
            <span class="text-nowrap q-ml-xs">
              {{ snapshot?.price_type }}
            </span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg">
            <span>{{ snapshot?.price_type === 'FIXED' ? 'Fixed' : 'Floating' }} Price</span>
            <span class="text-nowrap q-ml-xs">
              {{ snapshot?.price_type === 'FIXED' ? formattedCurrency(snapshot?.fixed_price, snapshot?.fiat_currency?.symbol) : Number(snapshot?.floating_price) }}{{ snapshot?.price_type === 'FLOATING' ? '%': '' }}
            </span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Price</span>
            <span class="text-nowrap q-ml-xs">
              {{ formattedCurrency(snapshot?.price, snapshot?.fiat_currency?.symbol) }}
            </span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Trade Limit</span>
            <span class="text-nowrap q-ml-xs">
              {{ formattedCurrency(snapshot?.trade_floor) }} - {{ formattedCurrency(snapshot?.trade_ceiling) }} BCH
            </span>
          </div>
          <div class="row justify-between no-wrap q-mx-lg">
            <span>Apppealable after</span>
            <span class="text-nowrap q-ml-xs">
              {{ appealCooldown(snapshot?.appeal_cooldown_choice).label }}
            </span>
          </div>
          <div class="q-px-sm q-pb-sm" v-if="snapshot?.payment_types?.length > 0">
            <div class="sm-font-size q-px-md">Payment Types</div>
            <div class="q-px-md q-gutter-sm q-pt-xs">
              <q-badge v-for="method, index in snapshot?.payment_types" :key="index" rounded outline :color="snapshot?.trade_type === 'SELL'? darkMode ? 'blue-13' : 'blue' : darkMode ? 'red-13' : 'red'">
                {{ method }}
              </q-badge>
            </div>
          </div>
        </div>
        <!--<div class="q-py-md q-mx-lg q-pb-sm">
          <div class="md-font-size text-weight-bold q-px-md">Order Payment Methods</div>
          <div v-if="selectedPaymentMethods?.length === 0" class="q-px-md sm-font-size">~ No payment method selected ~</div>
          <div v-for="(method, index) in selectedPaymentMethods" :key="index">
            <div class="q-px-sm q-my-sm">
              <q-card flat bordered class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                <q-expansion-item
                  :label="method.payment_type"
                  expand-separator>
                  <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode, '', 'bg-grey-2')">
                    <q-card-section class="text-left">
                      <div class="row">
                        <div class="col">
                          <div>{{ method.account_name }}</div>
                          <div>{{ method.account_identifier }}</div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </q-expansion-item>
              </q-card>
            </div>
          </div>
        </div> -->
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { formatCurrency, getAppealCooldown } from 'src/wallet/ramp'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { backend } from 'src/wallet/ramp/backend'
import { bus } from 'src/wallet/event-bus'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      theme: this.$store.getters['global/theme'],
      paymentMethods: ['Paypal', 'Gcash', 'BPI'],
      showDialog: true,
      loading: true,
      snapshot: {}
    }
  },
  components: {
    ProgressLoader
  },
  props: {
    snapshotId: Number,
    orderId: Number
  },
  emits: ['back'],
  async mounted () {
    await this.fetchAdSnapshot()
    this.loading = false
  },
  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    formattedCurrency (value, currency = null) {
      if (currency) {
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    appealCooldown (appealCooldownChoice) {
      return getAppealCooldown(appealCooldownChoice)
    },
    async fetchAdSnapshot () {
      await backend.get('/ramp-p2p/ad-snapshot',
        { authorize: true, params: { order_id: this.orderId } }
      )
        .then(response => {
          this.snapshot = response.data
          this.showAdSnapshot = true
        })
        .catch(error => {
          console.error(error)
          if (error.response) {
            console.error(error.response)
            if (error.response.status === 403) {
              bus.emit('session-expired')
            }
          }
        })
    }
  }
}
</script>
<style scoped>
.lg-font-size {
  font-size: large;
}
.subtext {
  opacity: .5;
}
</style>

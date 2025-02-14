<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="`User Rewards`" class="apps-header" />

    <div
      class="row q-mx-lg q-gutter-y-md q-pt-lg justify-center text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}"
    >
      <div class="row justify-center q-gutter-y-xs" ref="points_div">
        <span class="col-12 text-center text-subtitle1">You currently have</span>
        <span class="col-12 text-center text-h5 text-bold">{{ points }} UP</span>
        <span class="q-mb-sm col-12 text-center">{{ pointsConvertion }}</span>

        <q-btn
          rounded
          class="button"
          label="Redeem Points"
          :disable="points === 0"
        />
      </div>

      <div class="row col-12 justify-center">
        <span class="text-h6">Points Earned</span>

        <q-tabs
          no-caps
          v-model="currentTab"
          class="col-12"
          :indicator-color="(isNotDefaultTheme(theme) && denomination !== $t('DEEM')) ? 'transparent' : ''"
          @click="adjustScrollAreaHeight"
        >
          <q-tab
            name="onetime"
            label="One-time Points"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
          />
          <q-tab
            name="recurring"
            label="Recurring Points"
            class="network-selection-tab"
            :class="getDarkModeClass(darkMode)"
          />
        </q-tabs>

        <q-separator />

        <q-tab-panels
          animated
          v-model="currentTab"
          class="row full-width"
        >
          <q-tab-panel name="onetime">
            <q-scroll-area ref="onetime">
              <div class="row q-gutter-x-sm q-gutter-y-md">
                <StatusChip :isCompleted="isReferralComplete" />
                <span class="col-10">
                  <span class="text-subtitle1">
                    20 UP from referral and after completing 1st transaction
                  </span>
                  <br/>
                  <span v-if="isReferralComplete" class="q-ml-sm">
                    earned on {{ referralCompleteDate }}
                  </span>
                  <span v-else class="q-ml-sm">
                    not yet earned
                  </span>
                </span>

                <StatusChip :isCompleted="isFirstSevenComplete" />
                <div class="col-10">
                  <span class="text-subtitle1">Points from first 7 transactions</span>

                  <div class="row q-gutter-y-sm q-mt-xs">
                    <div
                      v-for="(item, index) in firstSevenTransactions"
                      class="row col-12 q-gutter-x-sm"
                      :key="index"
                    >
                      <StatusChip
                        :isCompleted="item.ref_id !== '' && item.date != ''"
                        :index="index + 1"
                      />
                      <div class="col-10">
                        <template v-if="item.ref_id !== '' && item.date != ''">
                          Earned {{ item.points }} UP from {{ item.ref_id }}
                          last {{ item.date }}
                        </template>
                        <template v-else>
                          Not yet earned
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </q-scroll-area>
          </q-tab-panel>

          <q-tab-panel name="recurring">
            <q-scroll-area ref="recurring">
              <div>
                <span class="text-subtitle1">Points from Marketplace transactions</span>

                <div
                  v-if="marketplaceTransactions.length > 0"
                  class="row q-gutter-y-sm q-mt-xs"
                >
                  <div
                    v-for="(item, index) in marketplaceTransactions"
                    class="row q-gutter-y-sm"
                    :key="index"
                  >
                    <span class="q-pl-sm">{{ item.month }}</span>

                    <div
                      v-for="(order, i) in item.orders"
                      :key="i"
                    >
                      <span class="row q-pl-lg">
                        Earned 8 UP from Order #{{ order.order_id }} last {{ order.date }}
                      </span>
                    </div>
                  </div>
                </div>

                <span v-else class="q-mt-md row justify-center text-center text-subtitle1">
                  You do not have any Marketplace transactions yet.<br/><br/>
                  Order from the Marketplace to start earning points!
                </span>
              </div>
            </q-scroll-area>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { convertToBCH } from 'src/utils/denomination-utils'

import HeaderNav from 'src/components/header-nav'
import StatusChip from 'src/components/rewards/StatusChip.vue'

export default {
  name: 'UserRewards',

  components: {
    HeaderNav,
    StatusChip
  },

  data () {
    return {
      points: 0,
      currentTab: 'onetime',

      isReferralComplete: false,
      referralCompleteDate: null,
      isFirstSevenComplete: false,
      firstSevenTransactions: [
        { ref_id: '', date: '', points: 4 },
        { ref_id: '', date: '', points: 4 },
        { ref_id: '', date: '', points: 6 },
        { ref_id: '', date: '', points: 6 },
        { ref_id: '', date: '', points: 8 },
        { ref_id: '', date: '', points: 8 },
        { ref_id: '', date: '', points: 10 }
      ],

      // [{ month: '', orders: [{ order_id: '', date: '' }] }]
      marketplaceTransactions: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    fiatCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    bchMarketPrice () {
      if (!this.fiatCurrency) return 0
      return this.$store.getters['market/getAssetPrice']('bch', this.fiatCurrency)
    },
    pointsConvertion () {
      const fiat = this.points / 4
      const bch = convertToBCH(this.denomination, (fiat / this.bchMarketPrice))

      const finalFiat = `${fiat} ${this.fiatCurrency}`
      const finalBch = `${Number(bch) === 0 ? '0' : bch.toFixed(8)} ${this.denomination}`

      return `(${finalFiat} or ${finalBch})`
    }
  },

  mounted () {
    this.adjustScrollAreaHeight()
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    adjustScrollAreaHeight () {
      const vm = this

      const pointsDivHeight = vm.$refs.points_div.clientHeight
      let scrollAreaHeight = document.body.clientHeight - pointsDivHeight - 300
      if (vm.$q.platform.is.ios) {
        scrollAreaHeight -= 30
      }

      if (vm.currentTab === 'onetime') {
        vm.$refs.onetime.$el.setAttribute('style', `height: ${scrollAreaHeight}px;`)
      } else if (vm.currentTab === 'recurring') {
        vm.$refs.recurring.$el.setAttribute('style', `height: ${scrollAreaHeight}px;`)
      }
    }
  }
}
</script>

<style lang="scss">
.q-tab-panels {
  background: transparent;
}
</style>

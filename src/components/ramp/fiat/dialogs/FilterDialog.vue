<template>
    <!-- Filter orders -->
    <q-dialog v-model="filterOrder" persistent @before-hide="$emit('back')">
      <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
        <div class="q-mt-lg text-center text-weight-bold lg-font-size">Filter and Sort Orders</div>
        <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/>
        <div class="q-px-lg q-mx-sm">
          <!-- Sort by -->
          <div v-if="orderFilters.sort_by" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Sort By</div>
            <div class="q-ml-xs q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_by !== 'created_at'" @click="orderFilters.sort_by = 'created_at'">{{ type === 'filterOngoingOrder' ? 'Default: ' : '' }} Created at</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_by !== 'last_modified_at'" @click="orderFilters.sort_by = 'last_modified_at'">{{ type === 'filterCompletedOrder' ? 'Default: ' : '' }} Updated at</q-badge>
            </div>
          </div>
          <!-- Sort type -->
          <div v-if="orderFilters.sort_type" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Sort Type</div>
            <div class="q-ml-xs q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_type !== 'ascending'" @click="orderFilters.sort_type = 'ascending'">{{ type === 'filterOngoingOrder' ? 'Default: ' : '' }} Oldest</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_type !== 'descending'" @click="orderFilters.sort_type = 'descending'">{{ type === 'filterCompletedOrder' ? 'Default: ' : '' }} Newest</q-badge>
            </div>
          </div>
          <!-- Ownership -->
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Ownership</div>
            <div class="q-ml-xs q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderAllSelected('ownership')" @click="orderSetAllSelected('ownership')">Default: All</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.ownership.owned" @click="setOrderFilter('owned', !orderFilters.ownership.owned)">Owned by me</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.ownership.notOwned" @click="setOrderFilter('notOwned', !orderFilters.ownership.notOwned)">Not owned by me</q-badge>
            </div>
          </div>
          <!-- Trade type -->
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Trade Type</div>
            <div class="q-ml-xs q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderAllSelected('trade-type')" @click="orderSetAllSelected('trade-type')">Default: All</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.trade_type?.buy" @click="orderFilters.trade_type.buy = !orderFilters.trade_type?.buy">Buy Orders</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.trade_type?.sell" @click="orderFilters.trade_type.sell = !orderFilters.trade_type?.sell">Sell Orders</q-badge>
            </div>
          </div>
          <!-- Order status -->
          <div v-if="orderFilters.status" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Status</div>
            <div class="q-ml-xs q-gutter-sm q-pt-sm">
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!orderAllSelected('status')"
                @click="orderSetAllSelected('status')">
                Default: All
              </q-badge>
              <q-badge
                v-for="(status, index) in statuses"
                :key="index"
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!orderFilters.status?.includes(status.value)"
                @click="setOrderFilter('status', status?.value)">
                {{ status.label }}
              </q-badge>
            </div>
            <div class="q-ml-xs q-mt-xs q-gutter-sm" v-if="type !== 'filterCompletedOrder'">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!orderFilters.appealable"
                @click="orderFilters.appealable = !orderFilters.appealable">
                Appealable
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!orderFilters.not_appealable"
                @click="orderFilters.not_appealable = !orderFilters.not_appealable">
                Not Appealable
              </q-badge>
            </div>
          </div>
          <!-- Order payment types -->
          <div v-if="orderFilters.payment_types" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Payment Type</div>
            <div class="q-ml-xs q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!orderAllSelected('payment-type')"
                @click="orderSetAllSelected('payment-type')">
                Default: All
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                v-for="payment in paymentTypes"
                :outline="!orderFilters.payment_types?.includes(payment.id)"
                @click="setOrderFilter('payment-type', payment.id)"
                :key="payment.id">
                {{ payment.name }}
              </q-badge>
            </div>
          </div>
          <!-- Appealable cooldowns-->
          <div v-if="orderFilters.time_limits" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Appealable after</div>
            <div class="q-ml-xs q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!orderAllSelected('time-limit')"
                @click="orderSetAllSelected('time-limit')">
                Default: All
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                v-for="(value, index) in ptl"
                :outline="!orderFilters.time_limits?.includes(value)"
                @click="setOrderFilter('time-limit', value)"
                :key="index">
                {{ paymentTimeLimit(value) }}
              </q-badge>
            </div>
          </div>
        </div>
        <div class="text-center q-py-lg q-px-lg">
          <div class="row justify-center q-gutter-sm">
            <q-btn
              rounded
              no-caps
              label='Reset'
              class="col-grow button button-icon"
              :class="getDarkModeClass(darkMode)"
              outline
              @click="resetFilters('orders')"
            />
            <q-btn
              rounded
              no-caps
              label='Filter'
              class="col-grow button"
              @click="submitData()"
              v-close-popup
            />
          </div>
        </div>
      </q-card>
    </q-dialog>

    <!-- Filter Ads -->
    <q-dialog v-model="filterAd" @before-hide="$emit('back')">
      <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
        <!-- <div class="q-mt-md q-pl-md">
          <q-icon size="sm" name="close" v-close-popup @click="$emit('back')"/>&nbsp;
        </div> -->
        <div class="q-mt-md text-center text-weight-bold lg-font-size">Filter {{ type === 'filterSellAd' ? 'Sell' : 'Buy' }} Ads</div>
        <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/>

        <div class="q-px-lg q-mx-sm">
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Price Type</div>
            <div v-if="showPriceTypeHint" class="xs-font-size subtext">{{ hintMessage }}</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!storeAllSelected('price-type')"
                @click="storeSetAllSelected('price-type')">
                Default: All
              </q-badge>
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!storeFilters?.price_type?.fixed"
                @click="setStoreFilter('price-fixed')">
                Fixed
              </q-badge>
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!storeFilters?.price_type?.floating"
                @click="setStoreFilter('price-floating')">
                Floating
              </q-badge>
            </div>
          </div>

          <!-- Ad Payment Type -->
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Payment Type</div>
            <div v-if="showPaymentTypeHint" class="xs-font-size subtext">{{ hintMessage }}</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!storeAllSelected('payment-type')"
                @click="storeSetAllSelected('payment-type')">
                Default: All
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                v-for="payment in paymentTypes"
                :outline="!storeFilters.payment_types?.includes(payment.id)"
                @click="setStoreFilter('payment-type', payment.id)"
                :key="payment.id">
                {{ payment.name }}
              </q-badge>
            </div>
          </div>

          <!-- Ad Appealable Time -->
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Appealable Time</div>
            <div v-if="showTimeLimitHint" class="xs-font-size subtext">{{ hintMessage }}</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!storeAllSelected('time-limit')"
                @click="storeSetAllSelected('time-limit')">
                Default: All
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                v-for="(value, index) in ptl"
                :outline="!storeFilters.time_limits?.includes(value)"
                @click="setStoreFilter('time-limit', value)"
                :key="index">
                {{ paymentTimeLimit(value) }}
              </q-badge>
            </div>
          </div>

          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Price Order</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="storeFilters.sort_type !== 'ascending'" @click="storeFilters.sort_type = 'ascending'">{{ type === 'filterSellAd' ? 'Default: ' : '' }} Ascending</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="storeFilters.sort_type !== 'descending'" @click="storeFilters.sort_type = 'descending'">{{ type === 'filterBuyAd' ? 'Default: ' : '' }} Descending</q-badge>
            </div>
          </div>

          <div class="text-center q-pt-sm q-px-sm q-pb-lg">
            <div class="row justify-center q-gutter-sm q-pt-md">
              <q-btn
                rounded
                no-caps
                label='Reset'
                class="col-grow text-white"
                color="blue-6"
                outline
                @click="resetFilters('store')"
              />
              <q-btn
                rounded
                no-caps
                label='Filter'
                class="col-grow text-white"
                color="blue-6"
                @click="submitData()"
                v-close-popup
              />
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>
</template>

<script>
import { getAppealCooldown } from 'src/wallet/ramp'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { isProxy, toRaw } from 'vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      info: {},
      loading: false,
      dialogType: '',
      filterAd: false,
      filterOrder: false,
      ptl: [15, 30, 45, 60],
      paymentTypes: [],
      priceTypeOpts: ['FIXED', 'FLOATING'],
      storeFilters: {
        payment_types: [],
        time_limits: [15, 30, 45, 60],
        sort_type: 'ascending',
        price_type: {
          fixed: true,
          floating: true
        }
      },
      orderFilters: {
        sort_type: 'ascending',
        sort_by: 'created_at',
        status: [],
        appealable: true,
        not_appealable: true,
        payment_types: [],
        time_limits: [15, 30, 45, 60],
        ownership: {
          owned: true,
          notOwned: true
        },
        trade_type: {
          buy: true,
          sell: true
        }
      },
      ongoingStatuses: [
        { value: 'SBM', label: 'Submitted' },
        { value: 'CNF', label: 'Confirmed' },
        { value: 'ESCRW_PN', label: 'Escrow Pending' },
        { value: 'ESCRW', label: 'Escrowed' },
        { value: 'PD_PN', label: 'Paid Pending' },
        { value: 'PD', label: 'Paid' },
        { value: 'APL', label: 'Appealed' },
        { value: 'RLS_PN', label: 'Release Pending' },
        { value: 'RFN_PN', label: 'Refund Pending' }
      ],
      completedStatuses: [
        { value: 'CNCL', label: 'Canceled' },
        { value: 'RLS', label: 'Released' },
        { value: 'RFN', label: 'Refunded' }
      ],

      showPriceTypeHint: false,
      showPaymentTypeHint: false,
      showTimeLimitHint: false,
      hintMessage: 'At least one selected option is required'
    }
  },
  emits: ['back', 'submit', 'reset'],
  props: {
    type: String,
    filters: {},
    currency: String
  },
  computed: {
    statuses () {
      const vm = this
      if (vm.type === 'filterOngoingOrder') {
        return vm.ongoingStatuses
      }
      if (vm.type === 'filterCompletedOrder') {
        return vm.completedStatuses
      }
      return []
    }
  },
  async mounted () {
    this.paymentTypes = this.$store.getters['ramp/paymentTypes'](this.currency)
    this.checkDialogType()
  },
  methods: {
    getDarkModeClass,
    checkDialogType () {
      const vm = this
      let filters = JSON.parse(JSON.stringify(vm.filters))
      if (isProxy(filters)) {
        filters = toRaw(filters)
      }
      switch (vm.type) {
        case 'filterSellAd':
        case 'filterBuyAd':
          vm.filterAd = true
          vm.updateStoreFilters(filters)
          break
        case 'filterOngoingOrder':
        case 'filterCompletedOrder':
          vm.filterOrder = true
          vm.updateOrderFilters(filters)
          break
      }
    },
    submitData () {
      const vm = this
      switch (vm.type) {
        case 'filterSellAd':
        case 'filterBuyAd':
          vm.info = vm.storeFilters
          break
        case 'filterOngoingOrder':
        case 'filterCompletedOrder':
          vm.info = vm.orderFilters
          break
      }
      vm.$emit('submit', vm.info)
    },
    orderSetAllSelected (type) {
      const vm = this
      switch (type) {
        case 'ownership':
          vm.orderFilters.ownership.owned = true
          vm.orderFilters.ownership.notOwned = true
          break
        case 'trade-type':
          vm.orderFilters.trade_type.buy = true
          vm.orderFilters.trade_type.sell = true
          break
        case 'status':
          if (vm.type === 'filterOngoingOrder') {
            vm.orderFilters.status = vm.ongoingStatuses.map(e => e.value)
            vm.orderFilters.appealable = true
            vm.orderFilters.not_appealable = true
          }
          if (vm.type === 'filterCompletedOrder') {
            vm.orderFilters.status = vm.completedStatuses.map(e => e.value)
          }
          break
        case 'payment-type':
          vm.orderFilters.payment_types = vm.paymentTypes.map(e => e.id)
          break
        case 'time-limit':
          vm.orderFilters.time_limits = vm.ptl
          break
      }
    },
    orderAllSelected (type) {
      const vm = this
      switch (type) {
        case 'ownership':
          return vm.orderFilters.ownership.owned && vm.orderFilters.ownership.notOwned
        case 'trade-type':
          return vm.orderFilters.trade_type.buy && vm.orderFilters.trade_type.sell
        case 'status': {
          const allStatus = vm.orderFilters.status.length === vm.statuses.length
          const allAppeal = vm.orderFilters.appealable && vm.orderFilters.not_appealable
          if (vm.type === 'filterOngoingOrder') return allStatus && allAppeal
          return allStatus
        }
        case 'payment-type':
          return vm.orderFilters.payment_types.length === vm.paymentTypes?.length
        case 'time-limit':
          return vm.orderFilters.time_limits.length === vm.ptl.length
      }
    },
    setOrderFilter (type, value) {
      const vm = this
      switch (type) {
        case 'owned':
          vm.orderFilters.ownership.owned = value
          break
        case 'notOwned':
          vm.orderFilters.ownership.notOwned = value
          break
        case 'status':
          if (vm.orderFilters.status?.includes(value)) {
            this.orderFilters.status = this.orderFilters.status.filter(e => e !== value)
          } else {
            this.orderFilters.status.push(value)
          }
          break
        case 'payment-type': {
          const paymentTypes = vm.orderFilters.payment_types
          if (paymentTypes?.includes(value)) {
            vm.orderFilters.payment_types = paymentTypes.filter(e => e !== value)
          } else {
            vm.orderFilters.payment_types.push(value)
          }
          break
        }
        case 'time-limit': {
          const timeLimits = vm.orderFilters.time_limits
          if (timeLimits?.includes(value)) {
            vm.orderFilters.time_limits = timeLimits.filter(e => e !== value)
          } else {
            vm.orderFilters.time_limits.push(value)
          }
          break
        }
      }
    },
    storeSetAllSelected (type) {
      const vm = this
      switch (type) {
        case 'price-type':
          vm.storeFilters.price_type.fixed = true
          vm.storeFilters.price_type.floating = true
          break
        case 'payment-type':
          vm.storeFilters.payment_types = vm.paymentTypes.map(e => e.id)
          break
        case 'time-limit':
          vm.storeFilters.time_limits = vm.ptl
          break
      }
    },
    storeAllSelected (type) {
      const vm = this
      switch (type) {
        case 'price-type':
          return vm.storeFilters.price_type.fixed && vm.storeFilters.price_type.floating
        case 'payment-type':
          return vm.storeFilters.payment_types?.length === vm.paymentTypes?.length
        case 'time-limit':
          return vm.storeFilters.time_limits.length === vm.ptl.length
      }
    },
    setStoreFilter (type, value) {
      const vm = this
      switch (type) {
        case 'price-floating':
          if (vm.storeFilters.price_type.floating && !vm.storeFilters.price_type.fixed) {
            vm.showPriceTypeHint = true
            return
          }
          vm.storeFilters.price_type.floating = !vm.storeFilters?.price_type?.floating
          break
        case 'price-fixed':
          if (vm.storeFilters.price_type.fixed && !vm.storeFilters.price_type.floating) {
            vm.showPriceTypeHint = true
            return
          }
          vm.storeFilters.price_type.fixed = !vm.storeFilters?.price_type?.fixed
          break
        case 'payment-type': {
          const paymentTypes = vm.storeFilters.payment_types
          if (paymentTypes?.includes(value)) {
            if (paymentTypes.length === 1) {
              vm.showPaymentTypeHint = true
              return
            }
            vm.storeFilters.payment_types = paymentTypes.filter(e => e !== value)
          } else {
            vm.storeFilters.payment_types.push(value)
          }
          break
        }
        case 'time-limit': {
          const timeLimits = vm.storeFilters.time_limits
          if (timeLimits?.includes(value)) {
            if (timeLimits.length === 1) {
              vm.showTimeLimitHint = true
              return
            }
            vm.storeFilters.time_limits = timeLimits.filter(e => e !== value)
          } else {
            vm.storeFilters.time_limits.push(value)
          }
          break
        }
      }
    },
    updateStoreFilters (filters) {
      if (!filters) return
      this.storeFilters = filters
    },
    updateOrderFilters (filters) {
      if (!filters) return
      this.orderFilters = filters
      this.orderFilters.ownership = { ...filters.ownership }
      this.orderFilters.trade_type = { ...filters.trade_type }
    },
    paymentTimeLimit (timeValue) {
      return getAppealCooldown(timeValue).label
    },
    resetFilters (type) {
      let filters = null
      if (type === 'store') {
        const defaultPaymentTypes = this.$store.getters['ramp/paymentTypes'](this.currency)
        filters = {
          sort_type: this.$parent.transactionType === 'SELL' ? 'ascending' : 'descending',
          price_type: {
            fixed: true,
            floating: true
          },
          payment_types: defaultPaymentTypes.map(e => e.id),
          time_limits: [15, 30, 45, 60]
        }
        this.updateStoreFilters(filters)
      }

      if (type === 'orders') {
        if (this.$parent.statusType === 'ONGOING') {
          this.$store.commit('ramp/resetOngoingOrderFilters')
          filters = { ...this.$store.getters['ramp/ongoingOrderFilters'] }
        }
        if (this.$parent.statusType === 'COMPLETED') {
          this.$store.commit('ramp/resetCompletedOrderFilters')
          filters = { ...this.$store.getters['ramp/completedOrderFilters'] }
        }
        this.updateOrderFilters(filters)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
  .q-btn-toggle :deep(.q-btn:not(.q-btn--active)) {
    border: 1px solid white; /* Change #f00 to the color you want */
    background-color: transparent;
  }
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }
  .subtext {
    opacity: .5;
  }
  </style>

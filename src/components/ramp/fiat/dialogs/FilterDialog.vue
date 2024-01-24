<template>
    <!-- Filter orders -->
    <q-dialog v-model="filterOrder" @before-hide="$emit('back')">
      <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
        <div class="q-mt-md text-center text-weight-bold lg-font-size">Filter Orders</div>
        <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/>
        <div class="q-px-lg q-mx-sm">
          <!-- Trade type -->
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Trade Type</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.trade_type?.buy" @click="orderFilters.trade_type.buy = !orderFilters.trade_type?.buy">Buy</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.trade_type?.sell" @click="orderFilters.trade_type.sell = !orderFilters.trade_type?.sell">Sell</q-badge>
            </div>
          </div>
          <!-- Order status -->
          <div v-if="orderFilters.status" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Status</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!orderAllSelected('status')"
                @click="orderSetAllSelected('status')">
                All
              </q-badge>
              <q-badge
                v-for="(status, index) in statuses"
                :key="index"
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!orderFilters.status.includes(status.value)"
                @click="setOrderFilter('status', status?.value)">
                {{ status.label }}
              </q-badge>
            </div>
          </div>
          <!-- Order payment types -->
          <div v-if="orderFilters.payment_types" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Payment Type</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!orderAllSelected('payment-type')"
                @click="orderSetAllSelected('payment-type')">
                All
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                v-for="payment in paymentTypes"
                :outline="!orderFilters.payment_types.includes(payment.id)"
                @click="setOrderFilter('payment-type', payment.id)"
                :key="payment.id">
                {{ payment.name }}
              </q-badge>
            </div>
          </div>
          <!-- Time limits -->
          <div v-if="orderFilters.time_limits" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Time Limit</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!orderAllSelected('time-limit')"
                @click="orderSetAllSelected('time-limit')">
                All
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
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Ownership</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.ownership.owned" @click="setOrderFilter('owned', !orderFilters.ownership.owned)">Owned</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.ownership.notOwned" @click="setOrderFilter('notOwned', !orderFilters.ownership.notOwned)">Not Owned</q-badge>
            </div>
          </div>
          <div v-if="orderFilters.sort_type" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Sort Type</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_type !== 'ascending'" @click="orderFilters.sort_type = 'ascending'">Ascending</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_type !== 'descending'" @click="orderFilters.sort_type = 'descending'">Descending</q-badge>
            </div>
          </div>
          <div v-if="orderFilters.sort_by" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Sort By</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_by !== 'created_at'" @click="orderFilters.sort_by = 'created_at'">Created</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_by !== 'last_modified_at'" @click="orderFilters.sort_by = 'last_modified_at'">Last Modified</q-badge>
            </div>
          </div>
          <div class="q-pt-md" v-if="type !== 'filterCompletedOrder'">
            <div class="sm-font-size text-weight-bold">Misc</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!orderFilters.expired_only"
                @click="orderFilters.expired_only = !orderFilters.expired_only">
                Expired Only
              </q-badge>
            </div>
          </div>
          <div class="text-center q-pt-sm q-px-sm q-pb-lg">
            <div class="row q-gutter-sm q-pt-md">
              <q-btn
                rounded
                no-caps
                label='Reset'
                class="q-space button button-icon"
                :class="getDarkModeClass(darkMode)"
                outline
                @click="resetFilters('orders')"
              />
              <q-btn
                rounded
                no-caps
                label='Filter'
                class="q-space button"
                @click="submitData()"
                v-close-popup
              />
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <!-- Filter Ads -->
    <q-dialog v-model="filterAd" @before-hide="$emit('back')">
      <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
        <div class="q-mt-md q-pl-md">
          <q-icon size="sm" name="close" v-close-popup @click="$emit('back')"/>&nbsp;
        </div>
        <div class="text-center text-weight-bold lg-font-size">Filter Ads</div>
        <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/>

        <div class="q-px-lg q-mx-sm">
          <div v-if="storeFilters.priceTypes" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Price Type</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="isOutlined('FIXED','price-types')"
                @click="addFilterInfo('FIXED', 'price-types')">
                Fixed
              </q-badge>
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="isOutlined('FLOATING','price-types')"
                @click="addFilterInfo('FLOATING', 'price-types')">
                Floating
              </q-badge>
            </div>
          </div>
          <div v-if="storeFilters.selectedPaymentTypes" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Payment Type</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="storeFilters.selectedPaymentTypes.length < paymentTypes.length"
                @click="addFilterInfo('all', 'all-payment-type')">
                All
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="isOutlined(method,'payment-types')"
                @click="addFilterInfo(method, 'payment-types')"
                v-for="method in paymentTypes"
                :key="method.id">
                {{ method.name }}
              </q-badge>
            </div>
          </div>

          <div v-if="storeFilters.selectedPTL" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Time Limit</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="storeFilters.selectedPTL.length < ptl.length"
                @click="addFilterInfo('all', 'all-time-limits')">
                All
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="isOutlined(method, 'time-limits')"
                @click="addFilterInfo(method, 'time-limits')"
                v-for="(method, index) in ptl"
                :key="index">
                {{ paymentTimeLimit(method) }}
              </q-badge>
            </div>
          </div>

          <div v-if="storeFilters.priceOrder" class="q-pt-md">
            <div class="sm-font-size text-weight-bold">Price Order</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="storeFilters.priceOrder !== 'ascending'" @click="storeFilters.priceOrder = 'ascending'">Ascending</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="storeFilters.priceOrder !== 'descending'" @click="storeFilters.priceOrder = 'descending'">Descending</q-badge>
            </div>
          </div>

          <div class="text-center q-pt-sm q-px-sm q-pb-lg">
            <div class="row q-gutter-sm q-pt-md">
              <q-btn
                rounded
                no-caps
                label='Reset'
                class="q-space text-white"
                color="blue-6"
                outline
                @click="resetFilters('store')"
              />
              <q-btn
                rounded
                no-caps
                label='Filter'
                class="q-space text-white"
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
import { getPaymentTimeLimit } from 'src/wallet/ramp'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      authHeaders: this.$store.getters['ramp/authHeaders'],
      info: {},
      loading: false,
      dialogType: '',
      filterAd: false,
      filterOrder: false,
      ptl: [5, 15, 30, 60, 300, 720, 1440],
      paymentTypes: this.$store.getters['ramp/paymentTypes'],
      priceTypeOpts: ['FIXED', 'FLOATING'],
      storeFilters: {
        selectedPaymentTypes: [],
        selectedPTL: [5, 15, 30, 60, 300, 720, 1440],
        priceOrder: null,
        priceTypes: ['FIXED', 'FLOATING']
      },
      orderFilters: {
        sort_type: 'ascending',
        sort_by: 'created_at',
        status: [],
        expired_only: false,
        payment_types: [],
        time_limits: [5, 15, 30, 60, 300, 720, 1440],
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
      ]
    }
  },
  emits: ['back', 'submit'],
  props: {
    type: String,
    filters: {}
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
    this.checkDialogType()
  },
  methods: {
    getDarkModeClass,
    checkDialogType () {
      const vm = this
      switch (vm.type) {
        case 'filterAd':
          vm.filterAd = true
          vm.updateStoreFilters(JSON.parse(JSON.stringify(vm.filters)))
          break
        case 'filterOngoingOrder':
        case 'filterCompletedOrder':
          vm.filterOrder = true
          vm.updateOrderFilters(JSON.parse(JSON.stringify(vm.filters)))
          break
      }
    },
    submitData () {
      const vm = this
      switch (vm.type) {
        case 'filterAd':
          vm.info = {
            price_order: vm.storeFilters.priceOrder
          }
          if (vm.storeFilters.selectedPaymentTypes) {
            vm.info.payment_types = vm.storeFilters.selectedPaymentTypes
          }
          if (vm.storeFilters.selectedPTL) {
            vm.info.time_limits = vm.storeFilters.selectedPTL
          }
          if (vm.storeFilters.priceTypes) {
            vm.info.price_types = vm.storeFilters.priceTypes
          }
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
        case 'status':
          if (vm.type === 'filterOngoingOrder') {
            vm.orderFilters.status = vm.ongoingStatuses.map(e => e.value)
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
        case 'status':
          return vm.orderFilters.status.length === vm.statuses.length
        case 'payment-type':
          return vm.orderFilters.payment_types.length === vm.paymentTypes.length
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
          if (vm.orderFilters.status.includes(value)) {
            this.orderFilters.status = this.orderFilters.status.filter(e => e !== value)
          } else {
            this.orderFilters.status.push(value)
          }
          break
        case 'payment-type': {
          const paymentTypes = vm.orderFilters.payment_types
          if (paymentTypes.includes(value)) {
            vm.orderFilters.payment_types = paymentTypes.filter(e => e !== value)
          } else {
            vm.orderFilters.payment_types.push(value)
          }
          break
        }
        case 'time-limit': {
          const timeLimits = vm.orderFilters.time_limits
          if (timeLimits.includes(value)) {
            vm.orderFilters.time_limits = timeLimits.filter(e => e !== value)
          } else {
            vm.orderFilters.time_limits.push(value)
          }
          break
        }
      }
    },
    updateStoreFilters (filters) {
      if (!filters) return
      this.storeFilters.priceOrder = filters.price_order
      this.storeFilters.priceTypes = filters.price_types
      this.storeFilters.selectedPaymentTypes = filters.payment_types
      this.storeFilters.selectedPTL = filters.time_limits
    },
    updateOrderFilters (filters) {
      if (!filters) return
      this.orderFilters = filters
    },
    addFilterInfo (data, type = '') {
      let temp = null
      if (data === 'all') {
        if (type === 'all-payment-type') {
          this.storeFilters.selectedPaymentTypes = this.paymentTypes.map(p => p.id)
        }
        if (type === 'all-time-limits') {
          this.storeFilters.selectedPTL = this.ptl
        }
      } else {
        if (type === 'payment-types') {
          temp = this.storeFilters.selectedPaymentTypes
          if (temp.includes(data.id)) {
            if (temp.length > 1) {
              this.storeFilters.selectedPaymentTypes = this.storeFilters.selectedPaymentTypes.filter(p => p !== data.id)
            }
          } else {
            this.storeFilters.selectedPaymentTypes.push(data.id)
          }
        }
        if (type === 'time-limits') {
          temp = this.storeFilters.selectedPTL
          if (temp.includes(data)) {
            this.storeFilters.selectedPTL = this.storeFilters.selectedPTL.filter(p => p !== data)
          } else {
            this.storeFilters.selectedPTL.push(data)
          }
        }
        if (type === 'price-types') {
          temp = this.storeFilters.priceTypes
          if (temp.includes(data)) {
            if (temp.length > 1) {
              this.storeFilters.priceTypes = this.storeFilters.priceTypes.filter(p => p !== data)
            }
          } else {
            this.storeFilters.priceTypes.push(data)
          }
        }
      }
    },
    isOutlined (data, type = '') {
      if (type === 'payment-types') {
        const temp = this.storeFilters.selectedPaymentTypes
        return !temp.includes(data.id)
      }
      if (type === 'time-limits') {
        return !this.storeFilters.selectedPTL.includes(data)
      }
      if (type === 'price-types') {
        return !this.storeFilters.priceTypes.includes(data)
      }
    },
    paymentTimeLimit (timeValue) {
      return getPaymentTimeLimit(timeValue).label
    },
    resetFilters (type) {
      let filters = null
      if (type === 'store') {
        if (this.$parent.transactionType === 'SELL') {
          this.$store.commit('ramp/resetStoreSellFilters')
          filters = this.$store.getters['ramp/storeSellFilters']
        }
        if (this.$parent.transactionType === 'BUY') {
          this.$store.commit('ramp/resetStoreBuyFilters')
          filters = this.$store.getters['ramp/storeBuyFilters']
        }
        this.updateStoreFilters(filters)
      }

      if (type === 'orders') {
        if (this.$parent.statusType === 'ONGOING') {
          this.$store.commit('ramp/resetOngoingOrderFilters')
          filters = this.$store.getters['ramp/ongoingOrderFilters']
        }
        if (this.$parent.statusType === 'COMPLETED') {
          this.$store.commit('ramp/resetCompletedOrderFilters')
          filters = this.$store.getters['ramp/completedOrderFilters']
        }
        this.updateOrderFilters(filters)
      }
    }
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
  .subtext {
    opacity: .5;
  }
  </style>

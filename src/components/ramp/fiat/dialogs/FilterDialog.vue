<template>
    <!-- Filter orders -->
    <q-dialog v-model="filterOrder" @before-hide="$emit('back')">
      <q-card class="br-15 pt-card text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
        <div class="q-mt-lg text-center text-weight-bold lg-font-size">{{ $t('FilterAndSortOrders') }}</div>
        <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/>
        <q-scroll-area :style="`height: ${$q.screen.height - 300}px`">
          <div class="q-px-lg q-mx-sm">
            <!-- Sort by -->
            <div v-if="orderFilters.sort_by" class="q-pt-md">
              <div class="sm-font-size text-weight-bold">{{ $t('SortByDate') }}</div>
              <div class="q-pt-xs q-gutter-sm">
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_by !== 'created_at'" @click="orderFilters.sort_by = 'created_at'">{{ type === 'filterOngoingOrder' ? 'Default: ' : '' }} Created</q-badge>
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_by !== 'last_modified_at'" @click="orderFilters.sort_by = 'last_modified_at'">{{ type === 'filterCompletedOrder' ? 'Default: ' : '' }} Last updated</q-badge>
              </div>
            </div>
            <!-- Sort type -->
            <div v-if="orderFilters.sort_type" class="q-pt-md">
              <div class="sm-font-size text-weight-bold">{{ $t('SortType') }}</div>
              <div class="q-pt-xs q-gutter-sm">
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_type !== 'ascending'" @click="orderFilters.sort_type = 'ascending'">{{ type === 'filterOngoingOrder' ? 'Default: ' : '' }} Oldest First</q-badge>
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="orderFilters.sort_type !== 'descending'" @click="orderFilters.sort_type = 'descending'">{{ type === 'filterCompletedOrder' ? 'Default: ' : '' }} Newest First</q-badge>
              </div>
            </div>
            <!-- Trade type -->
            <div class="q-pt-md">
              <div class="sm-font-size text-weight-bold">{{ $t('TradeType') }}</div>
              <div v-if="showTradeTypeHint" class="xs-font-size subtext">{{ hintMessage }}</div>
              <div class="q-pt-xs q-gutter-sm">
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderAllSelected('trade-type')" @click="orderSetAllSelected('trade-type')">{{ $t('DefaultAll') }}</q-badge>
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.trade_type?.buy" @click="setOrderFilter('trade-type-buy', !orderFilters.trade_type?.buy)">Buy</q-badge>
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.trade_type?.sell" @click="setOrderFilter('trade-type-sell', !orderFilters.trade_type?.sell)">Sell</q-badge>
              </div>
            </div>
            <!-- Order status -->
            <div v-if="orderFilters.status" class="q-pt-md">
              <div class="sm-font-size text-weight-bold">{{ $t('Status') }}</div>
              <div v-if="showStatusHint" class="xs-font-size subtext">{{ hintMessage }}</div>
              <div class="q-gutter-sm q-pt-sm">
                <q-badge
                  rounded
                  color="blue-grey-6"
                  class="q-pa-sm"
                  :outline="!orderAllSelected('status')"
                  @click="orderSetAllSelected('status')">
                  {{ $t('DefaultAll') }}
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
            </div>
            <div v-if="type !== 'filterCompletedOrder'" class="q-pt-md">
              <div class="sm-font-size text-weight-bold">{{ $t('AppealableStatus') }}</div>
              <div v-if="showAppealableStatusHint" class="xs-font-size subtext">{{ hintMessage }}</div>
              <div class="q-gutter-sm q-mt-xs">
                <q-badge
                  rounded
                  color="blue-grey-6"
                  class="q-pa-sm"
                  :outline="!orderAllSelected('apl-status')"
                  @click="orderSetAllSelected('apl-status')">
                  {{ $t('DefaultAll') }}
                </q-badge>
                <q-badge
                  class="q-pa-sm"
                  color="blue-grey-6"
                  rounded
                  :outline="!orderFilters.appealable"
                  @click="setOrderFilter('appealable', !orderFilters.appealable)">
                  {{ $t('Appealable') }}
                </q-badge>
                <q-badge
                  class="q-pa-sm"
                  color="blue-grey-6"
                  rounded
                  :outline="!orderFilters.not_appealable"
                  @click="setOrderFilter('not-appealable', !orderFilters.not_appealable)">
                  {{ $t('NotAppealable') }}
                </q-badge>
              </div>
            </div>
            <!-- Order payment types -->
            <div v-if="orderFilters.payment_types" class="q-pt-md">
              <div class="sm-font-size text-weight-bold">{{ $t('PaymentType') }}</div>
              <div v-if="showPaymentTypeHint" class="xs-font-size subtext">{{ hintMessage }}</div>
              <div class="q-gutter-sm q-pt-sm">
                <q-badge
                  class="q-pa-sm"
                  color="blue-grey-6"
                  rounded
                  :outline="!orderAllSelected('payment-type')"
                  @click="orderSetAllSelected('payment-type')">
                  {{ $t('DefaultAll') }}
                </q-badge>
                <q-badge
                  class="q-pa-sm"
                  color="blue-grey-6"
                  rounded
                  v-for="payment in paymentTypes"
                  :outline="!orderFilters.payment_types?.includes(payment.id)"
                  @click="setOrderFilter('payment-type', payment.id)"
                  :key="payment.id">
                  {{ payment.short_name || payment.full_name }}
                </q-badge>
              </div>
            </div>
            <!-- Appealable cooldowns-->
            <div v-if="orderFilters.time_limits" class="q-pt-md">
              <div class="sm-font-size text-weight-bold">{{ $t('AppealableTime') }}</div>
              <div v-if="showTimeLimitHint" class="xs-font-size subtext">{{ hintMessage }}</div>
              <div class="q-gutter-sm q-pt-sm">
                <q-badge
                  class="q-pa-sm"
                  color="blue-grey-6"
                  rounded
                  :outline="!orderAllSelected('time-limit')"
                  @click="orderSetAllSelected('time-limit')">
                  {{ $t('DefaultAll') }}
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
            <!-- Ownership -->
            <div class="q-pt-lg">
              <div class="sm-font-size text-weight-bold">{{ $t('Ownership') }}</div>
              <div v-if="showOwnershipHint" class="xs-font-size subtext">{{ hintMessage }}</div>
              <div class="q-pt-xs q-gutter-sm">
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderAllSelected('ownership')" @click="orderSetAllSelected('ownership')">{{ $t('DefaultAll') }}</q-badge>
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.ownership.owned" @click="setOrderFilter('owned', !orderFilters.ownership.owned)">{{ $t('CreatedByMe') }}</q-badge>
                <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="!orderFilters.ownership.notOwned" @click="setOrderFilter('notOwned', !orderFilters.ownership.notOwned)">{{ $t('CreatedByCounterparty') }}</q-badge>
              </div>
            </div>
          </div>
        </q-scroll-area>
        <div class="text-center q-py-sm q-px-lg">
          <div class="row justify-center q-gutter-sm">
            <q-btn
              rounded
              no-caps
              :label="$t('Reset')"
              class="col-grow button button-icon"
              :class="getDarkModeClass(darkMode)"
              outline
              @click="resetFilters('orders')"
            />
            <q-btn
              :loading="loadFilterButton"
              :disable="loadFilterButton"
              rounded
              no-caps
              :label="$t('Filter')"
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
        <div class="q-mt-md text-center text-weight-bold lg-font-size">
          <template v-if="type === 'filterSellAd'">
            {{ $t('FilterSellAds') }}
          </template>
          <template v-else>
            {{ $t('FilterBuyAds') }}
          </template>
        </div>
        <q-separator :dark="darkMode" class="q-mt-sm q-mx-lg"/>

        <div class="q-px-lg q-mx-sm">
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">{{ $t('PriceType') }}</div>
            <div v-if="showPriceTypeHint" class="xs-font-size subtext">{{ hintMessage }}</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!storeAllSelected('price-type')"
                @click="storeSetAllSelected('price-type')">
                {{ $t('DefaultAll') }}
              </q-badge>
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!storeFilters?.price_type?.fixed"
                @click="setStoreFilter('price-fixed')">
                {{ $t('Fixed') }}
              </q-badge>
              <q-badge
                rounded
                color="blue-grey-6"
                class="q-pa-sm"
                :outline="!storeFilters?.price_type?.floating"
                @click="setStoreFilter('price-floating')">
                {{ $t('Floating') }}
              </q-badge>
            </div>
          </div>

          <!-- Ad Payment Type -->
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">{{ $t('PaymentType') }}</div>
            <div v-if="showPaymentTypeHint" class="xs-font-size subtext">{{ hintMessage }}</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!storeAllSelected('payment-type')"
                @click="storeSetAllSelected('payment-type')">
                {{ $t('DefaultAll') }}
              </q-badge>
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                v-for="payment in paymentTypes"
                :outline="!storeFilters.payment_types?.includes(payment.id)"
                @click="setStoreFilter('payment-type', payment.id)"
                :key="payment.id">
                {{ payment.short_name || payment.full_name }}
              </q-badge>
            </div>
          </div>

          <!-- Ad Appealable Time -->
          <div class="q-pt-md">
            <div class="sm-font-size text-weight-bold">{{ $t('AppealableTime') }}</div>
            <div v-if="showTimeLimitHint" class="xs-font-size subtext">{{ hintMessage }}</div>
            <div class="q-gutter-sm q-pt-sm">
              <q-badge
                class="q-pa-sm"
                color="blue-grey-6"
                rounded
                :outline="!storeAllSelected('time-limit')"
                @click="storeSetAllSelected('time-limit')">
                {{ $t('DefaultAll') }}
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
            <div class="sm-font-size text-weight-bold">{{ $t('PriceOrder') }}</div>
            <div class="q-pt-xs q-gutter-sm">
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="storeFilters.sort_type !== 'ascending'" @click="storeFilters.sort_type = 'ascending'">{{ type === 'filterSellAd' ? `${$t('Default')}: ` : '' }}  {{ $t('Ascending') }}</q-badge>
              <q-badge rounded color="blue-grey-6" class="q-pa-sm" :outline="storeFilters.sort_type !== 'descending'" @click="storeFilters.sort_type = 'descending'">{{ type === 'filterBuyAd' ? `${$t('Default')}: ` : '' }}  {{ $t('Descending') }}</q-badge>
            </div>
          </div>

          <div class="text-center q-pt-sm q-px-sm q-pb-lg">
            <div class="row justify-center q-gutter-sm q-pt-md">
              <q-btn
                rounded
                no-caps
                :label="$t('Reset')"
                class="col-grow button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                outline
                @click="resetFilters('store')"
              />
              <q-btn
                :loading="loadFilterButton"
                :disable="loadFilterButton"
                rounded
                no-caps
                :label="$t('Filter')"
                class="col-grow button"
                :class="getDarkModeClass(darkMode)"
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
import { getAppealCooldown } from 'src/exchange'
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
        { value: 'SBM', label: this.$t('Submitted') },
        { value: 'CNF', label: this.$t('Confirmed') },
        { value: 'ESCRW_PN', label: this.$t('EscrowPending') },
        { value: 'ESCRW', label: this.$t('Escrowed') },
        { value: 'PD_PN', label: this.$t('PaidPending') },
        { value: 'PD', label: this.$t('Paid') },
        { value: 'APL', label: this.$t('Appealed') },
        { value: 'RLS_PN', label: this.$t('ReleasePending') },
        { value: 'RFN_PN', label: this.$t('RefundPending') }
      ],
      completedStatuses: [
        { value: 'CNCL', label: this.$t('Canceled') },
        { value: 'RLS', label: this.$t('Released') },
        { value: 'RFN', label: this.$t('Refunded') }
      ],

      showPriceTypeHint: false,
      showPaymentTypeHint: false,
      showTimeLimitHint: false,
      showStatusHint: false,
      showTradeTypeHint: false,
      showOwnershipHint: false,
      showAppealableStatusHint: false,
      hintMessage: this.$t('SelectedAdFilterOptionHint'),
      loadFilterButton: false
    }
  },
  emits: ['back', 'submit'],
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
    this.paymentTypes = this.$store.getters['ramp/paymentTypes'](this.currency || 'All')
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
      vm.loadFilterButton = true

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
        case 'apl-status':
          vm.orderFilters.appealable = true
          vm.orderFilters.not_appealable = true
          break
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
        case 'apl-status':
          return vm.orderFilters.appealable && vm.orderFilters.not_appealable
        case 'ownership':
          return vm.orderFilters.ownership.owned && vm.orderFilters.ownership.notOwned
        case 'trade-type':
          return vm.orderFilters.trade_type.buy && vm.orderFilters.trade_type.sell
        case 'status': {
          const allStatus = vm.orderFilters.status.length === vm.statuses.length
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
        case 'not-appealable':
          if (!value && !vm.orderFilters.appealable) {
            vm.showAppealableStatusHint = true
            return
          }
          vm.orderFilters.not_appealable = value
          break
        case 'appealable':
          if (!value && !vm.orderFilters.not_appealable) {
            vm.showAppealableStatusHint = true
            return
          }
          vm.orderFilters.appealable = value
          break
        case 'trade-type-sell':
          if (!value && !vm.orderFilters.trade_type.buy) {
            vm.showTradeTypeHint = true
            return
          }
          vm.orderFilters.trade_type.sell = value
          break
        case 'trade-type-buy':
          if (!value && !vm.orderFilters.trade_type.sell) {
            vm.showTradeTypeHint = true
            return
          }
          vm.orderFilters.trade_type.buy = value
          break
        case 'owned':
          if (!value && !vm.orderFilters.ownership.notOwned) {
            vm.showOwnershipHint = true
            return
          }
          vm.orderFilters.ownership.owned = value
          break
        case 'notOwned':
          if (!value && !vm.orderFilters.ownership.owned) {
            vm.showOwnershipHint = true
            return
          }
          vm.orderFilters.ownership.notOwned = value
          break
        case 'status':
          if (vm.orderFilters.status?.includes(value)) {
            if (vm.orderFilters.status.length === 1) {
              vm.showStatusHint = true
              return
            }
            vm.orderFilters.status = vm.orderFilters.status.filter(e => e !== value)
          } else {
            vm.orderFilters.status.push(value)
          }
          break
        case 'payment-type': {
          const paymentTypes = vm.orderFilters.payment_types
          if (paymentTypes?.includes(value)) {
            if (vm.orderFilters.payment_types.length === 1) {
              vm.showPaymentTypeHint = true
              return
            }
            vm.orderFilters.payment_types = paymentTypes.filter(e => e !== value)
          } else {
            vm.orderFilters.payment_types.push(value)
          }
          break
        }
        case 'time-limit': {
          const timeLimits = vm.orderFilters.time_limits
          if (timeLimits?.includes(value)) {
            if (vm.orderFilters.time_limits.length === 1) {
              vm.showTimeLimitHint = true
              return
            }
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
      if (!filters || Object.keys(filters).length === 0) return
      this.storeFilters = filters
    },
    updateOrderFilters (filters) {
      if (!filters || Object.keys(filters).length === 0) return
      this.orderFilters = filters
    },
    paymentTimeLimit (timeValue) {
      return getAppealCooldown(timeValue).label
    },
    resetFilters (type) {
      let filters = null
      const defaultPaymentTypes = this.$store.getters['ramp/paymentTypes'](this.currency || 'All')

      if (type === 'store') {
        filters = {
          sort_type: this.$parent.transactionType === 'SELL' ? 'ascending' : 'descending',
          price_type: {
            fixed: true,
            floating: true
          },
          payment_types: defaultPaymentTypes.map(e => e.id),
          time_limits: [15, 30, 45, 60],
          order_amount: null,
          order_amount_currency: null
        }
        this.updateStoreFilters(filters)
      }

      if (type === 'orders') {
        if (this.type === 'filterOngoingOrder') {
          filters = {
            sort_type: 'ascending',
            sort_by: 'created_at',
            status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
            appealable: true,
            not_appealable: true,
            payment_types: defaultPaymentTypes.map(e => e.id),
            time_limits: [15, 30, 45, 60],
            ownership: {
              owned: true,
              notOwned: true
            },
            trade_type: {
              buy: true,
              sell: true
            }
          }
        }
        if (this.type === 'filterCompletedOrder') {
          filters = {
            sort_type: 'descending',
            sort_by: 'last_modified_at',
            status: ['CNCL', 'RLS', 'RFN'],
            payment_types: defaultPaymentTypes.map(e => e.id),
            time_limits: [15, 30, 45, 60],
            ownership: {
              owned: true,
              notOwned: true
            },
            trade_type: {
              buy: true,
              sell: true
            }
          }
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

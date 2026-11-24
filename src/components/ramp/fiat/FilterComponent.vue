<template>
    <q-btn
        unelevated
        ripple
        dense
        size="md"
        icon="filter_list"
        class="button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        @click="openFilter()">
        <q-badge v-if="!defaultFiltersOn" floating color="red"/>
    </q-btn>
    <FilterDialog
      v-if="openDialog"
      :key="filterDialogKey"
      :type="dialogType"
      :filters="filters"
      :currency="currency"
      @back="openDialog = false"
      @submit="commitFilters"
    />
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import FilterDialog from './dialogs/FilterDialog.vue'

export default {
  components: {
    FilterDialog
  },
  props: {
    type: String,
    currency: String,
    transactionType: String
  },
  emits: ['filter'],
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      defaultFiltersOn: true,
      openDialog: false,
      dialogType: '',
      defaultStoreFilters: {
        sort_type: this.transactionType === 'SELL' ? 'ascending' : 'descending',
        price_type: {
          fixed: true,
          floating: true
        },
        payment_types: [],
        time_limits: [15, 30, 45, 60],
        order_amount: null,
        order_amount_currency: null
      },
      defaultOngoingOrderFilters: {
        sort_type: 'descending',
        sort_by: 'created_at',
        status: ['SBM', 'CNF', 'ESCRW_PN', 'ESCRW', 'PD_PN', 'PD', 'APL', 'RLS_PN', 'RFN_PN'],
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
      defaultCompletedOrderFilters: {
        sort_type: 'descending',
        sort_by: 'last_modified_at',
        status: ['CNCL', 'RLS', 'RFN'],
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
      filters: {},
      filterDialogKey: 0
    }
  },
  mounted () {
    this.updateFilters()
  },
  methods: {
    getDarkModeClass,
    openFilter () {
      switch (this.type) {
        case 'store':
          switch (this.transactionType) {
            case 'SELL':
              this.dialogType = 'filterSellAd'
              break
            case 'BUY':
              this.dialogType = 'filterBuyAd'
              break
          }
          break
        case 'order':
          switch (this.transactionType) {
            case 'ONGOING':
              this.dialogType = 'filterOngoingOrder'
              break
            case 'COMPLETED':
              this.dialogType = 'filterCompletedOrder'
              break
          }
      }
      this.openDialog = true
    },
    async updateFilters () {
      const vm = this
      const defaultPaymentTypes = await vm.$store.dispatch('ramp/fetchPaymentTypes', { currency: this.currency })

      let getterName = ''
      let mutationName = ''
      let resetActionName = ''
      let defaultFilters = {}
      switch (vm.type) {
        case 'store':
          getterName = `ramp/${vm.transactionType === 'SELL' ? 'storeSellFilters' : 'storeBuyFilters'}`
          mutationName = `ramp/${vm.transactionType === 'SELL' ? 'updateStoreSellFilterPaymentTypes' : 'updateStoreBuyFilterPaymentTypes'}`
          resetActionName = 'ramp/resetStoreFilters'
          vm.defaultStoreFilters.payment_types = defaultPaymentTypes.map(paymentType => paymentType.id)
          defaultFilters = vm.defaultStoreFilters
          break
        case 'order':
          getterName = `ramp/${vm.transactionType === 'ONGOING' ? 'ongoingOrderFilters' : 'completedOrderFilters'}`
          mutationName = `ramp/${vm.transactionType === 'ONGOING' ? 'updateOngoingOrderFilterPaymentTypes' : 'updateCompletedOrderFilterPaymentTypes'}`
          resetActionName = 'ramp/resetOrderFilters'
          switch (vm.transactionType) {
            case 'ONGOING':
              vm.defaultOngoingOrderFilters.payment_types = defaultPaymentTypes.map(paymentType => paymentType.id)
              defaultFilters = vm.defaultOngoingOrderFilters
              break
            case 'COMPLETED':
              vm.defaultCompletedOrderFilters.payment_types = defaultPaymentTypes.map(paymentType => paymentType.id)
              defaultFilters = vm.defaultCompletedOrderFilters
              break
          }
          break
      }

      let savedFilters = vm.$store.getters[getterName](this.currency || 'All')
      if (!savedFilters || !savedFilters.payment_types) {
        await vm.$store.dispatch(resetActionName, { currency: this.currency })
        this.$store.commit(mutationName, { paymentTypes: defaultFilters.payment_types, currency: this.currency || 'All' })
        savedFilters = vm.$store.getters[getterName](this.currency || 'All')
      }

      vm.filters = JSON.parse(JSON.stringify(savedFilters))
      
      // Migration: Update old ongoing filters to new default (descending/newest first)
      if (vm.type === 'order' && vm.transactionType === 'ONGOING' && vm.filters.sort_type === 'ascending') {
        vm.filters.sort_type = 'descending'
        // Update the store with the new sort order
        vm.$store.commit('ramp/updateOngoingOrderFilters', { filter: vm.filters, currency: this.currency || 'All' })
      }
      
      vm.defaultFiltersOn = vm.updateDefaultFiltersFlag()
    },
    updateDefaultFiltersFlag () {
      const filters = { ...this.filters }
      let defaultFilters = {}

      switch (this.type) {
        case 'store':
          defaultFilters = { ...this.defaultStoreFilters }
          break
        case 'order':
          switch (this.transactionType) {
            case 'ONGOING':
              defaultFilters = { ...this.defaultOngoingOrderFilters }
              break
            case 'COMPLETED':
              defaultFilters = { ...this.defaultCompletedOrderFilters }
              break
          }
          break
      }

      if (JSON.stringify([...defaultFilters?.payment_types].sort()) !== JSON.stringify(filters?.payment_types?.sort()) ||
          JSON.stringify([...defaultFilters?.time_limits].sort()) !== JSON.stringify(filters?.time_limits?.sort())) {
        return false
      }

      delete filters.payment_types
      delete filters.time_limits
      delete defaultFilters.payment_types
      delete defaultFilters.time_limits

      const match = JSON.stringify(defaultFilters) === JSON.stringify(filters)
      if (!match) return false
      return true
    },
    commitFilters (data) {
      console.log('Commit filters:', data)
      const vm = this
      let getterName = ''
      let mutationName = ''
      switch (vm.type) {
        case 'store':
          getterName = `ramp/${vm.transactionType === 'SELL' ? 'storeSellFilters' : 'storeBuyFilters'}`
          mutationName = `ramp/${vm.transactionType === 'SELL' ? 'updateStoreSellFilters' : 'updateStoreBuyFilters'}`
          break
        case 'order':
          getterName = `ramp/${vm.transactionType === 'ONGOING' ? 'ongoingOrderFilters' : 'completedOrderFilters'}`
          mutationName = `ramp/${vm.transactionType === 'ONGOING' ? 'updateOngoingOrderFilters' : 'updateCompletedOrderFilters'}`
          break
      }

      vm.$store.commit(mutationName, { filters: data, currency: vm.currency || 'All' })
      const filters = vm.$store.getters[getterName](vm.currency || 'All')
      vm.filters = JSON.parse(JSON.stringify(filters))
      vm.openDialog = false
      vm.defaultFiltersOn = vm.updateDefaultFiltersFlag()
      vm.$emit('filter', vm.filters)
    }
  }

}
</script>

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
      @reset="resetFilters"
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
      // currency: null,
      openDialog: false,
      dialogType: '',
      defaultFilters: {
        sort_type: this.transactionType === 'SELL' ? 'ascending' : 'descending',
        price_type: {
          fixed: true,
          floating: true
        },
        payment_types: [],
        time_limits: [15, 30, 45, 60]
      },
      filters: {},
      filterDialogKey: 0
    }
  },
  mounted () {
    // this.currency = this.selectedCurrency !== 'All' ? this.selectedCurrency : null
    this.updateFilters()
  },
  methods: {
    getDarkModeClass,
    openFilter () {
      console.log('openFilter')
      this.dialogType = this.transactionType === 'SELL' ? 'filterSellAd' : 'filterBuyAd'
      this.openDialog = true
    },
    async updateFilters () {
      const vm = this
      const defaultPaymentTypes = await vm.$store.dispatch('ramp/fetchPaymentTypes', { currency: this.currency })
      vm.defaultFilters.payment_types = defaultPaymentTypes.map(paymentType => paymentType.id)
      const getterName = vm.transactionType === 'SELL' ? 'storeSellFilters' : 'storeBuyFilters'
      let savedFilters = vm.$store.getters[`ramp/${getterName}`](this.currency)
      if (!savedFilters || !savedFilters.payment_types || savedFilters.payment_types.length === 0 || !savedFilters.sort_type) {
        const mutationName = `ramp/${vm.transactionType === 'SELL' ? 'updateSellFilterPaymentTypes' : 'updateBuyFilterPaymentTypes'}`
        this.$store.commit(mutationName, { paymentTypes: vm.defaultFilters.payment_types, currency: this.currency })

        await vm.$store.dispatch('ramp/resetStoreFilters', { currency: this.currency })
        savedFilters = vm.$store.getters[`ramp/${getterName}`](this.currency)
      }

      vm.filters = JSON.parse(JSON.stringify(savedFilters))
      vm.defaultFiltersOn = vm.updateDefaultFiltersFlag()
    },
    updateDefaultFiltersFlag () {
      const filters = { ...this.filters }
      const defaultFilters = { ...this.defaultFilters }

      if (JSON.stringify([...defaultFilters?.payment_types].sort()) !== JSON.stringify(filters?.payment_types?.sort()) ||
          JSON.stringify([...defaultFilters?.time_limits].sort()) !== JSON.stringify(filters?.time_limits?.sort())) {
        return false
      }

      delete filters.trade_type
      delete filters.currency // kept for backwards compatibility
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
      const mutationName = `ramp/${this.transactionType === 'SELL' ? 'updateStoreSellFilters' : 'updateStoreBuyFilters'}`
      const getterName = `ramp/${this.transactionType === 'SELL' ? 'storeSellFilters' : 'storeBuyFilters'}`
      this.$store.commit(mutationName, { filters: data, currency: this.currency })
      const filters = this.$store.getters[getterName](this.currency)
      this.filters = JSON.parse(JSON.stringify(filters))
      this.openDialog = false
      this.defaultFiltersOn = this.updateDefaultFiltersFlag()
      this.$emit('filter', this.filters)
    },
    resetFilters (type) {
      console.log('resetFilters:', type)
      let filters = null
      if (type === 'store') {
        if (this.transactionType === 'SELL') {
          this.$store.commit('ramp/resetStoreSellFilters', this.currency)
        }
        if (this.transactionType === 'BUY') {
          this.$store.commit('ramp/resetStoreBuyFilters', this.currency)
        }
        this.updateFilters()
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
      this.filterDialogKey++
    }
  }

}
</script>

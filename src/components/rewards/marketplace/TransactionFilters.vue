<template>
  <div class="filter-container q-mb-xs">
    <q-tabs
      v-model="localActiveTab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="justify"
      narrow-indicator
    >
      <q-tab name="all" :label="$t('All', 'All')" />
      <q-tab name="orders" :label="$t('Orders', 'Orders')" />
      <q-tab name="otc" :label="$t('OTC', 'OTC')" />
    </q-tabs>
    
    <div class="row items-center justify-between q-mt-sm">
      <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
        {{ $t('Showing', 'Showing') }} {{ displayCount }} {{ $t('transactions', 'transactions') }}
      </div>
      
      <q-btn
        flat
        dense
        :icon="sortDesc ? 'arrow_downward' : 'arrow_upward'"
        :label="sortDesc ? $t('Newest', 'Newest') : $t('Oldest', 'Oldest')"
        size="sm"
        @click="toggleSort"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'TransactionFilters',
  
  props: {
    modelValue: {
      type: String,
      default: 'all'
    },
    displayCount: {
      type: Number,
      default: 0
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    sortDesc: {
      type: Boolean,
      default: true
    }
  },
  
  emits: ['update:modelValue', 'update:sortDesc', 'filter-changed'],
  
  computed: {
    localActiveTab: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
        this.$emit('filter-changed', { type: value })
      }
    }
  },
  
  methods: {
    toggleSort() {
      this.$emit('update:sortDesc', !this.sortDesc)
      this.$emit('filter-changed', { sortDesc: !this.sortDesc })
    }
  }
}
</script>

<style lang="scss" scoped>
.filter-container {
  padding: 8px 12px;
}
</style>

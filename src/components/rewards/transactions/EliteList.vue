<template>
  <transaction-list
    :items="items"
    :loading="loading"
    :loading-more="loadingMore"
    :has-more="hasMore"
    :dark-mode="darkMode"
    :include-separator="false"
    :pull-to-refresh="pullToRefresh"
    :empty-state="emptyState"
    @refresh="$emit('refresh', $event)"
    @load-more="$emit('load-more')"
  >
    <template #item="{ item }">
      <component :is="rowComponent" :item="item" />
    </template>
    <template #loading>
      <q-item v-for="n in 4" :key="`elite-skeleton-${n}`" class="elite-row" :class="getDarkModeClass(darkMode)">
        <q-item-section avatar>
          <q-skeleton type="circle" size="40px" />
        </q-item-section>
        <q-item-section>
          <q-skeleton type="text" width="65%" height="14px" class="q-mb-xs" />
          <template v-if="isTransactions">
            <q-skeleton type="text" width="45%" height="12px" class="q-mb-xs" />
          </template>
          <q-skeleton type="text" width="35%" height="12px" />
        </q-item-section>
        <q-item-section side>
          <q-skeleton type="text" width="70px" height="14px" class="q-mb-xs" />
          <template v-if="isTransactions">
            <q-skeleton type="text" width="50px" height="11px" />
          </template>
        </q-item-section>
      </q-item>
    </template>
  </transaction-list>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import TransactionList from 'src/components/rewards/transactions/TransactionList.vue'
import EliteTransactionRow from 'src/components/rewards/transactions/EliteTransactionRow.vue'
import EliteTopupRow from 'src/components/rewards/transactions/EliteTopupRow.vue'

const EMPTY_STATES = {
  transactions: {
    title: 'No eligible transactions yet',
    description: 'Your LIFT cashbacks from eligible OTC and marketplace purchases will appear here.'
  },
  topups: {
    title: 'No top-ups yet',
    description: 'Your BCH and LIFT top-ups that qualify for the program will appear here.'
  }
}

export default {
  name: 'EliteList',

  components: {
    TransactionList,
    EliteTransactionRow,
    EliteTopupRow
  },

  props: {
    type: {
      type: String,
      required: true,
      validator: value => ['transactions', 'topups'].includes(value)
    },
    items: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingMore: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: false
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    pullToRefresh: {
      type: Boolean,
      default: true
    }
  },

  emits: ['refresh', 'load-more'],

  methods: {
    getDarkModeClass
  },

  computed: {
    rowComponent () {
      return this.type === 'transactions' ? EliteTransactionRow : EliteTopupRow
    },
    isTransactions () {
      return this.type === 'transactions'
    },
    emptyState () {
      return EMPTY_STATES[this.type]
    }
  }
}
</script>

<style lang="scss">
.tx-list-load-more-btn {
  color: #d4a643 !important;
}
</style>
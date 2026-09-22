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
  </transaction-list>
</template>

<script>
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

  computed: {
    rowComponent () {
      return this.type === 'transactions' ? EliteTransactionRow : EliteTopupRow
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
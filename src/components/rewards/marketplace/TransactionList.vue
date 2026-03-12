<template>
  <div class="transaction-list">
    <!-- Loading State -->
    <template v-if="loading">
      <q-card
        v-for="n in 5"
        :key="`skeleton-${n}`"
        flat
        class="q-mb-sm"
        :class="getDarkModeClass(darkMode)"
      >
        <q-card-section>
          <div class="row items-center q-gutter-md">
            <q-skeleton type="circle" size="40px" />
            <div class="col">
              <q-skeleton type="text" width="60%" class="q-mb-xs" />
              <q-skeleton type="text" width="40%" />
            </div>
            <q-skeleton type="rect" width="60px" height="24px" />
          </div>
        </q-card-section>
      </q-card>
    </template>
    
    <!-- Empty State -->
    <q-card
      v-else-if="!items.length"
      flat
      class="empty-state-card q-pa-lg text-center"
      :class="getDarkModeClass(darkMode, 'text-grey-6', 'text-grey-8')"
    >
      <q-icon name="history" size="48px" class="q-mb-md" />
      <div class="text-subtitle1 q-mb-sm">
        {{ $t('NoTransactions', 'No transactions found') }}
      </div>
      <div class="text-body2">
        {{ $t('NoTransactionsDesc', 'Start making orders or OTC trades to earn points!') }}
      </div>
    </q-card>
    
    <!-- List Content -->
    <template v-else>
      <q-pull-to-refresh @refresh="onRefresh">
        <q-list separator class="transaction-list-container">
          <q-intersection
            v-for="(item, index) in items"
            :key="item.id || index"
            once
            transition="jump-up"
          >
            <slot name="item" :item="item" :index="index">
              <!-- Default slot content if no slot provided -->
            </slot>
            <q-separator v-if="index < items.length - 1" />
          </q-intersection>
        </q-list>
      </q-pull-to-refresh>
      
      <!-- Load More -->
      <div v-if="hasMore" class="text-center q-mt-md">
        <q-btn
          flat
          color="primary"
          :loading="loadingMore"
          @click="loadMore"
        >
          {{ $t('LoadMore', 'Load More') }}
        </q-btn>
      </div>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'TransactionList',
  
  props: {
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
    }
  },
  
  emits: ['refresh', 'load-more'],
  
  methods: {
    getDarkModeClass,
    
    onRefresh(done) {
      this.$emit('refresh', done)
    },
    
    loadMore() {
      this.$emit('load-more')
    }
  }
}
</script>

<style lang="scss" scoped>
.transaction-list {
  .transaction-list-container {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .empty-state-card {
    border-radius: 16px;
    border: 1px dashed rgba(0, 0, 0, 0.1);
    
    &.dark {
      border: 1px dashed rgba(255, 255, 255, 0.1);
    }
  }
}
</style>

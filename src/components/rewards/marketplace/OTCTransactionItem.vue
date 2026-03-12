<template>
  <q-item clickable @click="redirectToTransaction" class="transaction-item">
    <q-item-section avatar>
      <q-icon
        name="store"
        size="24px"
        color="white"
        class="q-pa-sm bg-secondary"
        style="border-radius: 50%;"
      />
    </q-item-section>
    
    <q-item-section>
      <q-item-label class="row items-center">
        <span class="text-weight-medium">Ref ID {{ data.ref_id }}</span>
        <q-icon name="open_in_new" size="14px" class="q-ml-sm" color="primary" />
      </q-item-label>
      <q-item-label caption>
        <span :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
          {{ formatDateLocaleRelative(data.date, false) }}
        </span>
      </q-item-label>
    </q-item-section>
    
    <q-item-section side>
      <points-badge
        :complete="true"
        :dark-mode-class="getDarkModeClass(darkMode)"
        :points="data.points_earned"
      />
    </q-item-section>
  </q-item>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatDateLocaleRelative } from 'src/utils/time'
import PointsBadge from 'src/components/rewards/PointsBadge.vue'

export default {
  name: 'OTCTransactionItem',
  
  components: {
    PointsBadge
  },
  
  props: {
    data: {
      type: Object,
      required: true
    },
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    getDarkModeClass,
    formatDateLocaleRelative,
    
    redirectToTransaction() {
      // Use tx_id for deep linking to transaction details
      if (this.data.tx_id) {
        this.$router.push({
          name: 'transaction-detail',
          params: { txid: this.data.tx_id },
          query: { from: 'app-rewards-marketplace-history' },
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.transaction-item {
  padding: 12px 16px;
  min-height: 72px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: rgba(59, 123, 246, 0.05);
  }
  
  .dark &:hover {
    background: rgba(59, 123, 246, 0.1);
  }
}
</style>

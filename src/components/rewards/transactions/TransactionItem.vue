<template>
  <q-item class="transaction-item">
    <q-item-section avatar>
      <q-icon
        :name="typeConfig.icon"
        size="24px"
        color="white"
        class="q-pa-sm"
        :class="typeConfig.bgClass"
        style="border-radius: 50%;"
      />
    </q-item-section>
    
    <q-item-section>
      <q-item-label clickable @click="redirect" class="row items-center">
        <span class="text-weight-medium">{{ labelText }}</span>
        <q-icon name="open_in_new" size="14px" class="q-ml-sm" color="primary" />
      </q-item-label>
      <q-item-label caption v-if="showMerchantName">
        <span :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
          {{ data.merchant_name }}
        </span>
      </q-item-label>
      <q-item-label caption>
        <span :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
          {{ formatDateLocaleRelative(data.created_at, false) }}
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
  name: 'TransactionItem',
  
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
  
  computed: {
    typeConfig() {
      const configs = {
        order: {
          icon: 'shopping_cart',
          bgClass: 'bg-primary',
          label: (data) => `Order #${data.order_id}`,
          redirect: 'order',
          showMerchantName: true
        },
        otc: {
          icon: 'store',
          bgClass: 'bg-secondary',
          label: (data) => `Ref ID ${data.ref_id}`,
          redirect: 'transaction',
          showMerchantName: true
        },
        ramp: {
          icon: 'img:ramp_icon_white.png',
          bgClass: 'bg-primary',
          label: (data) => `Ref ID ${data.ref_id}`,
          redirect: 'transaction',
          showMerchantName: false
        },
        vm: {
          icon: 'mdi-cash-plus',
          bgClass: 'bg-secondary',
          label: (data) => `Ref ID ${data.ref_id}`,
          redirect: 'transaction',
          showMerchantName: false
        },
        eload: {
          icon: 'card_membership',
          bgClass: 'bg-primary',
          label: (data) => `Ref ID ${data.ref_id}`,
          redirect: 'transaction',
          showMerchantName: false
        }
      }
      return configs[this.data.type] || configs.otc
    },
    
    labelText() {
      return this.typeConfig.label(this.data)
    },
    
    showMerchantName() {
      return this.typeConfig.showMerchantName && this.data.merchant_name
    }
  },
  
  methods: {
    getDarkModeClass,
    formatDateLocaleRelative,
    
    redirect() {
      if (this.typeConfig.redirect === 'order') {
        this.redirectToOrder()
      } else {
        this.redirectToTransaction()
      }
    },
    
    redirectToOrder() {
      this.$router.push({ 
        name: 'app-marketplace-order', 
        params: { orderId: this.data.order_id }
      })
    },
    
    redirectToTransaction() {
      if (this.data.tx_id) {
        this.$router.push({
          name: 'transaction-detail',
          params: { txid: this.data.tx_id },
          query: { from: 'app-rewards-transaction-history' }
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

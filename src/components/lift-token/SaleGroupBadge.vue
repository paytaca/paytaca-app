<template>
  <q-badge
    v-if="type === 'status'"
    :color="getStatusBadgeColor(parseLockupStatusChip(purchase))"
    :label="getStatusLabel(parseLockupStatusChip(purchase))"
    class="sale-group-badge"
  />
  <q-badge
    v-else-if="type === 'round'"
    :color="getRoundBadgeColor(saleGroup)"
    :label="parseSaleGroup(saleGroup)"
    class="sale-group-badge"
  />
</template>

<script>
export default {
  name: 'SaleGroupBadge',
  props: {
    type: {
      type: String,
      required: true,
      validator: (value) => ['status', 'round'].includes(value)
    },
    purchase: {
      type: Object,
      required: false,
      default: null
    },
    saleGroup: {
      type: String,
      required: false,
      default: null
    }
  },
  methods: {
    parseLockupStatusChip(purchase) {
      if (purchase.is_done_vesting) {
        return "comp";
      }
      if (purchase.purchase_vesting_details.some(detail => detail.vested_date) 
          && !purchase.is_done_vesting
      ) return 'vest'
      return 'lock'
    },
    getStatusLabel(status) {
      const labels = {
        'lock': this.$t('Lockup'),
        'vest': this.$t('Vesting'),
        'comp': this.$t('Complete'),
      }
      return labels[status] || status
    },
    getStatusBadgeColor(status) {
      const colors = {
        'lock': 'orange-7',
        'vest': 'light-blue-6',
        'comp': 'teal-6',
      }
      return colors[status] || 'grey-6'
    },
    parseSaleGroup(saleGroup) {
      const labels = {
        'seed': this.$t('EarlySupporterRound'),
        'priv': this.$t('StrategicPartnerRound'),
      }
      return labels[saleGroup] || saleGroup
    },
    getRoundBadgeColor(saleGroup) {
      const colors = {
        'seed': 'green-6',
        'priv': 'blue-6',
      }
      return colors[saleGroup] || 'grey-6'
    }
  }
}
</script>

<style lang="scss" scoped>
.sale-group-badge {
  font-size: 11px;
  padding: 4px 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>
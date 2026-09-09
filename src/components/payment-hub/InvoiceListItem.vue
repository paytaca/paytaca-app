<template>
  <q-item :key="invoice.invoice_id" clickable v-ripple class="q-py-md">
    <q-item-section>
      <div class="text-body2 text-weight-medium ellipsis-2-lines" :class="getDarkModeClass(darkMode)" style="word-break: break-all;">
        {{ invoice.memo || $t('NoMemo', 'No Memo') }}
      </div>
      <div class="text-caption text-grey q-mt-xs">{{ formattedDate }}</div>
    </q-item-section>
    <q-item-section side top class="text-right">
      <template v-if="statusStyle === 'icon'">
        <div 
          class="text-caption text-weight-bold" 
          :class="`text-${getStatusColor(invoice.status)}`"
        >
          <q-icon 
            :name="getStatusIcon(invoice.status)" 
            :color="getStatusColor(invoice.status)" 
            size="18px" 
          />
          {{ invoice.status }}
        </div>
      </template>
      <template v-else-if="statusStyle === 'badge'">
        <q-badge
          :color="getInvoiceBadgeColor(invoice.status)"
          :text-color="darkMode ? 'black' : 'white'"
          class="text-weight-bold br-5"
        >
          {{ invoice.status }}
        </q-badge>
      </template>
      <div class="text-weight-bold">{{ invoice.total_bch }} BCH</div>
      <div class="text-caption text-grey">{{ invoice.total_fiat }}</div>
    </q-item-section>
  </q-item>
</template>
<script setup>
import { useStore } from 'vuex';
import { computed } from 'vue';
import ago from 's-ago'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { usePaymentHubUtils } from 'src/composables/payment-hub/usePaymentHub';

const props = defineProps({
  invoice: {
    type: Object,
    required: true,
  },
  statusStyle: {
    type: String,
    validator: (val) => ['badge', 'icon'].includes(val),
    default: 'badge',
  },
  dateFormat: {
    type: [String, Function],
    validator: (val) => {
      if (typeof val === 'string') return ['absolute', 'relative'].includes(val)
      return typeof val === 'function';
    },
    default: 'absolute',
  },
})

const $store = useStore()
const { formatDate, getInvoiceBadgeColor } = usePaymentHubUtils();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])


const formattedDate = computed(() => {
  const dateCreated = props.invoice.date_created;
  if (typeof props.dateFormat === 'function') return props.dateFormat(dateCreated)
  if (props.dateFormat === 'relative') return formatTimeAgo(dateCreated)
  return formatDate(props.invoice.date_created)
})

function formatTimeAgo(date) {
  if (!date) return ''
  return ago(new Date(date))
}

function getStatusIcon(status) {
  switch (status) {
    case 'PAID': return 'check_circle'
    case 'PENDING': return 'schedule'
    case 'EXPIRED': return 'event_busy'
    case 'CANCELLED': return 'cancel'
    case 'TOP UP': return 'savings'
    case 'RECLAIMED': return 'settings_backup_restore'
    default: return 'help'
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'PAID': return 'green'
    case 'PENDING': return 'orange'
    case 'EXPIRED': return 'grey'
    case 'CANCELLED': return 'red'
    case 'TOP UP': return 'blue'
    case 'RECLAIMED': return 'purple'
    default: return 'grey'
  }
}
</script>

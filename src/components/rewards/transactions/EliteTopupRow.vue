<template>
  <div class="elite-row">
    <div class="elite-row-icon">
      <q-icon :name="item.asset === 'bch' ? 'currency_bitcoin' : 'workspace_premium'" />
    </div>
    <div class="elite-row-main">
      <div class="elite-row-title">
        {{ item.asset === 'bch' ? 'BCH' : 'LIFT' }}
        <span class="elite-row-tx">{{ formatTxDisplay(item.txId) }}</span>
      </div>
      <div class="elite-row-sub">{{ formatDateLocaleRelative(item.date, false) }}</div>
    </div>
    <div class="elite-row-side">
      <div class="elite-row-amt">+{{ item.asset === 'bch' ? formatBch(item.amount) : formatLift(item.amount) }} {{ item.asset === 'bch' ? 'BCH' : 'LIFT' }}</div>
    </div>
  </div>
</template>

<script>
import { formatDateLocaleRelative } from 'src/utils/time'
import { formatWithLocale } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'

export default {
  name: 'EliteTopupRow',

  props: {
    item: {
      type: Object,
      required: true
    }
  },

  methods: {
    formatDateLocaleRelative,

    formatTxDisplay (txId) {
      if (!txId) return ''
      if (txId.length <= 12) return txId
      return `${txId.substring(0, 6)}…${txId.substring(txId.length - 4)}`
    },

    formatBch (amount) {
      return formatWithLocale(amount ?? 0, { min: 0, max: 8 })
    },

    formatLift (amount) {
      return formatWithLocale(amount ?? 0, { min: 0, max: LIFT_TOKEN_DECIMALS })
    }
  }
}
</script>

<style lang="scss" scoped>
.elite-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  min-height: 72px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(212, 166, 67, 0.05);
  }

  .dark &:hover {
    background: rgba(212, 166, 67, 0.1);
  }
}

.elite-row-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(212, 166, 67, 0.15);
  color: #d4a643;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.elite-row-main {
  flex: 1;
  min-width: 0;
}

.elite-row-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #d4a643;
}

.elite-row-tx {
  font-weight: 500;
  color: #6b6b7b;
  font-size: 12px;
  margin-left: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

.dark .elite-row-tx {
  color: #9a97ad;
}

.elite-row-sub {
  font-size: 11px;
  color: #6b6b7b;
  margin-top: 2px;
}

.dark .elite-row-sub {
  color: #9a97ad;
}

.elite-row-side {
  text-align: right;
  flex-shrink: 0;
}

.elite-row-amt {
  font-size: 13px;
  font-weight: 800;
  color: #d4a643;
}
</style>
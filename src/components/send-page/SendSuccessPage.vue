<template>
  <div class="send-success-page">
    <header-nav
      :title="mode === 'receive' ? $t('TransactionReceived') : $t('TransactionSent')"
      backnavpath="/"
      class="header-nav"
    />
    <div class="send-success-container text-bow" :class="getDarkModeClass(darkMode)">
      <div class="success-content text-center">
        <q-icon size="80px" name="check_circle" color="green-5" class="q-mb-md" />
        <div class="text-h5 text-weight-bold text-grad q-mb-sm">
          {{ mode === 'receive' ? $t('TransactionReceivedSuccessfully', {}, 'Transaction Received Successfully!') : $t('TransactionSentSuccessfully', {}, 'Transaction Sent Successfully!') }}
        </div>
        <p class="text-body1 q-mb-lg" :class="getDarkModeClass(darkMode)" style="opacity: 0.8">
          {{ $t('ConsolidationTransactionNote', {}, 'This transaction consolidates funds within your wallet.') }}
        </p>

        <!-- Amount Display -->
        <div v-if="formattedAmount" class="amount-section q-mb-lg">
          <div class="text-caption text-grey q-mb-xs">{{ $t('Amount') }}</div>
          <div class="amount-label text-h4 text-weight-bold text-grad">
            {{ formattedAmount }}
          </div>
          <div v-if="fiatAmount" class="text-body2 q-mt-xs" :class="getDarkModeClass(darkMode)" style="opacity: 0.7">
            ≈ {{ fiatAmount }}
          </div>
        </div>

        <!-- Reference ID Section -->
        <div class="reference-id-section q-mb-lg">
          <div class="text-grey text-weight-medium text-caption q-mb-xs">{{ $t('ReferenceId') }}</div>
          <div class="reference-id-value">{{ referenceId }}</div>
          <q-separator color="grey" class="q-mt-sm" />
        </div>

        <!-- Transaction ID Section -->
        <div class="transaction-id-section q-mb-lg">
          <div class="text-grey text-weight-medium text-caption q-mb-sm">{{ $t('TransactionId') }}</div>
          <div class="txid-container" :class="getDarkModeClass(darkMode)">
            <span class="txid-text">{{ txidDisplay }}</span>
          </div>
          <div class="view-explorer-container q-mt-sm">
            <a
              class="view-explorer-link"
              :class="getDarkModeClass(darkMode)"
              :href="explorerLink"
              target="_blank"
            >
              <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
              {{ $t('ViewInExplorer') }}
            </a>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons q-mt-xl">
          <q-btn
            :label="$t('Done')"
            unelevated
            no-caps
            color="primary"
            class="full-width q-mb-md"
            @click="onDone"
          />
          <q-btn
            :label="$t('ViewTransactions')"
            outline
            no-caps
            color="primary"
            class="full-width"
            @click="onViewTransactions"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getExplorerLink } from 'src/utils/send-page-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { hexToRef } from 'src/utils/reference-id-utils'

export default {
  name: 'SendSuccessPage',
  props: {
    txid: {
      type: String,
      required: true
    },
    amount: {
      type: [String, Number],
      default: null
    },
    amountSent: {
      type: [String, Number],
      default: null
    },
    assetSymbol: {
      type: String,
      default: 'BCH'
    },
    fiatAmount: {
      type: String,
      default: null
    },
    isCashToken: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'send',
      validator: (value) => ['send', 'receive'].includes(value)
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    referenceId () {
      return hexToRef(this.txid.substring(0, 6))
    },
    txidDisplay () {
      return `${this.txid.slice(0, 8)}...${this.txid.slice(-8)}`
    },
    explorerLink () {
      return getExplorerLink(this.txid, this.isCashToken)
    },
    formattedAmount () {
      const amount = this.amount || this.amountSent
      if (amount === null || amount === undefined) return ''
      const str = String(amount).trim()
      if (str === '') return ''
      const num = Number(amount)
      // amountSent from send.vue is already formatted with symbol (e.g. "0.001 BCH", "100 TOKEN")
      if (Number.isNaN(num) || (typeof amount === 'string' && str.includes(' '))) {
        return str
      }
      if (num <= 0) return ''
      return `${str} ${this.assetSymbol}`
    }
  },
  methods: {
    getDarkModeClass,
    onDone () {
      this.$router.push('/')
    },
    onViewTransactions () {
      this.$router.push({ name: 'transaction-list' })
    }
  }
}
</script>

<style lang="scss" scoped>
.send-success-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.send-success-container {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px 24px 24px 24px;
  overflow-y: auto;
}

.success-content {
  max-width: 500px;
  width: 100%;
  padding-top: 16px;
}

.amount-section {
  .amount-label {
    font-size: 28px;
    font-weight: 600;
  }
}

.reference-id-section {
  .reference-id-value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 8px;
    margin-top: 8px;
    font-family: 'Courier New', monospace;
  }
}

.transaction-id-section {
  .txid-container {
    padding: 12px 20px;
    border-radius: 12px;
    display: inline-block;
    background: rgba(128, 128, 128, 0.08);
    border: 1px solid rgba(128, 128, 128, 0.2);
    margin: 8px auto;

    .txid-text {
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
  }

  .view-explorer-container {
    display: block;
    text-align: center;

    .view-explorer-link {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: var(--q-primary);
      font-size: 15px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 128, 0, 0.08);
        transform: translateX(2px);
      }

      &.dark {
        color: #4ade80;
      }
    }
  }
}

.action-buttons {
  max-width: 400px;
  margin: 0 auto;
}
</style>

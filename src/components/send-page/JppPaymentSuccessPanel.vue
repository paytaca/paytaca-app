<template>
  <div class="jpp-payment-success-panel text-bow" :class="getDarkModeClass(darkMode)">
    <div class="success-content text-center q-px-md q-pt-lg q-pb-md">
      <q-icon size="80px" name="check_circle" color="green-5" class="q-mb-md" />
      <div class="text-h5 text-weight-bold text-grad q-mb-sm">
        {{ $t('PaymentSuccessful', {}, 'Payment Successful') }}
      </div>
      <p class="text-body1 q-mb-lg" style="opacity: 0.8">
        {{ $t('TransactionSentSuccessfully', {}, 'Transaction Sent Successfully') }}
      </p>

      <!-- Memo Display -->
      <div v-if="jpp?.parsed?.memo" class="memo-section q-mb-lg">
        <div class="text-caption text-grey q-mb-xs">{{ $t('Memo') }}</div>
        <div class="memo-text">{{ jpp.parsed.memo }}</div>
      </div>

      <!-- Amount Display -->
      <div class="amount-section q-mb-lg">
        <div class="text-caption text-grey q-mb-xs">{{ $t('Amount') }}</div>
        <div class="amount-label text-h4 text-weight-bold text-grad">
          {{ amountFormatted }} {{ denomination }}
        </div>
        <div v-if="fiatFormatted" class="text-body2 q-mt-xs" style="opacity: 0.7">
          {{ fiatFormatted }}
        </div>
      </div>

      <!-- CashTokens Section -->
      <div v-if="hasTokens" class="tokens-section q-mb-lg">
        <div class="text-caption text-grey q-mb-xs">{{ $t('Tokens') }}</div>
        <div class="tokens-list">
          <div v-for="(tokenData, index) in jpp.tokenAmounts" :key="`token-${index}`" class="token-item">
            <q-img
              v-if="getAssetLogo(tokenData?.category) && !failedImages[index]"
              :src="getAssetLogo(tokenData?.category)"
              width="28px"
              height="28px"
              class="token-logo q-mr-sm"
              @error="failedImages[index] = true"
            />
            <q-icon v-else name="token" size="28px" class="q-mr-sm" />
            <span class="token-amount">{{ formatTokenAmount(tokenData) }}</span>
          </div>
          <div v-if="jpp?.nfts?.length" class="token-item">
            <q-icon name="collections" size="28px" class="q-mr-sm" />
            <span class="token-amount">
              {{ jpp.nfts.length }} {{ jpp.nfts.length === 1 ? 'NFT' : 'NFTs' }}
            </span>
          </div>
        </div>
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
          :label="$t('ViewTransaction')"
          outline
          no-caps
          color="primary"
          class="full-width"
          @click="onViewTransaction"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'
import { JSONPaymentProtocol } from 'src/wallet/payment-uri'
import { formatWithLocale, getDenomDecimals, parseFiatCurrency } from 'src/utils/denomination-utils'
import { convertToFiatAmount } from 'src/utils/send-page-utils'

export default {
  name: 'JppPaymentSuccessPanel',
  props: {
    jpp: {
      type: JSONPaymentProtocol,
      required: true,
    }
  },
  data () {
    return {
      failedImages: {}
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination'] || 'BCH'
    },
    txid () {
      return this.jpp?.txids?.[0] || ''
    },
    txidDisplay () {
      return `${this.txid.slice(0, 8)}...${this.txid.slice(-8)}`
    },
    explorerLink () {
      return getExplorerLink(this.txid, this.isCashToken)
    },
    isCashToken () {
      return (this.jpp?.tokenAmounts?.length > 0) || (this.jpp?.nfts?.length > 0)
    },
    hasTokens () {
      return this.isCashToken
    },
    totalBCHAmount () {
      return this.jpp?.total / 10 ** 8 || 0
    },
    amountFormatted () {
      if (!this.totalBCHAmount) return '0'
      const { convert, decimal } = getDenomDecimals(this.denomination)
      const calculatedAmount = (this.totalBCHAmount * convert).toFixed(decimal)
      return formatWithLocale(calculatedAmount, { max: decimal })
    },
    selectedCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency?.symbol || 'USD'
    },
    selectedAssetMarketPrice () {
      return this.$store.getters['market/getAssetPrice']('bch', this.selectedCurrency)
    },
    fiatFormatted () {
      if (!this.totalBCHAmount || !this.selectedAssetMarketPrice) return ''
      const fiatAmount = convertToFiatAmount(this.totalBCHAmount, this.selectedAssetMarketPrice)
      if (!fiatAmount) return ''
      return parseFiatCurrency(fiatAmount, String(this.selectedCurrency).toUpperCase())
    }
  },
  methods: {
    getDarkModeClass,
    getAssetLogo (category) {
      const asset = this.$store.getters['assets/getAssets']?.find(asset => asset?.id === `ct/${category}`)
      return asset?.logo || null
    },
    formatTokenAmount (tokenData) {
      const category = tokenData?.category
      const asset = this.$store.getters['assets/getAssets']?.find(asset => asset?.id === `ct/${category}`)
      if (!asset) return tokenData?.amount

      const decimals = parseInt(asset?.decimals) || 0
      const parsedAmount = tokenData?.amount / 10 ** decimals
      if (!parsedAmount) return tokenData?.amount
      const symbol = asset?.symbol
      return `${parsedAmount} ${symbol}`
    },
    onDone () {
      this.$router.push('/')
    },
    onViewTransaction () {
      const assetIds = new Set()
      this.jpp?.parsed?.outputs?.forEach(output => {
        if (output?.token?.category) assetIds.add(`ct/${output?.token?.category}`)
        else assetIds.add('bch')
      })
      this.$router.push({
        name: 'transaction-summary',
        params: { txid: this.txid },
        query: {
          from: 'send',
          new: 'true',
          assetIds: [...assetIds].join(','),
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.jpp-payment-success-panel {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.success-content {
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  padding-top: 16px;
}

.memo-section {
  .memo-text {
    font-size: 17px;
    line-height: 1.5;
    word-break: break-word;
    padding: 12px 20px;
    border-radius: 12px;
    background: rgba(128, 128, 128, 0.08);
    border: 1px solid rgba(128, 128, 128, 0.2);
  }
}

.amount-section {
  .amount-label {
    font-size: 28px;
    font-weight: 600;
  }
}

.tokens-section {
  .tokens-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .token-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border-radius: 12px;
    background: rgba(128, 128, 128, 0.08);
    border: 1px solid rgba(128, 128, 128, 0.2);

    .token-logo {
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    .token-amount {
      font-size: 16px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }
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

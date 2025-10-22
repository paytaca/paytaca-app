<template>
  <q-dialog seamless ref="dialog" class="no-click-outside">
    <q-card class="q-pa-xl wallet-info-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-end">
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <!-- Wallet Name -->
      <div class="wallet-name-section q-mb-xl q-mt-md text-center">
        <div class="wallet-title text-weight-bold text-grad">
          {{ walletInfo.name }}
        </div>
      </div>
      
      <!-- Balance Section -->
      <div class="balance-section q-mb-xl q-px-md text-center">
        <div class="balance-label q-mb-sm">
          {{ $t('WalletBalanceCap') }}
        </div>
        <div class="balance-amount text-weight-bold text-grad q-mb-sm">
          {{ parseAssetDenomination(denomination, getAssetData(), false, 10) }}
        </div>
        <div class="balance-fiat">
          {{ parseFiatCurrency(getAssetMarketBalance(getAssetData()), selectedMarketCurrency) }}
        </div>
      </div>

      <!-- Receiving Address Section -->
      <div class="address-section q-mb-lg q-px-md">
        <div class="row items-center justify-between q-mb-sm">
          <div class="address-label">
            {{ $t('CurrentReceivingAddress') }}
          </div>
          <q-btn
            flat
            dense
            round
            icon="content_copy"
            size="md"
            class="copy-btn"
            @click="copyToClipboard(walletInfo.wallet?.bch?.lastAddress || walletInfo.chipnet?.bch?.lastAddress)"
          >
            <q-tooltip>{{ $t('Copy') }}</q-tooltip>
          </q-btn>
        </div>
        <div class="address-text" :class="getDarkModeClass(darkMode)">
          {{ walletInfo.wallet?.bch?.lastAddress || walletInfo.chipnet?.bch?.lastAddress }}
        </div>
      </div>

      <!-- Toggle More Info Button -->
      <div class="row justify-center q-mt-md q-mb-sm">
        <q-btn
          flat
          no-caps
          :icon="showMoreInfo ? 'expand_less' : 'expand_more'"
          :label="showMoreInfo ? $t('ShowLess') : $t('ShowMore')"
          class="text-weight-medium"
          @click="showMoreInfo = !showMoreInfo"
        />
      </div>

      <!-- Advanced Info (Collapsible) -->
      <q-slide-transition>
        <div v-show="showMoreInfo">
          <p class="q-ma-sm q-px-md section-title text-weight-bold">{{ $t('AdvancedInfo') }}</p>
          <q-list bordered separator class="br-12 pt-card-2 q-mx-md" :class="getDarkModeClass(darkMode)">
            <q-item>
              <q-item-section>
                <q-item-label class="advanced-info-label" :class="{ 'text-blue-5': darkMode }">{{ $t('DerivationPath') }}</q-item-label>
                <q-item-label class="pt-label advanced-info-value" :class="getDarkModeClass(darkMode)">
                  {{ walletInfo.wallet?.bch?.derivationPath }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  dense
                  round
                  icon="content_copy"
                  size="md"
                  class="copy-btn"
                  @click="copyToClipboard(walletInfo.wallet?.bch?.derivationPath)"
                />
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label class="advanced-info-label" :class="{ 'text-blue-5': darkMode }">{{ $t('WalletHash') }}</q-item-label>
                <q-item-label class="pt-label advanced-info-value" :class="getDarkModeClass(darkMode)">
                  {{ walletInfo.wallet?.bch?.walletHash }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  dense
                  round
                  icon="content_copy"
                  size="md"
                  class="copy-btn"
                  @click="copyToClipboard(walletInfo.wallet?.bch?.walletHash)"
                />
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label class="advanced-info-label" :class="{ 'text-blue-5': darkMode }">{{ $t('XpubKey') }}</q-item-label>
                <q-item-label class="pt-label advanced-info-value" :class="getDarkModeClass(darkMode)">
                  {{ walletInfo.wallet?.bch?.xPubKey }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  dense
                  round
                  icon="content_copy"
                  size="md"
                  class="copy-btn"
                  @click="copyToClipboard(walletInfo.wallet?.bch?.xPubKey)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-slide-transition>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'

export default {
  name: 'BasicInfoDialog',

  props: {
    vaultIndex: Number
  },

  data () {
    return {
      walletInfo: {},
      showMoreInfo: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isChipnet() {
      return this.$store.getters['global/isChipnet']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    selectedMarketCurrency () {
      return this.$store.getters['market/selectedCurrency']?.symbol
    }
  },

  methods: {
    getDarkModeClass,
    parseAssetDenomination,
    parseFiatCurrency,
    getAssetData () {
      const index = this.vaultIndex
      return this.isChipnet
        ? this.$store.getters['assets/getVault'][index].chipnet_assets[0]
        : this.$store.getters['assets/getVault'][index].asset[0]
    },
    getAssetMarketBalance (asset) {
      if (!asset?.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      return (Number(asset.balance || 0) * Number(assetPrice)).toFixed(2)
    },
    copyToClipboard (value) {
      if (!value) return
      
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'positive',
        icon: 'check_circle'
      })
    }
  },

  mounted () {
    this.walletInfo = this.$store.getters['global/getVault'][this.vaultIndex]

    document.addEventListener('backbutton', () => {
      this.$refs.dialog.hide()
    })
  }
}
</script>

<style lang="scss" scoped>
  .wallet-info-card {
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    
    &.dark {
      background: rgba(0, 0, 0, 0.3) !important;
    }
    
    &.light {
      background: rgba(255, 255, 255, 0.7) !important;
    }
  }

  .section-title {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    opacity: 0.6;
  }
  
  .q-item {
    min-height: 68px;
    padding: 12px 16px;
  }
  
  .q-item-label {
    line-height: 1.5;
  }

  .advanced-info-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .advanced-info-value {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    word-wrap: break-word;
    line-height: 1.6;
    letter-spacing: 0.3px;
  }

  .wallet-name-section {
    animation: fadeIn 0.5s ease-out;
  }

  .wallet-title {
    font-size: 24px;
    line-height: 1.3;
  }

  .balance-section {
    animation: fadeIn 0.6s ease-out;
    position: relative;
    padding: 20px 0;
  }

  .balance-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    opacity: 0.6;
    font-weight: 600;
  }

  .balance-amount {
    font-size: 32px;
    line-height: 1.2;
  }

  .balance-fiat {
    font-size: 16px;
    opacity: 0.7;
    font-weight: 500;
  }

  .address-section {
    animation: fadeIn 0.7s ease-out;
  }

  .address-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    opacity: 0.6;
    font-weight: 600;
  }

  .copy-btn {
    opacity: 0.7;
    transition: opacity 0.2s ease;
    
    &:hover {
      opacity: 1;
    }
  }

  .address-text {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    word-break: break-all;
    line-height: 1.8;
    padding: 16px;
    border-radius: 12px;
    letter-spacing: 0.5px;
    border: 1px solid transparent;
    transition: all 0.3s ease;
    
    &.dark {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
    }
    
    &.light {
      background: rgba(0, 0, 0, 0.03);
      border-color: rgba(0, 0, 0, 0.08);
    }
    
    &:hover {
      border-color: rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent seamless class="no-click-outside">
    <q-card
      class="q-dialog-plugin br-15 pt-card text-bow"
      style="padding: 5px 0;"
      :class="getDarkModeClass(darkMode)"
    >
      <div style="right: 10px; top: 10px; position: absolute; border-radius: 20px; z-index: 100;">
        <q-btn icon="close" flat round dense v-close-popup :color="darkMode ? 'grey' : 'black'" class="close-button"/>
      </div>

      <q-card-section v-if="asset" class="q-pa-md">
        <!-- Header: Logo and Name -->
        <div class="asset-header text-center q-mb-md">
          <div class="asset-logo-container">
            <img 
              :src="getImageUrl(asset)" 
              height="45" 
              class="asset-logo asset-icon"
              @contextmenu.prevent
              @selectstart.prevent
            >
          </div>
          <div class="asset-name q-mt-xs text-weight-bold" style="font-size: 20px; letter-spacing: 0.3px;">
            {{ assetDisplayName }}
          </div>
        </div>

        <!-- Balance Display -->
        <div class="balance-section text-center q-mb-md">
          <div class="balance-label text-grey-6 text-weight-medium" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
            {{ $t('Balance', {}, 'Balance') }}
          </div>
          <div class="balance-amount text-weight-bold" style="font-size: 24px; line-height: 1.2;">
            {{ parseAssetDenomination(denomination, asset) }}
          </div>
          <div v-if="assetFiatValue" class="fiat-value text-grey-7 q-mt-xs" style="font-size: 14px;">
            {{ assetFiatValue }}
          </div>
          <div v-else-if="loadingFiatValue" class="fiat-value q-mt-xs" style="font-size: 14px;">
            <q-skeleton type="rect" width="100px" height="16px" class="q-mx-auto" />
          </div>
        </div>

        <!-- Swap Button for Tokens (below balance) -->
        <div v-if="asset.id?.startsWith?.('ct/')" class="swap-button-section q-mb-md">
          <q-btn 
            @click="cauldronSwap" 
            outline
            class="swap-btn"
            color="primary"
            no-caps
          >
            <q-icon name="img:cauldron-logo.svg" size="18px" class="q-mr-sm" />
            <span>{{ $t('Swap') }}</span>
          </q-btn>
        </div>
        
        <!-- Price Chart for BCH -->
        <div v-if="asset.id === 'bch'" class="price-chart-section q-mb-md">
          <div class="section-divider q-mb-sm"></div>
          
          <div v-if="!chartLoaded" class="row justify-center q-py-md">
            <q-spinner color="primary" size="2em" />
          </div>
          <div v-else-if="networkError" class="text-center q-py-md">
            <q-icon name="cloud_off" size="2em" color="grey-5" class="q-mb-xs" />
            <div class="text-grey-6" style="font-size: 11px;">
              {{ $t('ChartUnavailableOffline', {}, 'Chart unavailable offline') }}
            </div>
          </div>
          <div v-else>
            <!-- Current Price Display -->
            <div class="current-price-section text-center q-mb-sm">
              <div class="price-label text-grey-6 text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                {{ $t('CurrentPrice', {}, 'Current Price') }}
              </div>
              <div class="price-value text-weight-bold" style="font-size: 18px;">
                {{ parseFiatCurrency(currentPrice, selectedCurrency?.symbol) }}
              </div>
              <div class="price-change q-mt-xs">
                <q-chip 
                  :color="priceIncreased ? 'green-1' : 'red-1'"
                  :text-color="priceIncreased ? 'green-8' : 'red-8'"
                  size="xs"
                  class="text-weight-bold"
                >
                  <q-icon size="xs" :name="priceIncreased ? 'mdi-trending-up' : 'mdi-trending-down'" class="q-mr-xs"/>
                  {{ priceIncreased ? '+' : '' }}{{ priceChangePercent }}%
                  <span class="text-weight-regular q-ml-xs" style="font-size: 9px;">24h</span>
                </q-chip>
              </div>
            </div>

            <!-- Chart -->
            <q-card flat bordered class="chart-card q-pa-sm" :class="getDarkModeClass(darkMode)">
              <div class="chart-wrapper">
                <canvas ref="priceChart"></canvas>
              </div>
            </q-card>
          </div>
          
          <div class="section-divider q-mt-sm"></div>
        </div>
        
        <!-- Token Info and Price (for non-BCH assets) -->
        <div v-if="asset.id !== 'bch'" class="token-sections q-mb-md">
          <div class="section-divider q-mb-md"></div>
          
          <!-- Token Info -->
          <div class="token-info-section text-center q-mb-md">
            <div class="metadata-label text-grey-6 text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
              {{ $t('Metadata', {}, 'Metadata') }}
            </div>
            <div class="view-explorer-container q-mt-xs">
              <a
                :href="assetLink"
                class="view-explorer-link"
                :class="getDarkModeClass(darkMode)"
                target="_blank"
              >
                {{ asset.id.split('/')[1].slice(0, 7) }}...{{ asset.id.split('/')[1].slice(-7) }}
                <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
              </a>
            </div>
          </div>
          
          <!-- Price Display for Tokens -->
          <div class="token-price-section text-center">
            <div v-if="tokenPrice" class="current-price-section q-mb-sm">
              <div class="price-label text-grey-6 text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                {{ $t('CurrentPrice', {}, 'Current Price') }}
              </div>
              <div class="price-value text-weight-bold" style="font-size: 18px;">
                {{ formattedTokenPrice }}
              </div>
              <div class="price-per-token text-grey-7 q-mt-xs" style="font-size: 11px;">
                {{ $t('PerToken', {}, 'per token') }}
              </div>
            </div>
            <div v-else-if="loadingTokenPrice" class="current-price-section q-mb-sm">
              <div class="price-label text-grey-6 text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                {{ $t('CurrentPrice', {}, 'Current Price') }}
              </div>
              <div class="row justify-center q-mt-sm">
                <q-skeleton type="rect" width="120px" height="24px" />
              </div>
              <div class="row justify-center q-mt-xs">
                <q-skeleton type="rect" width="60px" height="14px" />
              </div>
            </div>
            <div v-else class="current-price-section q-mb-sm">
              <div class="price-label text-grey-6 text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                {{ $t('CurrentPrice', {}, 'Current Price') }}
              </div>
              <div class="price-value text-grey-6" style="font-size: 14px;">
                {{ $t('PriceNotAvailable', {}, 'Price not available') }}
              </div>
            </div>
          </div>
          
          <div class="section-divider q-mt-md"></div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons q-mt-lg">
          <div class="action-buttons-container">
            <q-btn 
              @click="send" 
              unelevated
              class="action-btn"
              color="primary"
              text-color="white"
              no-caps
            >
              <q-icon name="send" size="18px" class="action-icon" />
              <span class="action-label">{{ $t('Send') }}</span>
            </q-btn>
            
            <q-btn 
              @click="receive" 
              unelevated
              class="action-btn"
              color="primary"
              text-color="white"
              no-caps
            >
              <q-icon name="qr_code_2" size="18px" class="action-icon" />
              <span class="action-label">{{ $t('Receive') }}</span>
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import Chart from 'chart.js/auto'

export default {
  name: 'AssetInfo',
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  props: {
    network: {
      type: String,
      default: 'BCH'
    }
  },
  data () {
    return {
      asset: null,
      // Price chart data
      chartLoaded: false,
      networkError: false,
      bchPriceData: [],
      priceChart: null,
      currentPrice: 0,
      priceChangePercent: 0,
      priceIncreased: true,
      autoUpdateInterval: null,
      // Token price loading state
      loadingTokenPrice: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    selectedCurrency () {
      return this.$store.getters['market/selectedCurrency']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    assetPrices () {
      // Force reactivity by accessing the store getter
      // This ensures computed properties that depend on prices will update when prices change
      return this.$store.getters['market/assetPrices']
    },
    assetLink () {
      const tokenType = this.asset.id.split('/')[0]
      const tokenId = this.asset && this.asset.id.split('/')[1]

      if (tokenType === 'ct')
        return `https://tokenexplorer.cash/?tokenId=${tokenId}`
      return `https://simpleledger.info/#token/${tokenId}`
    },
    fallbackAssetLogo () {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(this.asset && this.asset.id))
    },
    assetDisplayName () {
      if (!this.asset) return ''
      if (this.asset.id === 'bch') return 'Bitcoin Cash'
      return this.asset.name || this.asset.symbol
    },
    assetFiatValue () {
      if (!this.asset?.id) return ''
      
      // Access assetPrices to ensure reactivity
      const _ = this.assetPrices
      
      const selectedCurrency = this.selectedCurrency?.symbol
      if (!selectedCurrency) return ''
      
      const assetPrice = this.$store.getters['market/getAssetPrice'](this.asset.id, selectedCurrency)
      if (!assetPrice || assetPrice === 0) return ''

      let balance = Number(this.asset.balance || 0)
      
      // Adjust for token decimals (balance is in smallest units)
      // For BCH, use balance directly (matching home page calculation)
      // For tokens, divide by 10^decimals to get token units
      if (this.asset.id !== 'bch' && this.asset.decimals) {
        const decimals = parseInt(this.asset.decimals) || 0
        if (decimals > 0) {
          balance = balance / (10 ** decimals)
        }
      }
      
      const computedBalance = balance * Number(assetPrice)
      
      return this.parseFiatCurrency(computedBalance.toFixed(2), selectedCurrency)
    },
    loadingFiatValue () {
      // Show loading for fiat value when:
      // 1. For tokens: when loadingTokenPrice is true
      // 2. For BCH: when chart is loading (chartLoaded is false and not networkError)
      if (!this.asset?.id) return false
      
      if (this.asset.id === 'bch') {
        return !this.chartLoaded && !this.networkError
      } else {
        return this.loadingTokenPrice
      }
    },
    tokenPrice () {
      if (!this.asset?.id || this.asset.id === 'bch') return null
      
      // Access assetPrices to ensure reactivity
      const _ = this.assetPrices
      
      const selectedCurrency = this.selectedCurrency?.symbol
      if (!selectedCurrency) return null
      
      const assetPrice = this.$store.getters['market/getAssetPrice'](this.asset.id, selectedCurrency)
      if (!assetPrice || assetPrice === 0) return null
      
      return Number(assetPrice)
    },
    formattedTokenPrice () {
      if (!this.tokenPrice) return null
      return this.parseFiatCurrency(this.tokenPrice, this.selectedCurrency?.symbol)
    }
  },

  methods: {
    getDarkModeClass,
    parseAssetDenomination,
    parseFiatCurrency,
    async show (asset) {
      try {
        // Reset loading state when showing new asset
        this.loadingTokenPrice = false
        this.asset = asset
        this.$refs.dialog.show()
        
        // Fetch price using unified asset-prices API for both BCH and tokens
        const selectedCurrency = this.selectedCurrency?.symbol
        if (selectedCurrency) {
          // Set loading state for tokens
          if (asset.id !== 'bch') {
            this.loadingTokenPrice = true
          }
          
          try {
            // Use unified asset-prices API for both BCH and tokens
            // Don't clear existing prices to avoid removing other assets' cached prices
            await this.$store.dispatch('market/updateAssetPrices', { 
              assetId: asset.id,
              clearExisting: false 
            })
          } catch (error) {
            // Price might not be available for this asset
            console.debug('Price not available for asset:', asset.id, error)
          } finally {
            if (asset.id !== 'bch') {
              this.loadingTokenPrice = false
            }
          }
        }
        
        // Load price chart if BCH (for chart visualization)
        if (asset.id === 'bch') {
          await this.loadPriceData()
          this.$nextTick(() => {
            this.createPriceChart()
            this.startAutoUpdate()
          })
        }
      } catch (err) {
        console.error('Error showing asset info:', err)
      }
    },
    getImageUrl (asset) {
      if (asset.logo) {
        if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
          return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
        } else {
          return asset.logo
        }
      } else {
        return this.getFallbackAssetLogo
      }
    },
    onOKClick () {
      this.hide()
    },
    onCancelClick () {
      this.hide()
    },
    hide () {
      this.cancelAutoUpdate()
      if (this.priceChart) {
        this.priceChart.destroy()
        this.priceChart = null
      }
      // Reset loading state when hiding
      this.loadingTokenPrice = false
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.cancelAutoUpdate()
      this.$emit('hide')
    },
    send () {
      this.$router.push({
        name: 'transaction-send',
        query: {
          network: this.network,
          assetId: this.asset.id,
          fixed: false
        }
      })
    },
    receive () {
      this.$router.push({
        name: 'transaction-receive',
        query: {
          network: this.network,
          assetId: this.asset.id
        }
      })
    },
    cauldronSwap() {
      this.$router.push({
        name: 'app-cauldron',
        query: {
          selectTokenId: this.asset.id?.replace('ct/', '')
        }
      })
    },

    // Price chart methods
    async loadPriceData () {
      try {
        this.chartLoaded = false
        this.networkError = false
        
        const currency = this.selectedCurrency?.symbol?.toLowerCase() || 'usd'
        const url = `https://api.coingecko.com/api/v3/coins/bitcoin-cash/market_chart?vs_currency=${currency}&days=1`
        
        const response = await this.$axios.get(url)
        
        if (response.status === 200 || response.status === 201) {
          const prices = response.data.prices.reverse()
          this.bchPriceData = prices.map(item => item[1]).reverse()
          
          if (this.bchPriceData.length > 0) {
            this.currentPrice = this.bchPriceData[this.bchPriceData.length - 1]
            const firstPrice = this.bchPriceData[0]
            const priceDiff = this.currentPrice - firstPrice
            this.priceChangePercent = ((priceDiff / firstPrice) * 100).toFixed(2)
            this.priceIncreased = priceDiff >= 0
          }
          
          this.chartLoaded = true
        } else {
          this.networkError = true
          this.chartLoaded = true
        }
      } catch (error) {
        console.error('Error loading price data:', error)
        this.networkError = true
        this.chartLoaded = true
      }
    },
    
    createPriceChart () {
      if (!this.$refs.priceChart || this.bchPriceData.length === 0) return
      
      const ctx = this.$refs.priceChart.getContext('2d')
      
      const gradient = ctx.createLinearGradient(0, 0, 0, 150)
      gradient.addColorStop(0, this.priceIncreased ? 'rgba(142, 195, 81, 0.4)' : 'rgba(237, 94, 89, 0.4)')
      gradient.addColorStop(1, this.priceIncreased ? 'rgba(142, 195, 81, 0.05)' : 'rgba(237, 94, 89, 0.05)')
      
      this.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array(this.bchPriceData.length).fill(''),
          datasets: [{
            data: this.bchPriceData,
            borderColor: this.priceIncreased ? '#8ec351' : '#ed5e59',
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { 
              enabled: true,
              callbacks: {
                label: (context) => this.parseFiatCurrency(context.parsed.y, this.selectedCurrency?.symbol)
              }
            }
          },
          scales: {
            x: { 
              display: false,
              grid: { display: false }
            },
            y: { 
              display: false,
              grid: { display: false }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      })
    },
    
    startAutoUpdate () {
      this.autoUpdateInterval = setInterval(() => {
        this.loadPriceData().then(() => {
          if (this.priceChart && this.bchPriceData.length > 0) {
            this.priceChart.data.datasets[0].data = this.bchPriceData
            this.priceChart.update('none')
          }
        })
      }, 60000) // Update every minute
    },
    
    cancelAutoUpdate () {
      if (this.autoUpdateInterval) {
        clearInterval(this.autoUpdateInterval)
        this.autoUpdateInterval = null
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.pp-text {
  color: #000 !important;
}

// Header Section
.asset-header {
  padding: 4px 0;
  
  .asset-logo-container {
    display: inline-block;
    padding: 8px;
    border-radius: 50%;
    background: rgba(59, 123, 246, 0.08);
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
    }
  }
  
  .asset-logo {
    display: block;
  }
  
  .asset-name {
    color: inherit;
  }
}

// Balance Section
.balance-section {
  padding: 8px 0;
  
  .balance-label {
    opacity: 0.8;
  }
  
  .balance-amount {
    color: inherit;
  }
  
  .fiat-value {
    opacity: 0.85;
  }
}

// Section Divider
.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent);
  
  .dark & {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  }
}

// Price Chart Section
.price-chart-section {
  max-width: 100%;
  
  .current-price-section {
    padding: 6px 0;
    
    .price-label {
      opacity: 0.8;
    }
    
    .price-value {
      color: inherit;
    }
  }
}

.chart-card {
  background: rgba(59, 123, 246, 0.03);
  border: 1px solid rgba(59, 123, 246, 0.1);
  border-radius: 12px;
  transition: box-shadow 0.3s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(59, 123, 246, 0.1);
  }
  
  .dark & {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.1);
    
    &:hover {
      box-shadow: 0 2px 8px rgba(255, 255, 255, 0.05);
    }
  }
}

.chart-wrapper {
  width: 100%;
  height: 120px;
  position: relative;
}

// Token Price Section
.token-price-section {
  max-width: 100%;
  
  .current-price-section {
    padding: 6px 0;
    
    .price-label {
      opacity: 0.8;
    }
    
    .price-value {
      color: inherit;
    }
    
    .price-per-token {
      opacity: 0.7;
    }
  }
}

// Token Info Section
.token-info-section {
  .view-explorer-container {
    display: block;
    text-align: center;
    
    .view-explorer-link {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: var(--q-primary);
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 8px;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(59, 123, 246, 0.08);
        transform: translateX(2px);
      }
      
      &.dark {
        color: #4ade80;
        
        &:hover {
          background: rgba(74, 222, 128, 0.1);
        }
      }
    }
  }
}

// Swap Button Section (below balance for tokens)
.swap-button-section {
  display: flex;
  justify-content: center;
  padding: 4px 0;
  
  .swap-btn {
    font-weight: 500;
    letter-spacing: 0.3px;
    font-size: 14px;
    border-radius: 10px;
    padding: 10px 20px;
    border-width: 1.5px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      background: rgba(59, 123, 246, 0.08);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(59, 123, 246, 0.15);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}

// Action Buttons (Send and Receive only)
.action-buttons {
  padding-top: 8px;
  
  .action-buttons-container {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  
  .action-btn {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    letter-spacing: 0.3px;
    font-size: 14px;
    border-radius: 10px;
    padding: 10px 12px;
    box-shadow: 0 2px 8px rgba(59, 123, 246, 0.2);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 56px;
    
    .action-icon {
      opacity: 0.95;
      transition: transform 0.2s ease;
      font-size: 18px;
    }
    
    .action-label {
      font-weight: 600;
      line-height: 1.2;
      padding-left: 5px;
      font-size: clamp(13px, 2.5vw, 16px);
    }
    
    &:hover {
      box-shadow: 0 4px 14px rgba(59, 123, 246, 0.3);
      transform: translateY(-2px);
      
      .action-icon {
        transform: scale(1.1);
      }
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(59, 123, 246, 0.25);
      
      .action-icon {
        transform: scale(1);
      }
    }
  }
  
  // Responsive adjustments for smaller screens
  @media (max-width: 480px) {
    .action-buttons-container {
      gap: 8px;
    }
    
    .action-btn {
      min-height: 52px;
      padding: 8px 10px;
      gap: 3px;
    }
  }
  
  // When only 2 buttons
  .action-btn:nth-last-child(2):first-child {
    min-width: calc(50% - 5px);
  }
}

// Close Button
.close-button {
  opacity: 0.7;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
}
</style>

<template>
  <q-dialog ref="dialog" @hide="onDialogHide" persistent seamless>
    <q-card
      class="q-dialog-plugin br-15 pt-card"
      style="padding: 5px 0;"
      :class="getDarkModeClass(darkMode)"
    >
      <div style="right: 10px; top: 10px; position: absolute; border-radius: 20px; z-index: 100;">
        <q-btn icon="close" flat round dense v-close-popup :color="darkMode ? 'grey' : 'black'" class="close-button"/>
      </div>

      <q-card-section v-if="asset" class="q-pa-lg">
        <!-- Header: Logo and Name -->
        <div class="asset-header text-center q-mb-lg">
          <div class="asset-logo-container">
            <img :src="getImageUrl(asset)" height="60" class="asset-logo">
          </div>
          <div class="asset-name q-mt-sm text-weight-bold" style="font-size: 28px; letter-spacing: 0.5px;">
            {{ assetDisplayName }}
          </div>
        </div>

        <!-- Balance Display -->
        <div class="balance-section text-center q-mb-lg">
          <div class="balance-label text-grey-6 text-weight-medium" style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            {{ $t('Balance', {}, 'Balance') }}
          </div>
          <div class="balance-amount text-weight-bold" style="font-size: 32px; line-height: 1.2;">
            {{ parseAssetDenomination(denomination, asset) }}
          </div>
          <div v-if="assetFiatValue" class="fiat-value text-grey-7 q-mt-sm" style="font-size: 18px;">
            {{ assetFiatValue }}
          </div>
        </div>
        
        <!-- Price Chart for BCH -->
        <div v-if="asset.id === 'bch'" class="price-chart-section q-mb-lg">
          <div class="section-divider q-mb-md"></div>
          
          <div v-if="!chartLoaded" class="row justify-center q-py-lg">
            <q-spinner color="primary" size="2.5em" />
          </div>
          <div v-else-if="networkError" class="text-center q-py-lg">
            <q-icon name="cloud_off" size="3em" color="grey-5" class="q-mb-sm" />
            <div class="text-grey-6" style="font-size: 13px;">
              {{ $t('ChartUnavailableOffline', {}, 'Chart unavailable offline') }}
            </div>
          </div>
          <div v-else>
            <!-- Current Price Display -->
            <div class="current-price-section text-center q-mb-md">
              <div class="price-label text-grey-6 text-weight-medium" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                {{ $t('CurrentPrice', {}, 'Current Price') }}
              </div>
              <div class="price-value text-weight-bold" style="font-size: 24px;">
                {{ parseFiatCurrency(currentPrice, selectedCurrency?.symbol) }}
              </div>
              <div class="price-change q-mt-xs">
                <q-chip 
                  :color="priceIncreased ? 'green-1' : 'red-1'"
                  :text-color="priceIncreased ? 'green-8' : 'red-8'"
                  size="sm"
                  class="text-weight-bold"
                >
                  <q-icon size="xs" :name="priceIncreased ? 'mdi-trending-up' : 'mdi-trending-down'" class="q-mr-xs"/>
                  {{ priceIncreased ? '+' : '' }}{{ priceChangePercent }}%
                  <span class="text-weight-regular q-ml-xs" style="font-size: 11px;">24h</span>
                </q-chip>
              </div>
            </div>

            <!-- Chart -->
            <q-card flat bordered class="chart-card q-pa-md" :class="getDarkModeClass(darkMode)">
              <div class="chart-wrapper">
                <canvas ref="priceChart"></canvas>
              </div>
            </q-card>
          </div>
          
          <div class="section-divider q-mt-md"></div>
        </div>
        
        <!-- Token Info (for non-BCH assets) -->
        <div v-if="asset.id !== 'bch'" class="token-info-section text-center q-mb-lg">
          <div class="section-divider q-mb-md"></div>
          <a
            :href="assetLink"
            class="token-id-link"
            :class="getDarkModeClass(darkMode, 'text-grey-7', 'text-grey-6')"
            target="_blank"
          >
            {{ asset.id.split('/')[1].slice(0, 7) }}...{{ asset.id.split('/')[1].slice(-7) }}
            <q-icon name="open_in_new" size="sm" class="q-ml-xs" />
          </a>
          <div class="q-mt-sm text-grey-6" style="font-size: 13px;">
            {{ $t('Decimals', {}, 'Decimals') }}: <span class="text-weight-medium">{{ asset.decimals }}</span>
          </div>
          <div class="section-divider q-mt-md"></div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons q-mt-lg row q-gutter-md justify-center">
          <q-btn 
            @click="send" 
            rounded 
            unelevated
            class="action-btn"
            color="primary"
            text-color="white"
            no-caps
            padding="10px 32px"
            style="min-width: 130px; font-size: 15px; font-weight: 600;"
          >
            <q-icon name="send" size="18px" class="q-mr-sm" />
            {{ $t('Send') }}
          </q-btn>
          <q-btn 
            @click="receive" 
            rounded 
            unelevated
            class="action-btn"
            color="primary"
            text-color="white"
            no-caps
            padding="10px 32px"
            style="min-width: 130px; font-size: 15px; font-weight: 600;"
          >
            <q-icon name="qr_code_2" size="18px" class="q-mr-sm" />
            {{ $t('Receive') }}
          </q-btn>
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
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      // Price chart data
      chartLoaded: false,
      networkError: false,
      bchPriceData: [],
      priceChart: null,
      currentPrice: 0,
      priceChangePercent: 0,
      priceIncreased: true,
      autoUpdateInterval: null
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    isSep20 () {
      return this.network === 'sBCH'
    },
    assetLink () {
      const tokenType = this.asset.id.split('/')[0]
      const tokenId = this.asset && this.asset.id.split('/')[1]
      if (this.isSep20) return `https://sonar.cash/address/${tokenId}`

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
      
      const selectedCurrency = this.selectedCurrency?.symbol
      const assetPrice = this.$store.getters['market/getAssetPrice'](this.asset.id, selectedCurrency)
      if (!assetPrice) return ''

      const balance = Number(this.asset.balance || 0)
      const computedBalance = balance * Number(assetPrice)
      
      return this.parseFiatCurrency(computedBalance.toFixed(2), selectedCurrency)
    }
  },

  methods: {
    getDarkModeClass,
    parseAssetDenomination,
    parseFiatCurrency,
    async show (asset) {
      try {
        this.asset = asset
        this.$refs.dialog.show()
        
        // Load price chart if BCH
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
  padding: 8px 0;
  
  .asset-logo-container {
    display: inline-block;
    padding: 12px;
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
  padding: 16px 0;
  
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
    padding: 12px 0;
    
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
  height: 180px;
  position: relative;
}

// Token Info Section
.token-info-section {
  .token-id-link {
    text-decoration: none;
    font-family: monospace;
    font-size: 14px;
    transition: opacity 0.2s ease;
    display: inline-flex;
    align-items: center;
    
    &:hover {
      opacity: 0.7;
    }
  }
}

// Action Buttons
.action-buttons {
  padding-top: 8px;
  
  .action-btn {
    font-weight: 600;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 8px rgba(59, 123, 246, 0.25);
    transition: all 0.3s ease;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(59, 123, 246, 0.35);
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0);
    }
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

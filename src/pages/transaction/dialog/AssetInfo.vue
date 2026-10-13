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
          <a
            v-if="asset.id !== 'bch'"
            :href="assetLink"
            class="view-explorer-link q-mt-xs"
            :class="getDarkModeClass(darkMode)"
            target="_blank"
          >
            {{ asset.id.split('/')[1].slice(0, 7) }}...{{ asset.id.split('/')[1].slice(-7) }}
            <q-icon name="open_in_new" size="14px" class="q-ml-xs" />
          </a>
        </div>

        <!-- Balance Display -->
        <div class="balance-section text-center q-mb-md">
          <div class="balance-label text-weight-medium" :class="darkMode ? 'text-grey-4' : 'text-grey-6'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
            {{ $t('Balance', {}, 'Balance') }}
          </div>
          <div class="balance-amount text-weight-bold" style="font-size: 28px; line-height: 1.2;" v-bch-amount="{ denomination }">
            {{ parseAssetDenomination(denomination, asset) }}
          </div>
          <div v-if="assetFiatValue" class="fiat-value q-mt-xs" :class="darkMode ? 'text-grey-4' : 'text-grey-7'" style="font-size: 14px;">
            {{ assetFiatValue }}
          </div>
          <div v-else-if="loadingFiatValue" class="fiat-value q-mt-xs" style="font-size: 14px;">
            <q-skeleton type="rect" width="100px" height="16px" class="q-mx-auto" />
          </div>
        </div>

        <!-- Swap (CashTokens only) -->
        <div v-if="asset.id?.startsWith?.('ct/')" class="text-center q-mb-md">
          <q-btn
            @click="cauldronSwap"
            flat
            class="action-btn"
            no-caps
          >
            <q-icon name="swap_horiz" size="18px" class="action-icon" />
            <span class="action-label">{{ $t('Swap') }}</span>
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
              <div class="price-label text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                {{ $t('CurrentPrice', {}, 'Current Price') }}
              </div>
              <div class="price-value text-weight-bold" style="font-size: 28px;">
                {{ parseFiatCurrency(currentPrice, selectedCurrency?.symbol) }}
              </div>
              <div class="price-change q-mt-xs">
                <q-chip 
                  :color="priceIncreased ? 'green-1' : 'red-1'"
                  :text-color="priceIncreased ? 'green-8' : 'red-8'"
                  size="md"
                  class="text-weight-bold price-change-chip"
                >
                  <q-icon size="16px" :name="priceIncreased ? 'mdi-trending-up' : 'mdi-trending-down'" class="q-mr-xs"/>
                  {{ priceIncreased ? '+' : '' }}{{ priceChangePercent }}%
                  <span class="text-weight-regular q-ml-xs" style="font-size: 11px;">24h</span>
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
          
          <!-- Price / market info carousel for Tokens -->
          <div class="token-price-section text-center">
            <q-carousel
              v-model="marketSlide"
              animated
              :arrows="hasMultipleMarketSlides"
              infinite
              :height="carouselHeight"
              control-color="primary"
              class="token-price-carousel"
            >
              <q-carousel-slide name="price" class="column no-wrap flex-center">
                <div class="price-label text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                  {{ $t('CurrentPrice', {}, 'Current Price') }}
                </div>
                <template v-if="formattedTokenPriceBch">
                  <div class="price-value text-weight-bold" style="font-size: 24px; overflow-wrap: anywhere;">
                    {{ formattedTokenPriceBch }}
                  </div>
                  <div v-if="formattedTokenPrice" class="price-per-token q-mt-xs" style="font-size: 15px;">
                    {{ formattedTokenPrice }}
                  </div>
                </template>
                <template v-else-if="formattedTokenPrice">
                  <div class="price-value text-weight-bold" style="font-size: 28px;">
                    {{ formattedTokenPrice }}
                  </div>
                </template>
                <template v-else-if="loadingTokenPrice">
                  <div class="q-mt-sm"><q-skeleton type="rect" width="120px" height="24px" /></div>
                  <div class="q-mt-xs"><q-skeleton type="rect" width="60px" height="14px" /></div>
                </template>
                <div v-else class="price-value price-per-token" style="font-size: 14px;">
                  {{ $t('PriceNotAvailable', {}, 'Price not available') }}
                </div>
              </q-carousel-slide>

              <q-carousel-slide v-if="change24hPercent !== null" name="change" class="column no-wrap flex-center">
                <div class="price-label text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                  {{ $t('PriceChange24h', {}, '24h Change') }}
                </div>
                <div
                  class="price-value text-weight-bold"
                  :class="priceChangeClass"
                  style="font-size: 28px;"
                >
                  <q-icon size="22px" :name="priceChangeIcon" class="q-mr-xs"/>
                  {{ priceChangeDirection === 'up' ? '+' : '' }}{{ change24hPercent.toFixed(2) }}%
                </div>
                <div class="price-per-token q-mt-xs" style="font-size: 11px;">
                  {{ $t('Last24Hours', {}, 'last 24 hours') }}
                </div>
              </q-carousel-slide>

              <q-carousel-slide v-if="liquidityValue" name="liquidity" class="column no-wrap flex-center">
                <div class="price-label text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                  {{ $t('TotalValueLocked', {}, 'Total Value Locked') }}
                </div>
                <div v-if="liquidityBchFormatted" class="price-value text-weight-bold" style="font-size: 24px; overflow-wrap: anywhere;">
                  {{ liquidityBchFormatted }}
                </div>
                <div v-if="liquidityFiatFormatted" class="price-per-token q-mt-xs" style="font-size: 15px;">
                  {{ liquidityFiatFormatted }}
                </div>
              </q-carousel-slide>

              <q-carousel-slide v-if="cauldronTokenUrl" name="cauldron" class="column no-wrap flex-center">
                <div class="price-label text-weight-medium" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
                  {{ $t('MoreDetails', {}, 'More Details') }}
                </div>
                <q-btn
                  type="a"
                  :href="cauldronTokenUrl"
                  target="_blank"
                  color="primary"
                  no-caps
                  rounded
                  class="q-mt-sm"
                  icon="open_in_new"
                  :label="$t('ViewOnCauldron', {}, 'View on Cauldron')"
                />
              </q-carousel-slide>
            </q-carousel>
          </div>
          
          <div class="section-divider q-mt-md"></div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons q-mt-lg">
          <div class="action-buttons-container">
            <q-btn
              @click="send"
              flat
              class="action-btn"
              no-caps
            >
              <q-icon name="send" size="18px" class="action-icon" />
              <span class="action-label">{{ $t('Send') }}</span>
            </q-btn>

            <q-btn
              @click="receive"
              flat
              class="action-btn"
              no-caps
            >
              <q-icon name="qr_code_2" size="18px" class="action-icon" />
              <span class="action-label">{{ $t('Receive') }}</span>
            </q-btn>

            <q-btn
              @click="viewHistory"
              flat
              class="action-btn"
              no-caps
            >
              <q-icon name="history" size="18px" class="action-icon" />
              <span class="action-label">{{ $t('History', {}, 'History') }}</span>
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
import { fetchTokensList } from 'src/wallet/cauldron/tokens'
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
      loadingTokenPrice: false,
      // Cauldron market data (liquidity, 24h change) for the token
      cauldronTokenData: null,
      // Active slide of the token market-info carousel
      marketSlide: 'price'
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
    },
    tokenPriceBch () {
      if (!this.asset?.id || this.asset.id === 'bch') return null
      const price = this.$store.getters['market/getAssetPrice'](this.asset.id, 'BCH')
      if (!price || price === 0) return null
      return Number(price)
    },
    formattedTokenPriceBch () {
      const price = this.tokenPriceBch
      if (!price) return null
      // A price below one satoshi would render as "0 BCH"; express it in sats instead
      if (price < 1e-8) {
        const sats = price * 1e8
        return `${sats.toFixed(4).replace(/\.?0+$/, '')} sats`
      }
      // BCH is divisible up to 8 decimals; trim trailing zeros for readability
      const value = price.toFixed(8).replace(/\.?0+$/, '')
      return `${value} BCH`
    },
    isCauldronToken () {
      return !!this.asset?.id?.startsWith?.('ct/')
    },
    cauldronTokenUrl () {
      // Only surface the link once Cauldron confirms the token is listed
      if (!this.isCauldronToken || !this.cauldronTokenData) return null
      const tokenId = this.asset.id.replace('ct/', '')
      return `https://app.cauldron.quest/swap/${tokenId}`
    },
    bchSelectedPrice () {
      const currency = this.selectedCurrency?.symbol
      if (!currency) return null
      const price = this.$store.getters['market/getAssetPrice']('bch', currency)
      if (!price || price === 0) return null
      return Number(price)
    },
    liquidityValue () {
      const tvlSats = Number(this.cauldronTokenData?.tvl_sats)
      if (!isFinite(tvlSats) || tvlSats <= 0) return null
      // Matches the BCH-side liquidity shown on the Cauldron token details page
      const bch = tvlSats / 1e8
      const fiat = this.bchSelectedPrice ? bch * this.bchSelectedPrice : null
      return { bch, fiat }
    },
    liquidityFiatFormatted () {
      if (!this.liquidityValue || this.liquidityValue.fiat == null) return null
      return this.parseFiatCurrency(this.liquidityValue.fiat.toFixed(2), this.selectedCurrency?.symbol)
    },
    liquidityBchFormatted () {
      if (!this.liquidityValue) return null
      return `${this.liquidityValue.bch.toFixed(2)} BCH`
    },
    change24hPercent () {
      const bp = this.cauldronTokenData?.change_24h_bp
      if (bp == null) return null
      const value = Number(bp)
      if (!isFinite(value)) return null
      return value / 100
    },
    priceChangeDirection () {
      const value = this.change24hPercent
      if (value == null || value === 0) return 'flat'
      return value > 0 ? 'up' : 'down'
    },
    priceChangeIcon () {
      if (this.priceChangeDirection === 'up') return 'mdi-trending-up'
      if (this.priceChangeDirection === 'down') return 'mdi-trending-down'
      return 'mdi-trending-neutral'
    },
    priceChangeClass () {
      if (this.priceChangeDirection === 'up') return 'text-green-6'
      if (this.priceChangeDirection === 'down') return 'text-red-6'
      return this.darkMode ? 'text-grey-4' : 'text-grey-7'
    },
    hasMultipleMarketSlides () {
      return !!this.liquidityValue || this.change24hPercent !== null || !!this.cauldronTokenUrl
    },
    carouselHeight () {
      return this.hasMultipleMarketSlides ? '150px' : '112px'
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
        this.cauldronTokenData = null
        this.marketSlide = 'price'
        this.asset = asset
        this.$refs.dialog.show()

        // Load Cauldron market data (liquidity, 24h change, trading page link) for CashTokens
        if (asset.id?.startsWith?.('ct/')) {
          this.loadCauldronTokenData(asset.id.replace('ct/', ''))
        }

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
            // For tokens, also request the BCH price so we can show it natively
            await this.$store.dispatch('market/updateAssetPrices', { 
              assetId: asset.id,
              clearExisting: false,
              customCurrency: asset.id !== 'bch' ? 'BCH' : null
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
    viewHistory () {
      this.hide()
      this.$router.push({
        name: 'transaction-list',
        query: {
          assetID: this.asset.id
        }
      })
    },
    cauldronSwap() {
      this.$router.push({
        name: 'app-cauldron',
        query: {
          selectTokenId: this.asset.id?.replace('ct/', ''),
          // Swap the token for BCH (token as origin, BCH as destination)
          sellToken: 'true',
          backPath: this.$route.fullPath
        }
      })
    },
    async loadCauldronTokenData (tokenId) {
      if (!tokenId) return
      try {
        const tokens = await fetchTokensList({ token_id: tokenId })
        // Guard against stale responses if another asset was opened meanwhile
        if (this.asset?.id !== `ct/${tokenId}`) return
        this.cauldronTokenData = tokens?.[0] || null
      } catch (error) {
        console.debug('Cauldron market data not available for token:', tokenId, error)
      }
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

.price-change-chip {
  font-size: 14px;

  :deep(.q-chip__content) {
    font-size: 14px;
  }
}

// Token Price Section
.token-price-section {
  max-width: 100%;

  .token-price-carousel {
    background: transparent;

    :deep(.q-carousel__slide) {
      padding-left: 34px;
      padding-right: 34px;
      padding-bottom: 12px;
    }

    .price-label {
      opacity: 0.8;
    }

    .price-value {
      color: inherit;
      line-height: 1.15;
    }

    .price-per-token {
      opacity: 0.7;
    }
  }
}

// Explorer link (under the token name)
.view-explorer-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--q-primary);
  font-size: 12px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 123, 246, 0.08);
  }

  &.dark {
    color: #4ade80;

    &:hover {
      background: rgba(74, 222, 128, 0.1);
    }
  }
}

// Action Buttons (Send, Receive, History)
.action-buttons {
  padding-top: 8px;
  
  .action-buttons-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  
  .action-btn {
    flex: 0 1 calc(33.333% - 6px);
    min-width: 0;
    font-weight: 500;
    font-size: 13px;
    border-radius: 12px;
    padding: 10px 6px;
    color: var(--q-primary);
    background: rgba(59, 123, 246, 0.08);
    box-shadow: none;
    transition: background 0.2s ease, transform 0.2s ease;
    min-height: 52px;

    :deep(.q-btn__content) {
      gap: 5px;
    }
    
    .action-icon {
      opacity: 0.9;
      transition: transform 0.2s ease;
      font-size: 22px;
    }
    
    .action-label {
      font-weight: 500;
      line-height: 1.2;
      font-size: 12px;
      white-space: nowrap;
    }
    
    &:hover {
      background: rgba(59, 123, 246, 0.16);
      
      .action-icon {
        transform: scale(1.08);
      }
    }
    
    &:active {
      transform: scale(0.97);
    }
  }
  
  @media (max-width: 360px) {
    .action-btn {
      flex: 1 1 calc(50% - 4px);
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

<template>
  <div class="transaction-detail-wrapper" :class="getDarkModeClass(darkMode)" :style="wrapperBackgroundStyle">
    <div class="transaction-detail-header-wrapper">
      <header-nav :title="$t('Transaction', {}, 'Transaction')" class="header-nav apps-header" @click:left="goBack" />
    </div>
    
    <div class="transaction-detail-content-wrapper" :class="getDarkModeClass(darkMode)">
      <div v-if="loadError" class="q-pa-md text-center">
        <div class="text-subtitle1 q-mb-sm">{{ loadError }}</div>
        <q-btn outline color="primary" no-caps @click="goBack">{{ $t('Back', {}, 'Back') }}</q-btn>
      </div>

      <div v-else-if="tx && tx.asset" class="q-pa-lg">
        <div class="text-bow text-center content-container-ss" :class="getDarkModeClass(darkMode)">
        <!-- Page title and direction icon -->
        <div class="text-center page-title text-uppercase">
          <template v-if="tx.record_type === 'incoming'">{{ $t('Received') }}</template>
          <template v-else>{{ $t('Sent') }}</template>
        </div>
        <div class="row justify-center q-mt-sm q-mb-md" style="margin-top: 12px;">
          <div class="direction-icon-container" :class="getDarkModeClass(darkMode)">
            <q-icon :name="tx.record_type === 'incoming' ? 'arrow_downward' : 'arrow_upward'" class="direction-icon" />
          </div>
        </div>

        <!-- Amount block (mirrors SendSuccessBlock proportions) -->
        <div class="amount-block q-mt-md text-center section-block-ss">
          <div class="row justify-center q-gutter-sm amount-row-ss" style="margin-top: 25px;">
            <q-avatar size="40px" class="amount-avatar-ss"><img :src="getImageUrl(tx.asset)" alt="asset-logo" /></q-avatar>
            <div class="amount-label-ss">{{ displayAmountText }}</div>
          </div>
          <div v-if="displayFiatAmount !== null && displayFiatAmount !== undefined" class="amount-fiat-label-ss">
            {{ parseFiatCurrency(displayFiatAmount, selectedMarketCurrency) }}
          </div>
        </div>

        <!-- Reference ID (big, spaced, with separator) -->
        <div class="reference-id-section section-block-ss q-mt-lg" style="margin-top: 25px;">
          <div class="text-grey text-weight-medium text-caption">&nbsp;{{ $t('ReferenceId')}}</div>
          <div class="reference-id-value-ss">{{ hexToRef(tx.txid.substring(0, 6)) }}</div>
          <q-separator color="grey" class="q-mt-sm ref-separator-ss"/>
        </div>

        <!-- Transaction ID block (copyable with explorer link below) -->
        <div class="transaction-id-section section-block-ss q-mt-md" style="margin-top: 25px;">
          <div class="text-grey text-weight-medium text-caption q-mb-sm">&nbsp;{{ $t('TransactionId')}}</div>
          <div class="txid-container-ss" :class="getDarkModeClass(darkMode)" @click="copyToClipboard(tx.txid)">
            <span class="txid-text-ss">{{ tx.txid.slice(0, 8) }}...{{ tx.txid.slice(-8) }}</span>
            <q-icon name="content_copy" size="18px" class="copy-icon-ss" />
          </div>
          <div class="view-explorer-container q-mt-sm">
            <a class="view-explorer-link-ss" :class="getDarkModeClass(darkMode)" :href="explorerLink" target="_blank">
              <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
              {{ $t('ViewInExplorer') }}
            </a>
          </div>
        </div>

        <div class="text-grey text-weight-medium text-caption" style="margin-top: 14px;">&nbsp;{{ $t('DateAndTime', {}, 'Date & Time') }}</div>
        <div class="date-prominent q-mt-xs q-mb-lg date-block-ss" :class="getDarkModeClass(darkMode)" style="margin-top: 10px;">
          {{ formatDate(tx.tx_timestamp || tx.date_created) }}
        </div>

        

        <!-- Memo Section (mirrors SendSuccessBlock styling, centered) -->
        <div class="memo-section section-block-ss q-mt-lg q-mb-md">
          <div v-if="hasMemo || editingMemo" class="text-grey text-weight-medium text-caption q-mb-sm text-center">{{ $t('Memo') }}</div>
          <div class="row justify-center">
            <div class="col-12 col-md-8 q-px-md">
              <q-slide-transition>
                <div v-if="!editingMemo">
                  <div v-if="hasMemo" class="memo-display-container">
                    <div class="memo-content-container" :class="getDarkModeClass(darkMode)">
                      <div class="memo-text">{{ transactionMemo }}</div>
                      <div class="memo-actions">
                        <q-btn flat icon="edit" size="sm" padding="xs sm" @click="openMemo()"/>
                        <q-separator vertical :dark="darkMode"/>
                        <q-btn flat icon="delete" size="sm" padding="xs sm" color="red-7" @click="confirmDelete()"/>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <q-item-section class="q-pt-sm text-center">
                      <q-btn outline no-caps :label="$t('AddMemo', {}, 'Add memo')" icon="add" color="grey-7" class="br-15" padding="xs md" :disable="networkError" @click="openMemo()"/>
                    </q-item-section>
                  </div>
                </div>
                <q-item v-else style="overflow-wrap: anywhere;">
                  <q-item-section>
                    <q-item-label>
                      <div class="row items-start justify-center">
                        <div class="col q-pr-sm">
                          <input ref="memoInputRef" v-model="memoInput" type="text" class="memo-input" :class="darkMode ? 'memo-input-dark' : 'memo-input-light'" :placeholder="`${$t('EnterMemo', {}, 'Enter memo')}...`" style="width: 100%; border: none; outline: none; font-size: 14px; padding: 8px 12px; font-family: inherit; border-radius: 4px;" @keyup.enter="saveMemo()" @keyup.esc="cancelEditMemo()"/>
                        </div>
                        <div class="row items-center no-wrap">
                          <q-btn flat icon="check" size="sm" padding="xs sm" color="primary" :disable="!memoInput || memoInput === transactionMemo" @click="saveMemo()"/>
                          <q-separator vertical :dark="darkMode"/>
                          <q-btn flat icon="close" size="sm" padding="xs sm" @click="cancelEditMemo()"/>
                        </div>
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-slide-transition>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { cachedLoadWallet } from 'src/wallet'
import axios from 'axios'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { fetchMemo, createMemo, updateMemo, deleteMemo, encryptMemo, decryptMemo, authMemo } from 'src/utils/transaction-memos.js'
import { getKeypair } from 'src/exchange/chat/keys'
import { hexToRef as hexToRefUtil } from 'src/utils/reference-id-utils'

export default {
  name: 'TransactionDetailPage',
  components: { headerNav },
  props: {
    txid: String
  },
  data () {
    return {
      wallet: null,
      denominationTabSelected: 'BCH',
      loadError: '',
      tx: null,
      // memo state
      transactionMemo: '',
      memoInput: '',
      editingMemo: false,
      hasMemo: false,
      networkError: false,
      keypair: null,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    explorerLink () {
      const txid = this.tx && this.tx.txid
      let url = 'https://explorer.paytaca.com/tx/'
      if (this.$store.getters['global/isChipnet']) {
        url = `${process.env.TESTNET_EXPLORER_URL}/tx/`
      }
      return `${url}${txid || ''}`
    },
    displayAmountText () {
      if (!this.tx) return ''
      const denom = (this.denominationTabSelected === this.$t('DEEM') || this.denominationTabSelected === 'BCH')
        ? this.denominationTabSelected
        : this.$store.getters['global/denomination']
      return `${parseAssetDenomination(denom, { ...this.tx.asset, balance: Math.abs(Number(this.tx.amount)) })}`
    },
    displayFiatAmount () {
      if (!this.tx) return null
      const code = this.selectedMarketCurrency
      const provided = code && this.tx?.fiat_amounts ? this.tx.fiat_amounts[code] : undefined
      const numeric = Number(provided)
      if (Number.isFinite(numeric)) return Math.abs(numeric)
      const price = (this.tx.usd_price && code === 'USD')
        ? this.tx.usd_price
        : (this.tx.market_prices && this.tx.market_prices[code])
      if (!price) return null
      let base = Math.abs(Number(this.tx.amount)) * Number(price)
      // Adjust for token decimals similar to list item computation
      const assetId = String(this.tx?.asset?.id || '')
      if (assetId && assetId !== 'bch') {
        const decimals = parseInt(this.tx?.asset?.decimals) || 0
        if (decimals > 0) base = base / (10 ** decimals)
      }
      return base
    },
    txFeeMarketValue () {
      if (!this.tx) return ''
      const bchMarketValue = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      if (!bchMarketValue) return ''
      const gas = this.tx.tx_fee / (10 ** 8)
      return (Number(gas) * Number(bchMarketValue))
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    wrapperBackgroundStyle () {
      const theme = this.theme
      const isDark = this.darkMode
      
      // Map of themes to their background colors [dark, light]
      const themeBackgrounds = {
        'glassmorphic-blue': {
          dark: '#273746',
          light: '#ecf3f3'
        },
        'glassmorphic-gold': {
          dark: '#3d3224',
          light: '#fff8e1'
        },
        'glassmorphic-green': {
          dark: '#263d32',
          light: '#e8f5e9'
        },
        'glassmorphic-red': {
          dark: '#462733',
          light: '#f3ecec'
        }
      }
      
      // Default to blue theme if theme not found
      const bgColors = themeBackgrounds[theme] || themeBackgrounds['glassmorphic-blue']
      const backgroundColor = isDark ? bgColors.dark : bgColors.light
      
      return {
        backgroundColor: backgroundColor
      }
    }
  },
  async mounted () {
    await this.initWallet()
    
    // Ensure HTML and body have the correct background color to match our wrapper
    this.updateBackgroundColors()
    
    const preloaded = (window && window.history && window.history.state && window.history.state.tx) || null
    if (preloaded) {
      this.attachAssetIfMissing(preloaded)
      this.tx = preloaded
      this.$nextTick(() => this.loadMemo())
      return
    }

    this.fetchAndShow()
  },
  beforeUnmount () {
    // Reset background colors
    const htmlEl = document.documentElement
    const bodyEl = document.body
    if (htmlEl) {
      htmlEl.style.backgroundColor = ''
    }
    if (bodyEl) {
      bodyEl.style.backgroundColor = ''
    }
  },
  watch: {
    theme () {
      this.updateBackgroundColors()
    },
    darkMode () {
      this.updateBackgroundColors()
    }
  },
  methods: {
    getDarkModeClass,
    parseFiatCurrency,
    getAssetDenomination,
    parseAssetDenomination,
    updateBackgroundColors () {
      this.$nextTick(() => {
        const backgroundColor = this.wrapperBackgroundStyle.backgroundColor
        const htmlEl = document.documentElement
        const bodyEl = document.body
        if (htmlEl) {
          htmlEl.style.backgroundColor = backgroundColor
        }
        if (bodyEl) {
          bodyEl.style.backgroundColor = backgroundColor
        }
      })
    },
    hexToRef (hex6) {
      return hexToRefUtil(hex6)
    },
    async fetchAndShow () {
      try {
        const effectiveWalletHash = this.walletHash || this.$store.getters['global/getWallet']('bch')?.walletHash
        const effectiveTxid = this.txid
        if (!effectiveWalletHash || !effectiveTxid) {
          this.loadError = this.$t('TransactionNotFound', {}, 'Transaction not found')
          return
        }
        const baseUrl = getWatchtowerApiUrl(this.$store.getters['global/isChipnet'])
        // Prefer explicit query param; fallback to preloaded tx.asset.id (ct/{cat} | slp/{cat})
        let categoryParam = this.$route?.query?.category || ''
        if (!categoryParam) {
          const preloaded = (window && window.history && window.history.state && window.history.state.tx) || null
          const assetId = String(preloaded?.asset?.id || '')
          const parts = assetId.split('/')
          if (parts.length === 2 && (parts[0] === 'ct' || parts[0] === 'slp')) {
            categoryParam = parts[1]
          }
        }
        const categoryPath = categoryParam ? `/${categoryParam}` : ''
        const url = `${baseUrl}/history/wallet/${encodeURIComponent(effectiveWalletHash)}${categoryPath}/`
        const { data } = await axios.get(url, { params: { txids: effectiveTxid } })
        const tx = Array.isArray(data?.history) ? data.history[0] : (Array.isArray(data) ? data[0] : data)

        if (tx) {
          // Prefer preloaded asset metadata (logo, symbol) if available
          const preloaded = (window && window.history && window.history.state && window.history.state.tx) || null
          if (preloaded?.asset) {
            tx.asset = preloaded.asset
          }
          this.attachAssetIfMissing(tx, categoryParam)
          this.tx = tx
          this.$nextTick(() => {
            this.loadMemo()
          })
        } else {
          this.loadError = this.$t('TransactionNotFound', {}, 'Transaction not found')
        }
      } catch (err) {
        this.loadError = this.$t('FailedToLoadTransaction', {}, 'Failed to load transaction')
      }
    },
    async loadMemo () {
      try {
        if (!this.tx?.txid) return
        // prepare keypair
        this.keypair = await getKeypair().catch(console.error)
        let currentMemo = null
        try {
          currentMemo = await fetchMemo(this.tx.txid)
        } catch (err) {
          this.networkError = true
        }
        if (currentMemo && !('error' in currentMemo)) {
          const decryptedNote = await decryptMemo(this.keypair?.privkey, currentMemo.note)
          this.transactionMemo = decryptedNote
          this.memoInput = decryptedNote
          this.hasMemo = !!decryptedNote
          this.editingMemo = false
        } else {
          this.hasMemo = false
          this.editingMemo = false
        }
      } catch (error) {
        this.networkError = true
        this.hasMemo = false
        this.editingMemo = false
      }
    },
    openMemo () {
      this.editingMemo = true
      this.$nextTick(() => {
        if (this.$refs.memoInputRef) this.$refs.memoInputRef.focus()
      })
    },
    cancelEditMemo () {
      this.memoInput = this.transactionMemo
      this.editingMemo = false
    },
    async saveMemo () {
      try {
        if (!this.tx?.txid) return
        await authMemo()
        // ensure keypair
        if (!this.keypair) this.keypair = await getKeypair().catch(console.error)
        const trimmedMemo = String(this.memoInput || '').trim()
        if (!trimmedMemo) return
        const encryptedMemo = await encryptMemo(this.keypair?.privkey, this.keypair?.pubkey, trimmedMemo)
        const data = { txid: this.tx.txid, note: encryptedMemo }
        let response = null
        if (this.hasMemo) response = await updateMemo(data).catch(err => { this.networkError = true })
        else response = await createMemo(data).catch(err => { this.networkError = true })
        if (response && !('error' in response)) {
          this.transactionMemo = trimmedMemo
          this.memoInput = trimmedMemo
          this.hasMemo = true
          this.editingMemo = false
          
          this.$q.notify({
            message: this.$t('MemoSaved', {}, 'Memo saved'),
            color: 'positive',
            icon: 'check_circle',
            position: 'top',
            timeout: 2000
          })
        } else {
          this.$q.notify({
            message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 2000
          })
        }
      } catch (error) {
        this.networkError = true
        this.$q.notify({
          message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }
    },
    async confirmDelete () {
      try {
        if (!this.tx?.txid) return
        await deleteMemo(this.tx.txid)
        this.hasMemo = false
        this.transactionMemo = ''
        this.memoInput = ''
        this.editingMemo = false
        
        this.$q.notify({
          message: this.$t('MemoDeleted', {}, 'Memo deleted'),
          color: 'positive',
          icon: 'check_circle',
          position: 'top',
          timeout: 2000
        })
      } catch (error) {
        this.networkError = true
        this.$q.notify({
          message: this.$t('ErrorDeletingMemo', {}, 'Error deleting memo'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }
    },
    async initWallet () {
      // Load BCH wallet (consistent with transactions page)
      const wallet = await cachedLoadWallet('BCH', this.$store.getters['global/getWalletIndex'])
      this.wallet = wallet
    },
    attachAssetIfMissing (tx, categoryParam) {
      if (!tx) return
      if (tx.asset && tx.asset.id) return

      // Try to resolve token asset from category
      if (categoryParam) {
        try {
          const assets = this.$store.getters['assets/getAssets'] || []
          const match = assets.find(a => String(a?.id || '').endsWith(`/${categoryParam}`))
          if (match) {
            tx.asset = match
            return
          }
        } catch {}
      }

      // Fallback to BCH
      let bchAsset = this.$store.getters['assets/getAsset'] && this.$store.getters['assets/getAsset']('bch')
      if (Array.isArray(bchAsset)) bchAsset = bchAsset[0]
      if (!bchAsset) {
        bchAsset = { id: 'bch', symbol: 'BCH', name: 'Bitcoin Cash', logo: 'bch-logo.png', balance: 0 }
      }
      tx.asset = bchAsset
    },
    goBack () {
      if (window.history.length > 1) {
        this.$router.back()
      } else {
        this.$router.push({ name: 'transaction-list' })
      }
    },
    formatDate (date) {
      const dateObj = new Date(date)
      const langs = [this.$store.getters['global/language'], 'en-US']
      return new Intl.DateTimeFormat(langs, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(dateObj)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({ color: 'blue-9', message: this.$t('CopiedToClipboard'), icon: 'mdi-clipboard-check', timeout: 200 })
    },
    getImageUrl (asset) {
      if (this.denominationTabSelected === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
            return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
          } else {
            return asset.logo
          }
        } else {
          return 'bch-logo.png'
        }
      }
    }
  }
}
</script>

<style scoped>
.minimal-card {
  border-radius: 14px;
  padding: 16px 14px;
}
.page-title { font-size: 28px; letter-spacing: 1px; }
.direction-icon-container {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
}
.direction-icon-container.dark {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.direction-icon-container.light {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.direction-icon-container .direction-icon {
  font-size: 32px;
  margin: 0;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.amount-primary { font-size: 20px; }
.amount-label-ss { font-size: 28px; font-weight: 600; margin-top: -4px; margin-bottom: 4px; }
.amount-fiat-label-ss { font-size: 20px; opacity: 0.85; margin-top: 0; }
.amount-big { font-size: 30px; }
.amount-secondary { font-size: 13px; opacity: 0.9; }
.amount-row-ss { align-items: center !important; }
.amount-avatar-ss { margin-top: -10px; }
.amount-avatar-ss img { display: block; }
.amount-label-ss { line-height: 1; display: inline-block; }
.meta { margin-top: 8px; text-align: center; }
.meta-row { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 0; }
.meta-label { opacity: 0.8; font-size: 12px; }
.meta-value { font-size: 13px; }
.monospace { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.meta-link { text-decoration: none; font-size: 13px; }

/* Reference + Txid blocks to mirror SendSuccessBlock */
.reference-id-value-ss {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 8px;
  margin-top: 8px;
  font-family: 'Courier New', monospace;
}
.txid-container-ss {
  cursor: pointer;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
}
.txid-container-ss:hover {
  background: rgba(128, 128, 128, 0.15);
  border-color: rgba(128, 128, 128, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.txid-text-ss {
  font-family: 'Courier New', monospace;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.copy-icon-ss { opacity: 0.7; transition: all 0.2s ease; }
.view-explorer-link-ss { display: inline-flex; align-items: center; text-decoration: none; font-size: 15px; font-weight: 500; padding: 8px 16px; border-radius: 8px; color: var(--q-primary); transition: all 0.2s ease; }
.view-explorer-link-ss:hover { background: rgba(0, 128, 0, 0.08); transform: translateX(2px); }
.view-explorer-link-ss.dark { color: #4ade80; }
.date-prominent { text-align: center; font-size: 16px; font-weight: 500; }
.date-prominent.dark { color: rgba(255,255,255,0.85); }
.date-prominent:not(.dark) { color: rgba(0,0,0,0.85); }
.content-container-ss { min-width: 320px; max-width: 700px; margin: 0 auto; padding-top: 8px; }
.section-block-ss { margin-top: 12px; }
.date-block-ss { opacity: 0.9; }

/* New wrapper structure - completely independent of sticky-header-container */
.transaction-detail-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  /* Ensure wrapper fills at least the viewport but doesn't force extra height */
  min-height: 100vh;
  /* But also ensure it doesn't create extra space beyond content */
  /* Background color is set dynamically via :style binding based on theme */
}


.transaction-detail-header-wrapper {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  flex-shrink: 0;
}

.transaction-detail-content-wrapper {
  flex: 1;
  width: 100%;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.transaction-detail-content-wrapper .content-container-ss {
  padding-bottom: 0;
}

.transaction-detail-content-wrapper .memo-section {
  margin-bottom: 20px;
}

/* Fix header title cut-off on mobile */
@media (max-width: 600px) {
  .transaction-detail-wrapper .apps-header .pt-header {
    padding-left: 2px !important;
    padding-right: 2px !important;
    overflow: visible !important;
  }
  
  .transaction-detail-wrapper .apps-header .pt-header .col-1:first-child {
    flex: 0 0 32px !important;
    max-width: 32px !important;
    min-width: 32px !important;
    padding-right: 0 !important;
  }
  
  .transaction-detail-wrapper .apps-header .pt-header .col-10 {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    max-width: none !important;
    padding-left: 2px !important;
    padding-right: 2px !important;
    overflow: visible !important;
  }
  
  .transaction-detail-wrapper .apps-header .pt-header .col-10 p {
    line-height: 1.3 !important;
    white-space: normal !important;
    overflow: visible !important;
    word-break: break-word !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .transaction-detail-wrapper .apps-header .pt-header .col-1:last-child {
    flex: 0 0 32px !important;
    max-width: 32px !important;
    min-width: 32px !important;
    padding-left: 0 !important;
  }
}

/* Make the Reference ID separator span the full viewport width */
.ref-separator-ss {
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* Memo styles mirroring SendSuccessBlock */
.memo-display-container { display: flex; justify-content: center; margin-bottom: 12px; }
.memo-content-container {
  cursor: default;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
  max-width: 100%;
}
.memo-text { flex: 1; word-break: break-word; white-space: pre-wrap; font-size: 14px; line-height: 1.5; }
.memo-actions { display: flex; align-items: center; flex-shrink: 0; }
.memo-input.memo-input-dark { background-color: rgba(255, 255, 255, 0.1); color: white; }
.memo-input.memo-input-light { background-color: rgba(0, 0, 0, 0.05); color: black; }

</style>



<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card class="send-bch-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="dialog-header">
        <div class="text-h6">{{ command === 'tip' ? $t('Tip', {}, 'Tip') : $t('Send', {}, 'Send') }}</div>
        <q-btn icon="close" flat round dense @click="onCancel" :disable="sending" />
      </q-card-section>

      <!-- Sending overlay -->
      <div v-if="sending" class="sending-overlay" :class="getDarkModeClass(darkMode)">
        <q-spinner-dots size="40px" color="primary" />
        <div class="sending-text">{{ $t('Sending', {}, 'Sending...') }}</div>
      </div>

      <q-card-section class="q-pt-none" :class="{ 'dimmed': sending }">
        <!-- Asset selector -->
        <div class="asset-selector" :class="getDarkModeClass(darkMode)" @click="showAssetPicker = true">
          <div class="asset-selector-left">
            <div class="asset-icon bg-grad">
              <img
                :src="getImageUrl(selectedAsset)"
                class="asset-icon-img"
                alt=""
                @contextmenu.prevent
                @selectstart.prevent
              />
            </div>
            <div class="asset-info">
              <div class="asset-name">{{ selectedAsset.name }}</div>
              <div class="asset-symbol">{{ selectedAsset.symbol }}</div>
            </div>
          </div>
          <q-icon name="expand_more" size="20px" class="asset-chevron" :class="getDarkModeClass(darkMode)" />
        </div>

        <!-- Amount input -->
        <div class="amount-input-section" :class="getDarkModeClass(darkMode)">
          <q-input
            ref="amountInput"
            v-model="amountInput"
            type="text"
            inputmode="none"
            borderless
            dense
            class="amount-q-input"
            :class="getDarkModeClass(darkMode)"
            :placeholder="$t('EnterAmount', {}, '0')"
            @focus="customKeyboardState = 'show'"
            @keydown.prevent
          />
          <button
            v-if="selectedAsset.id === 'bch'"
            class="amount-unit-toggle"
            :class="getDarkModeClass(darkMode)"
            :disabled="!bchPriceInFiat"
            @click="toggleInputMode"
          >
            {{ amountUnit }}
            <q-icon name="swap_vert" size="16px" />
          </button>
          <span v-else class="amount-unit-static" :class="getDarkModeClass(darkMode)">
            {{ selectedAsset.symbol }}
          </span>
        </div>

        <!-- Conversion display (BCH only) -->
        <div v-if="selectedAsset.id === 'bch' && conversionDisplay" class="fiat-conversion" :class="getDarkModeClass(darkMode)">
          ≈ {{ conversionDisplay }}
        </div>

        <!-- Recipient -->
        <div class="recipient-info">
          <div class="recipient-label">{{ $t('To', {}, 'To') }}</div>
          <div class="recipient-address" :class="getDarkModeClass(darkMode)">
            <q-avatar size="24px" class="recipient-avatar">
              <span class="avatar-initial">{{ recipientInitial }}</span>
            </q-avatar>
            <div class="recipient-details">
              <div class="recipient-name" :class="getDarkModeClass(darkMode)">{{ recipientName }}</div>
              <div class="recipient-npub">{{ recipientNpub }}</div>
            </div>
          </div>
        </div>

        <!-- Published address -->
        <div v-if="publishedAddress && !fetchingAddress" class="published-address q-mt-md">
          <div class="published-label">
            <q-icon name="verified" size="16px" color="positive" />
            <span>{{ $t('PublishedAddress', {}, 'Published Address') }}</span>
          </div>
          <div class="published-value" :class="getDarkModeClass(darkMode)">{{ publishedAddress }}</div>
        </div>

        <!-- No published address -->
        <div v-if="addressLookupDone && !publishedAddress && !fetchingAddress" class="no-address q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-icon name="info" size="16px" color="grey-5" />
          <span>{{ $t('NoPublishedAddress', {}, 'This user has not published a BCH address. Paste their address below.') }}</span>
        </div>

        <!-- Address input (only when no published address) -->
        <div v-if="!publishedAddress" class="address-input-section q-mt-md">
          <div class="address-label">{{ $t('RecipientAddress', {}, 'Recipient BCH Address') }}</div>
          <q-input
            v-model="editableAddress"
            outlined
            dense
            placeholder="bitcoincash:..."
            :error="!addressValid && editableAddress.length > 0"
            :error-message="$t('InvalidAddress', {}, 'Invalid address')"
            class="address-field"
            @update:model-value="onAddressChange"
          >
            <template #append>
              <q-btn
                v-if="editableAddress"
                flat
                dense
                round
                icon="clear"
                size="sm"
                @click="editableAddress = ''"
              />
            </template>
          </q-input>
        </div>

        <!-- Loading state -->
        <div v-if="fetchingAddress" class="fetching-status q-mt-sm">
          <q-spinner size="16px" />
          <span>{{ $t('LookingUpAddress', {}, 'Looking up address from Nostr profile...') }}</span>
        </div>
      </q-card-section>

      <CustomKeyboard
        :custom-keyboard-state="customKeyboardState"
        @addKey="onKeyboardKey"
        @makeKeyAction="onKeyboardAction"
      />

      <div class="swipe-container q-px-md q-pb-md" :class="{ 'dimmed': sending }">
        <DragSlide
          :disable="sending || !canSend || !amountIsValid"
          disable-absolute-bottom
          @swiped="onSwiped"
        />
      </div>

      <!-- Asset picker bottom sheet -->
      <q-dialog v-model="showAssetPicker" position="bottom">
        <q-card class="asset-picker-card" :class="getDarkModeClass(darkMode)">
          <q-card-section class="asset-picker-header">
            <div class="text-subtitle1 text-weight-medium">{{ $t('SelectAsset', {}, 'Select Asset') }}</div>
            <q-btn icon="close" flat round dense @click="showAssetPicker = false" />
          </q-card-section>
          <q-card-section class="q-pt-none">
            <template v-for="(group, gi) in groupedAssets" :key="gi">
              <div
                v-if="group.type === 'favorites-label'"
                class="section-label"
                :class="getDarkModeClass(darkMode)"
              >
                {{ $t('Favorites').toLocaleUpperCase() }}
              </div>
              <div
                v-else-if="group.asset"
                class="asset-picker-item"
                :class="[getDarkModeClass(darkMode), { 'asset-picker-active': group.asset.id === selectedAsset.id }]"
                @click="selectAsset(group.asset)"
              >
                <div class="asset-icon-sm bg-grad">
                  <img
                    :src="getImageUrl(group.asset)"
                    class="asset-icon-img-sm"
                    alt=""
                    @contextmenu.prevent
                    @selectstart.prevent
                  />
                </div>
                <div class="asset-picker-info">
                  <div class="asset-picker-name" :class="getDarkModeClass(darkMode)">{{ group.asset.name }}</div>
                  <div class="asset-picker-balance" :class="getDarkModeClass(darkMode)">
                    {{ formatAssetBalance(group.asset) }}
                  </div>
                </div>
                <q-icon v-if="group.asset.id === selectedAsset.id" name="check" size="20px" color="primary" />
              </div>
            </template>
          </q-card-section>
        </q-card>
      </q-dialog>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { validateAddress, getChangeAddress } from 'src/utils/send-page-utils'
import { getWalletByNetwork, getWatchtowerApiUrl, convertTokenAmount } from 'src/wallet/chipnet'
import { convertIpfsUrl } from 'src/wallet/cashtokens'
import { cachedLoadWallet } from 'src/wallet'
import { Address } from 'src/wallet'
import { toTokenAddress } from 'src/utils/crypto'
import { npubEncode } from 'nostr-tools/nip19'
import { parseFiatCurrency, formatWithLocale, parseLocaleNumber } from 'src/utils/denomination-utils'
import { convertToFiatAmount, convertFiatToSelectedAsset } from 'src/utils/send-page-utils'
import { parseKey } from 'src/utils/custom-keyboard-utils'
import DragSlide from 'src/components/drag-slide.vue'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import axios from 'axios'

export default {
  name: 'SendBchDialog',
  components: { DragSlide, CustomKeyboard },
  props: {
    command: { type: String, default: 'send' },
    amount: { type: Number, default: 0 },
    recipientPubKey: { type: String, required: true },
    recipientName: { type: String, default: '' },
    preFilledAddress: { type: String, default: '' },
  },
  emits: ['ok', 'cancel'],
  data () {
    return {
      showDialog: true,
      sending: false,
      wallet: null,
      editableAddress: '',
      addressValid: false,
      validatedAddress: '',
      publishedAddress: '',
      fetchingAddress: false,
      addressLookupDone: false,
      amountInput: '',
      customKeyboardState: 'dismiss',
      inputMode: 'fiat',
      showAssetPicker: false,
      selectedAsset: { id: 'bch', name: 'Bitcoin Cash', symbol: 'BCH', logo: 'bch-logo.png' },
      availableAssets: [],
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    recipientNpub () {
      try {
        const npub = npubEncode(this.recipientPubKey)
        return npub.slice(0, 12) + '...' + npub.slice(-8)
      } catch {
        return this.recipientPubKey?.slice(0, 12) + '...'
      }
    },
    recipientInitial () {
      return this.recipientName?.charAt(0)?.toUpperCase() || '?'
    },
    canSend () {
      return !!this.publishedAddress || (this.addressValid && !!this.validatedAddress)
    },
    parsedAmount () {
      const val = parseLocaleNumber(this.amountInput)
      return isNaN(val) ? 0 : val
    },
    amountIsValid () {
      return this.parsedAmount > 0
    },
    selectedMarketCurrency () {
      return this.$store.getters['market/selectedCurrency']?.symbol || 'USD'
    },
    bchPriceInFiat () {
      return this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
    },
    bchAmount () {
      if (!this.parsedAmount) return 0
      if (this.selectedAsset.id !== 'bch') return this.parsedAmount
      if (this.inputMode === 'bch') return this.parsedAmount
      if (!this.bchPriceInFiat) return 0
      return Number(convertFiatToSelectedAsset(this.parsedAmount, this.bchPriceInFiat, 8))
    },
    fiatAmount () {
      if (!this.parsedAmount) return 0
      if (this.inputMode === 'fiat') return this.parsedAmount
      if (!this.bchPriceInFiat) return 0
      return Number(convertToFiatAmount(this.parsedAmount, this.bchPriceInFiat))
    },
    amountUnit () {
      return this.inputMode === 'bch' ? this.selectedAsset.symbol : this.selectedMarketCurrency
    },
    conversionDisplay () {
      if (!this.parsedAmount) return null
      if (this.inputMode === 'bch') {
        if (!this.fiatAmount) return null
        return parseFiatCurrency(this.fiatAmount, this.selectedMarketCurrency)
      } else {
        if (!this.bchAmount) return null
        return `${formatWithLocale(this.bchAmount, { min: 0, max: 8 })} BCH`
      }
    },
    groupedAssets () {
      const groups = []
      let hasFavorites = false
      for (const asset of this.availableAssets) {
        if (!asset || !asset.id) continue
        if (asset.id === 'bch') {
          groups.push({ type: 'bch', asset })
        } else if (asset.favorite === 1) {
          if (!hasFavorites) {
            groups.push({ type: 'favorites-label' })
            hasFavorites = true
          }
          groups.push({ type: 'token', asset })
        }
      }
      return groups
    },
  },
  async mounted () {
    this.$store.dispatch('market/updateAssetPrices', {})
    if (this.amount > 0) {
      this.amountInput = String(this.amount)
    }
    await this.loadWallet()
    await this.loadAvailableAssets()
    await this.fetchRecipientAddress()
    if (this.amount === 0) {
      this.$nextTick(() => {
        this.$refs.amountInput?.focus()
        this.customKeyboardState = 'show'
      })
    }
  },
  methods: {
    getDarkModeClass,
    onKeyboardKey (key) {
      const caret = this.$refs.amountInput?.nativeEl?.selectionStart ?? this.amountInput.length
      const asset = this.selectedAsset.id === 'bch' ? null : this.selectedAsset
      this.amountInput = parseKey(key, this.amountInput, caret, asset)
    },
    onKeyboardAction (action) {
      if (action === 'backspace') {
        const el = this.$refs.amountInput?.nativeEl
        const caret = el?.selectionStart ?? this.amountInput.length
        if (caret > 0) {
          this.amountInput = this.amountInput.slice(0, caret - 1) + this.amountInput.slice(caret)
        }
      } else if (action === 'delete') {
        this.amountInput = ''
      } else {
        this.customKeyboardState = 'dismiss'
      }
    },
    toggleInputMode () {
      if (!this.bchPriceInFiat) return
      const currentVal = this.parsedAmount
      if (this.inputMode === 'bch') {
        const fiatVal = currentVal > 0 ? Number(convertToFiatAmount(currentVal, this.bchPriceInFiat)) : 0
        this.inputMode = 'fiat'
        if (currentVal > 0) this.amountInput = String(fiatVal)
      } else {
        const bchVal = currentVal > 0 ? Number(convertFiatToSelectedAsset(currentVal, this.bchPriceInFiat, 8)) : 0
        this.inputMode = 'bch'
        if (currentVal > 0) this.amountInput = String(bchVal)
      }
      this.$nextTick(() => this.$refs.amountInput?.focus())
    },
    async loadWallet () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      this.wallet = await cachedLoadWallet('BCH', walletIndex)
    },
    async loadAvailableAssets () {
      let assets = [{ id: 'bch', name: 'Bitcoin Cash', symbol: 'BCH', logo: 'bch-logo.png', balance: 0, decimals: 8, favorite: 0, favorite_order: null }]
      try {
        const bchWallet = getWalletByNetwork(this.wallet, 'bch')
        if (bchWallet?.balance !== undefined) {
          assets[0].balance = bchWallet.balance
        }
      } catch {}

      try {
        const walletHash = this.wallet.BCH?.walletHash || this.wallet.bch?.walletHash
        if (walletHash) {
          const isChipnet = this.$store.getters['global/isChipnet']
          const baseUrl = getWatchtowerApiUrl(isChipnet)
          const { data } = await axios.get(`${baseUrl}/cashtokens/fungible/`, {
            params: { has_balance: true, token_type: 1, wallet_hash: walletHash, limit: 100 }
          })
          if (Array.isArray(data.results)) {
            const tokens = data.results
              .filter(r => r && r.id)
              .map(r => {
                const storeAsset = this.$store.getters['assets/getAsset'](r.id)
                const stored = Array.isArray(storeAsset) && storeAsset.length > 0 ? storeAsset[0] : null
                const logo = stored?.logo || (r.image_url ? convertIpfsUrl(r.image_url) : null)
                const decimals = r.decimals || stored?.decimals || 0
                return {
                  id: r.id,
                  name: stored?.name || r.name || 'Unknown Token',
                  symbol: stored?.symbol || r.symbol || '',
                  logo: logo || null,
                  balance: r.balance !== undefined ? r.balance : 0,
                  decimals,
                  favorite: r.favorite === true ? 1 : 0,
                  favorite_order: r.favorite_order != null ? r.favorite_order : null,
                }
              })

            const favorites = tokens.filter(t => t.favorite === 1)
              .sort((a, b) => (a.favorite_order || 0) - (b.favorite_order || 0))
            assets = [...assets, ...favorites]
          }
        }
      } catch (err) {
        console.warn('[SendBchDialog] Failed to fetch tokens:', err)
      }

      this.availableAssets = assets
    },
    selectAsset (asset) {
      this.selectedAsset = asset
      this.showAssetPicker = false
      if (asset.id !== 'bch') {
        this.inputMode = 'bch'
      }
    },
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    getImageUrl (asset) {
      if (!asset) return this.getFallbackAssetLogo(asset)
      if (asset.logo) {
        if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
          return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
        }
        return asset.logo
      }
      return this.getFallbackAssetLogo(asset)
    },
    formatAssetBalance (asset) {
      if (!asset) return ''
      if (asset.symbol === 'BCH') {
        return `${convertTokenAmount(asset.balance / 1e8, 8, 8, true)} BCH`
      }
      const isSLP = asset.id?.startsWith('slp/')
      const rawConverted = convertTokenAmount(asset.balance, asset.decimals, asset.decimals || 0, false, isSLP)
      return `${rawConverted} ${asset.symbol || ''}`.trim()
    },
    async fetchRecipientAddress () {
      if (this.preFilledAddress) {
        this.publishedAddress = this.preFilledAddress
        this.editableAddress = this.preFilledAddress
        this.addressLookupDone = true
        this.$nextTick(() => this.onAddressChange())
        return
      }

      this.fetchingAddress = true
      try {
        const address = await this.$store.dispatch('nostrChat/fetchPublishedBchAddress', {
          pubKeyHex: this.recipientPubKey,
        })
        if (address) {
          this.publishedAddress = address
          this.editableAddress = address
          this.$nextTick(() => this.onAddressChange())
        }
      } catch (err) {
        console.warn('[SendBchDialog] Failed to fetch recipient address:', err)
      } finally {
        this.fetchingAddress = false
        this.addressLookupDone = true
      }
    },
    onAddressChange () {
      if (!this.editableAddress) {
        this.addressValid = false
        this.validatedAddress = ''
        return
      }
      const result = validateAddress(this.editableAddress, 'bch', false)
      this.addressValid = result.valid && !!result.address
      this.validatedAddress = result.address || ''
    },
    onCancel () {
      if (this.sending) return
      this.showDialog = false
      this.$emit('cancel')
    },
    onSwiped (reset) {
      this.send().then(() => {
      }).catch(() => {
        if (typeof reset === 'function') reset()
      })
    },
    async send () {
      if (!this.canSend) {
        throw new Error(this.$t('InvalidAddress', {}, 'No recipient address available'))
      }
      if (!this.amountIsValid) {
        throw new Error(this.$t('EnterValidAmount', {}, 'Enter a valid amount'))
      }

      const addressToSend = this.publishedAddress || this.validatedAddress
      if (!addressToSend) {
        throw new Error(this.$t('InvalidAddress', {}, 'No recipient address available'))
      }

      this.sending = true
      try {
        const bchWallet = getWalletByNetwork(this.wallet, 'bch')
        if (!bchWallet || typeof bchWallet.sendBch !== 'function') {
          throw new Error('BCH wallet unavailable')
        }

        const changeAddress = await getChangeAddress('bch')
        if (!changeAddress) {
          throw new Error('Could not get change address')
        }

        const isCashToken = this.selectedAsset.id !== 'bch' && this.selectedAsset.id?.startsWith('ct/')
        const recipientAddress = isCashToken
          ? toTokenAddress(new Address(addressToSend).toCashAddress())
          : new Address(addressToSend).toCashAddress()

        let token = null
        let recipients = []

        if (isCashToken) {
          const tokenId = this.selectedAsset.id.replace('ct/', '')
          const decimals = this.selectedAsset.decimals || 0
          const tokenAmount = Math.round(this.parsedAmount * (10 ** decimals))
          token = { tokenId }
          recipients = [{
            address: recipientAddress,
            amount: this.parsedAmount,
            tokenAmount,
          }]
        } else {
          recipients = [{
            address: recipientAddress,
            amount: this.bchAmount,
          }]
        }

        const sendResult = await bchWallet.sendBch(
          0,
          '',
          changeAddress,
          token,
          undefined,
          recipients,
        )

        if (!sendResult?.success) {
          throw new Error(sendResult?.error || 'Send failed')
        }

        const sendAmount = isCashToken ? this.parsedAmount : this.bchAmount
        this.showDialog = false
        this.$emit('ok', {
          txid: sendResult.txid,
          amount: sendAmount,
          symbol: this.selectedAsset.symbol || 'BCH',
          recipient: recipientAddress,
        })
      } catch (err) {
        console.error('[SendBchDialog] Send failed:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || 'Failed to send BCH',
        })
        throw err
      } finally {
        this.sending = false
      }
    },
  },
}
</script>

<style scoped>
.send-bch-card {
  min-width: 320px;
  border-radius: 16px;
  &.dark { background: #1e293b; color: rgba(255,255,255,0.9); }
  &.light { background: #ffffff; color: rgba(0,0,0,0.85); }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
}

/* Sending overlay */
.sending-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  border-radius: 16px;
  &.dark { background: rgba(15, 23, 42, 0.7); }
  &.light { background: rgba(255, 255, 255, 0.7); }
}
.sending-text {
  font-size: 15px;
  font-weight: 600;
  &.dark { color: rgba(255,255,255,0.8); }
  &.light { color: rgba(0,0,0,0.7); }
}
.dimmed {
  opacity: 0.3;
  pointer-events: none;
}

/* Asset selector */
.asset-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: pointer;
  &.dark { background: rgba(255,255,255,0.06); }
  &.light { background: rgba(0,0,0,0.04); }
}
.asset-selector-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.asset-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.asset-icon-img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}
.asset-info {
  display: flex;
  flex-direction: column;
}
.asset-name {
  font-size: 14px;
  font-weight: 600;
  &.dark { color: rgba(255,255,255,0.9); }
  &.light { color: rgba(0,0,0,0.85); }
}
.asset-symbol {
  font-size: 12px;
  &.dark { color: rgba(255,255,255,0.4); }
  &.light { color: rgba(0,0,0,0.4); }
}
.asset-chevron {
  &.dark { color: rgba(255,255,255,0.3); }
  &.light { color: rgba(0,0,0,0.3); }
}

/* Amount input */
.amount-input-section {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  padding: 16px 0 4px;
}
.amount-q-input {
  flex: 1;
  text-align: center;
  :deep(.q-field__control) {
    padding: 0 !important;
    height: 40px !important;
  }
  :deep(.q-field__native) {
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.5px;
  }
  &.dark :deep(.q-field__native) { color: rgba(255,255,255,0.95); }
  &.light :deep(.q-field__native) { color: rgba(0,0,0,0.9); }
  :deep(.q-field__control::before) { border: none !important; }
  :deep(.q-field__control::after) { border: none !important; }
  :deep(.q-field--focused .q-field__control) { box-shadow: none !important; }
}
.amount-unit-toggle {
  font-size: 24px;
  font-weight: 700;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  transition: background 0.15s;
  &.dark { color: rgba(255,255,255,0.7); }
  &.light { color: rgba(0,0,0,0.6); }
  &:hover:not(:disabled) {
    &.dark { background: rgba(255,255,255,0.08); }
    &.light { background: rgba(0,0,0,0.06); }
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
.amount-unit-static {
  font-size: 24px;
  font-weight: 700;
  padding: 0 4px;
  &.dark { color: rgba(255,255,255,0.7); }
  &.light { color: rgba(0,0,0,0.6); }
}

/* Fiat conversion */
.fiat-conversion {
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  margin-bottom: 16px;
  &.dark { color: rgba(255,255,255,0.4); border-bottom-color: rgba(255,255,255,0.06); }
  &.light { color: rgba(0,0,0,0.4); }
}

/* Recipient */
.recipient-info {
  margin-bottom: 16px;
}
.recipient-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.recipient-address {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  &.dark { background: rgba(255,255,255,0.05); }
  &.light { background: rgba(0,0,0,0.03); }
}
.recipient-avatar {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  font-weight: 600;
  font-size: 12px;
}
.recipient-details {
  flex: 1;
  min-width: 0;
}
.recipient-name {
  font-size: 14px;
  font-weight: 600;
  &.dark { color: #e2e8f0; }
  &.light { color: #1f2937; }
}
.recipient-npub {
  font-size: 11px;
  color: #9ca3af;
  font-family: 'Courier New', monospace;
}

/* Published address */
.published-address {
  padding: 10px 12px;
  background: rgba(34, 197, 94, 0.08);
  border-radius: 10px;
  border-left: 3px solid #22c55e;
}
.published-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #166534;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.published-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
  &.dark { color: #e2e8f0; }
  &.light { color: #1f2937; }
}

/* No address */
.no-address {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(156, 163, 175, 0.08);
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.4;
  &.dark { color: #9ca3af; }
  &.light { color: #6b7280; }
}

/* Address input */
.address-input-section { margin-top: 8px; }
.address-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.address-field :deep(.q-field__control) { border-radius: 10px; }

.fetching-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

/* Asset picker */
.asset-picker-card {
  border-radius: 16px 16px 0 0;
  max-width: 400px;
  width: 100%;
  &.dark { background: #1e293b; color: rgba(255,255,255,0.9); }
  &.light { background: #ffffff; color: rgba(0,0,0,0.85); }
}
.asset-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
}
.section-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 16px 8px 4px;
  text-transform: uppercase;
  &.dark { color: rgba(255,255,255,0.4); }
  &.light { color: rgba(0,0,0,0.4); }
}
.asset-picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 10px;
  cursor: pointer;
  &.dark { color: rgba(255,255,255,0.9); }
  &.light { color: rgba(0,0,0,0.85); }
  &.dark.asset-picker-active { background: rgba(59,123,246,0.15); }
  &.light.asset-picker-active { background: rgba(59,123,246,0.08); }
}
.asset-icon-sm {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.asset-icon-img-sm {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
}
.asset-picker-info {
  flex: 1;
}
.asset-picker-name {
  font-size: 14px;
  font-weight: 600;
  &.dark { color: rgba(255,255,255,0.9); }
  &.light { color: rgba(0,0,0,0.85); }
}
.asset-picker-balance {
  font-size: 12px;
  &.dark { color: rgba(255,255,255,0.4); }
  &.light { color: rgba(0,0,0,0.4); }
}

.swipe-container {
  margin-top: -8px;
}
.swipe-container :deep(.drag-slide-container) {
  position: relative !important;
  z-index: 1;
}
</style>

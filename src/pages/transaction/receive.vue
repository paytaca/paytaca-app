<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="assetId && assetId.startsWith('ct/') ? ($t('Receive') + ' Token') : ($t('Receive') + (asset?.symbol ? ' ' + asset.symbol : ''))"
      :backnavpath="backNavPath"
      class="header-nav"
    ></header-nav>
    <div v-if="!amountDialog" class="text-bow" :class="getDarkModeClass(darkMode)">
      <q-icon
        id="context-menu"
        size="35px"
        name="more_vert"
        color="primary"
        :style="{'margin-left': (getScreenWidth() - 45) + 'px', 'margin-top': $q.platform.is.ios ? '42px' : '0px'}"
      >
        <q-menu anchor="bottom right" self="top end">
          <q-list class="pt-card" style="min-width: 100px" :class="getDarkModeClass(darkMode)">
            <q-item clickable v-close-popup>
              <q-item-section class="pt-label" :class="getDarkModeClass(darkMode)" @click="showPublicKey">
                {{ $t('ShowPublicKey') }}
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup>
              <q-item-section class="pt-label" :class="getDarkModeClass(darkMode)" @click="showPrivateKey">
                {{ $t('ShowPrivateKey') }}
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup>
              <q-item-section class="pt-label" :class="getDarkModeClass(darkMode)" @click="generateNewAddress">
                {{ $t('GenerateNewAddress') }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-icon>
      <div>
        <div v-if="asset && asset.id ==='bch'" class="row flex-center">
          <div class="row flex-center" style="margin-top: 20px;">
            <q-img @click="isCt = false" src="bitcoin-cash-circle.svg" height="35px" width="35px" />
            <span @click="isCt = false">&nbsp;BCH</span>
            <q-toggle
              v-model="isCt"
              class="text-bow"
              style="margin: auto;"
              keep-color
              color="teal-5"
              size="lg"
              checked-icon="img:ct-logo.png"
              unchecked-icon="img:bch-logo.png"
              :class="getDarkModeClass(darkMode)"
            />
            <q-img @click="isCt = true" src="ct-logo.png" height="35px" width="35px" />
            <span @click="isCt = true">&nbsp;{{ $t('CashToken') }}</span>
          </div>
        </div>
        <div class="row">
          <div class="col qr-code-container">
            <div class="col q-pl-sm q-pr-sm">
              <div class="row text-center" @click="copyToClipboard(isCt ? address : addressAmountFormat)">
                <div class="col row justify-center q-pt-md">
                  <div
                    v-if="generating || !address"
                    class="q-mb-sm"
                    style="width: 220px; height: 220px; min-width: 220px; min-height: 220px; display: flex; align-items: center; justify-content: center;"
                  >
                    <q-skeleton
                      type="rect"
                      width="220px"
                      height="220px"
                      style="border-radius: 8px;"
                      animation="fade"
                    />
                  </div>
                  <qr-code
                    v-else
                    :text="isCt ? address : addressAmountFormat"
                    :generating="generating"
                    border-width="3px"
                    border-color="#ed5f59"
                    :size="220"
                    :icon="isCt ? 'ct-logo.png' : getImageUrl(asset)"
                    class="q-mb-sm"
                  >
                  </qr-code>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!isCt && asset && asset.id ==='bch'" class="row flex-center">
          <q-icon v-if="showLegacy" name="fas fa-angle-up" size="1.4em" @click="showLegacy = false" style="z-index: 1000;" />
          <q-icon v-else name="fas fa-angle-down" size="1.4em" @click="showLegacy = true" />
        </div>
        <div class="row q-mt-md" v-if="!generating && walletType === 'bch' && asset && asset.id ==='bch' && !isCt && showLegacy">
          <q-toggle
            v-model="legacy"
            class="text-bow"
            style="margin-left: auto; margin-right: auto; margin-top: -10px;"
            :class="getDarkModeClass(darkMode)"
            keep-color
            color="blue-9"
            :label="$t('LegacyAddressFormat')"
          />
        </div>
        <div class="row" v-if="!generating && address">
          <div class="col copy-container">
            <div class="qr-code-text text-weight-light text-center">
              <div
                class="text-bow"
                style="letter-spacing: 1px; word-break: break-all;"
                @click="copyToClipboard(isCt ? address : addressAmountFormat)"
                :class="getDarkModeClass(darkMode)"
              >
                {{ address }}
              </div>
              
            </div>
            <div class="row justify-center q-mt-md q-mx-lg">
              <q-btn
                outline
                no-caps
                class="br-15"
                color="grey-7"
                icon="content_copy"
                padding="xs md"
                :label="$t('ClickToCopyAddress')"
                @click="copyToClipboard(isCt ? address : addressAmountFormat)"
              />
            </div>
            <div v-if="amount && !isCt" class="text-center">
              <q-separator class="q-mb-sm q-mx-md q-mt-md" style="height: 2px;" />
              <div class="text-bow" :class="getDarkModeClass(darkMode)">
                <div class="receive-label q-mt-md">
                  {{ $t('YouWillReceive') }}
                </div>
                <div class="text-weight-light receive-amount-label">
                  {{ formatWithLocale(amount, decimalObj) }}
                  {{ setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : asset?.symbol }}
                </div>
              </div>
            </div>
            <div
              v-if="!isCt && !assetId.endsWith('unlisted')"
              class="text-center button button-text-primary q-pt-md"
              style="font-size: 18px;"
              :class="getDarkModeClass(darkMode)"
            >
              <span class="cursor-pointer" @click="amountDialog = true;">
                {{ amount ? $t('Update') : $t('Set') }} {{ $t('Amount') }}
              </span>
              <span class="q-ml-md text-negative cursor-pointer" @click="amount = ''">
                {{ amount ? 'Remove Amount' : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="amountDialog">
      <div class="text-right">
        <q-btn
          flat
          padding="lg"
          size="lg"
          icon="close"
          class="close-button"
          @click="amountDialog = false"
        />
      </div>
      <div :style="`margin-top: ${$q.screen.height * .15}px`">
        <div class="text-center text-bow text-h6" :class="getDarkModeClass(darkMode)">{{ $t('SetReceiveAmount') }}</div>
        <div class="col q-mt-md q-px-lg text-center">
          <custom-input
            v-model="amount"
            :inputSymbol="setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : asset?.symbol"
            :inputRules="[val => Boolean(val) || $t('InvalidAmount')]"
            :asset="asset"
            :decimalObj="decimalObj"
            @on-check-click="amountDialog = false"
          />
        </div>
        <div
          v-if="assetId === 'bch'"
          class="q-pt-md text-subtitle1 button button-text-primary set-amount-button cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="setAmountInFiat = !setAmountInFiat"
        >
          {{ $t('SetAmountIn') }} {{ setAmountInFiat ? 'BCH' : String(selectedMarketCurrency()).toUpperCase() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getMnemonic, Wallet, Address } from '../../wallet'
import {
  getWalletByNetwork,
  getWatchtowerWebsocketUrl,
  convertCashAddress
} from 'src/wallet/chipnet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useWakeLock } from '@vueuse/core'
import { formatWithLocale } from 'src/utils/denomination-utils.js'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType,
  generateAddressSetWithoutSubscription
} from 'src/utils/address-generation-utils.js'
import { toTokenAddress } from 'src/utils/crypto.js'
import axios from 'axios'

import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'

import HeaderNav from '../../components/header-nav'
import CustomInput from 'src/components/CustomInput.vue'

export default {
  name: 'receive-page',
  mixins: [
    walletAssetsMixin
  ],
  components: {
    HeaderNav,
    CustomInput
  },
  data () {
    return {
      activeBtn: 'btn-bch',
      walletType: '',
      isCt: false,
      asset: {},
      assetLoaded: false,
      legacy: false,
      showLegacy: false,
      generateAddressOnLeave: false,
      generating: true, // Start as true, set to false after address loads
      amount: '',
      amountDialog: false,
      setAmountInFiat: true,
      tokens: [],
      dynamicAddress: '', // Store dynamically generated address (for display, may be token format)
      dynamicAddressRegular: '', // Store regular format address (for API calls, subscriptions, listeners)
      isInitializing: true // Flag to prevent watcher from triggering during initial load
    }
  },
  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    assetId: {
      type: String,
      required: false,
      default: ''
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    backNavPath () {
      const back = this.$router && this.$router.options && this.$router.options.history && this.$router.options.history.state
        ? this.$router.options.history.state.back || ''
        : ''
      // If navigated from receive asset selector, go back there; otherwise go home
      if (typeof back === 'string' && back.includes('/receive/select-asset')) return '/receive/select-asset'
      return '/'
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    address () {
      // Use dynamically generated address instead of store-retrieved address
      const address = this.dynamicAddress
      if (!address) return ''
      
      if (this.legacy) {
        return this.convertToLegacyAddress(address)
      } else {
        if (this.isCt) {
          return convertCashAddress(address, this.$store.getters['global/isChipnet'], true)
        } else {
          return address
        }
      }
    },
    selectedAssetMarketPrice() {
      return this.$store.getters['market/getAssetPrice'](this.asset?.id, this.selectedMarketCurrency())
    },
    addressAmountFormat () {
      let tempAddress = this.address
      let tempAmount = this.amount

      if (this.setAmountInFiat && this.amount) {
        tempAmount = this.convertFiatToSelectedAsset(this.amount)
      }

      if (this.assetId.startsWith('ct/')) {
        const category = this.assetId.split('/')[1]
        if (category !== 'unlisted') {
          tempAddress += '?c=' + category
        }
      }

      if (this.assetId.startsWith('ct/')) {
        const tokenAmount = parseFloat(tempAmount) * (10 ** (this.asset?.decimals || 0))
        tempAddress += this.amount ? '&f=' + Math.round(tokenAmount) : ''
      } else {
        tempAddress += this.amount ? '?amount=' + tempAmount : ''
      }

      return tempAddress
    },
    decimalObj () {
      return this.setAmountInFiat ? { min: 0, max: 4 } : { min: 0, max: 8 }
    }
  },
  methods: {
    getDarkModeClass,
    formatWithLocale,

    /**
     * Ensures address index is never 0 (0/0 is reserved for message encryption)
     * Returns 1 if index is 0, otherwise returns the index as-is
     * @param {number} index - The address index to validate
     * @returns {number} - The validated address index (never 0)
     */
    ensureAddressIndexNotZero (index) {
      if (typeof index !== 'number' || index < 0) {
        return 1 // Default to 1 if invalid
      }
      return index === 0 ? 1 : index
    },

    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    async getMainchainTokens () {
      const tokenWalletHashes = [this.getWallet('bch').walletHash, this.getWallet('slp').walletHash]
      const mainchainTokens = []

      for (const tokenWalletHash of tokenWalletHashes) {
        const isCashToken = tokenWalletHashes.indexOf(tokenWalletHash) === 0

        const tokens = await this.$store.dispatch(
          'assets/getMissingAssets',
          {
            isCashToken,
            walletHash: tokenWalletHash,
            includeIgnoredTokens: false
          }
        )

        mainchainTokens.push(...tokens)
      }

      return mainchainTokens
    },
    convertFiatToSelectedAsset (amount) {
      const parsedAmount = Number(amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) / Number(this.selectedAssetMarketPrice)
      return computedBalance.toFixed(8)
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
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
        } else {
          return asset.logo
        }
      } else {
        return this.getFallbackAssetLogo(asset)
      }
    },
    getScreenWidth () {
      const divBounds = document.body.getBoundingClientRect()
      return divBounds.width
    },
    generateNewAddress () {
      const vm = this
      vm.generating = true
      const lastAddressIndex = vm.getLastAddressIndex()
      let newAddressIndex = lastAddressIndex + 1
      // Skip address 0/0 (reserved for message encryption)
      newAddressIndex = vm.ensureAddressIndexNotZero(newAddressIndex)

      delete this?.$options?.sockets

      getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
        const wallet = new Wallet(mnemonic, vm.network)
        if (vm.walletType === 'bch') {
          getWalletByNetwork(wallet, vm.walletType).getNewAddressSet(newAddressIndex).then(async function (result) {
            const addresses = result.addresses
            vm.$store.commit('global/generateNewAddressSet', {
              type: 'bch',
              lastAddress: addresses.receiving,
              lastChangeAddress: addresses.change,
              lastAddressIndex: newAddressIndex
            })
            // Refresh the dynamic address after generating new address
            await vm.refreshDynamicAddress()
            try { await vm.setupListener() } catch {}
          }).finally(() => {
            vm.generating = false
          })
        }
        if (vm.walletType === 'slp') {
          getWalletByNetwork(wallet, vm.walletType).getNewAddressSet(newAddressIndex).then(async function (addresses) {
            vm.$store.commit('global/generateNewAddressSet', {
              type: 'slp',
              lastAddress: addresses.receiving,
              lastChangeAddress: addresses.change,
              lastAddressIndex: newAddressIndex
            })
            // Refresh the dynamic address after generating new address
            await vm.refreshDynamicAddress()
            try { await vm.setupListener() } catch {}
          })
        }
      })
    },
    async showPrivateKey () {
      try {
        const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
        const wallet = new Wallet(mnemonic, this.network)
        let lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
        // Skip address 0/0 (reserved for message encryption)
        lastAddressIndex = this.ensureAddressIndexNotZero(lastAddressIndex)
        const dynamicWallet = getWalletByNetwork(wallet, this.walletType)
        const privateKey = await dynamicWallet.getPrivateKey('0/' + String(lastAddressIndex))
        
        // Show private key in a dialog
        this.$q.dialog({
          title: this.$t('PrivateKey'),
          message: `<div style="word-break: break-all; font-family: monospace; padding: 15px; background: ${this.darkMode ? '#2d2d2d' : '#ffffff'}; border-radius: 8px; border: 1px solid ${this.darkMode ? '#404040' : '#e0e0e0'}; color: ${this.darkMode ? '#ffffff' : '#333333'}; font-size: 14px; line-height: 1.4; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">${privateKey}</div>`,
          html: true,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          ok: {
            label: this.$t('OK'),
            color: 'primary',
            class: 'full-width q-mt-md'
          }
        })
      } catch (error) {
        console.error('Error showing private key:', error)
      }
    },
    async showPublicKey () {
      try {
        const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
        const wallet = new Wallet(mnemonic, this.network)
        let lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
        // Skip address 0/0 (reserved for message encryption)
        lastAddressIndex = this.ensureAddressIndexNotZero(lastAddressIndex)
        const dynamicWallet = getWalletByNetwork(wallet, this.walletType)
        const publicKey = await dynamicWallet.getPublicKey('0/' + String(lastAddressIndex))
        
        // Show public key in a dialog
        this.$q.dialog({
          title: this.$t('PublicKey'),
          message: `<div style="word-break: break-all; font-family: monospace; padding: 15px; background: ${this.darkMode ? '#2d2d2d' : '#ffffff'}; border-radius: 8px; border: 1px solid ${this.darkMode ? '#404040' : '#e0e0e0'}; color: ${this.darkMode ? '#ffffff' : '#333333'}; font-size: 14px; line-height: 1.4; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">${publicKey}</div>`,
          html: true,
          class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
          ok: {
            label: this.$t('OK'),
            color: 'primary',
            class: 'full-width q-mt-md'
          }
        })
      } catch (error) {
        console.error('Error showing public key:', error)
      }
    },
    async getAddress (forListener = false) {
      // Use the already-generated address from refreshDynamicAddress instead of regenerating
      // For listeners and API calls, always use regular format
      if (this.dynamicAddressRegular) {
        return this.dynamicAddressRegular
      }
      
      // Fallback to dynamicAddress if regular format not set (shouldn't happen in normal flow)
      if (this.dynamicAddress) {
        // If it's a token address and we need regular format, convert it back
        if (forListener && this.assetId.indexOf('ct/') > -1) {
          // Convert token address back to regular format using Address utility
          try {
            const addressObj = new Address(this.dynamicAddress)
            return addressObj.toCashAddress()
          } catch (e) {
            console.error('Error converting token address to regular format:', e)
            return this.dynamicAddress
          }
        }
        return this.dynamicAddress
      }
      
      // Fallback: if dynamicAddress is not set yet, wait for it or generate
      // This should rarely happen, but provides a safety net
      if (this.assetId.indexOf('slp/') > -1) {
        this.walletType = 'slp'
      } else {
        this.walletType = 'bch'
      }

      // Fallback: generate address if dynamicAddress is not available
      // This should not happen in normal flow since refreshDynamicAddress is called first
      try {
        const addressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
        let validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 1
        // Skip address 0/0 (reserved for message encryption)
        validAddressIndex = this.ensureAddressIndexNotZero(validAddressIndex)
        
        let address = await generateReceivingAddress({
          walletIndex: this.$store.getters['global/getWalletIndex'],
          derivationPath: getDerivationPathForWalletType(this.walletType),
          addressIndex: validAddressIndex,
          isChipnet: this.isChipnet
        })
        
        if (!address) {
          throw new Error('Failed to subscribe address to watchtower')
        }
        
        if (this.assetId.indexOf('ct/') > -1 && !forListener) {
          address = convertCashAddress(address, this.isChipnet, true)
        }
        return address
      } catch (error) {
        console.error('Error generating address dynamically:', error)
        this.$q.notify({
          message: this.$t('FailedToGenerateAddress') || 'Failed to generate address. Please try again.',
          color: 'negative',
          icon: 'warning'
        })
        return null
      }
    },
    async checkAddressBalance(address, walletType) {
      // Check if address has balance (including token sats)
      try {
        const baseUrl = this.isChipnet ? 'https://chipnet.watchtower.cash' : 'https://watchtower.cash'
        
        if (walletType === 'slp') {
          // For SLP, check BCH balance
          const response = await axios.get(`${baseUrl}/api/balance/bch/${address}/`).catch(() => ({ data: { balance: 0 } }))
          const balance = response?.data?.balance || 0
          return balance > 0
        } else {
          // For BCH, check balance including token sats
          const response = await axios.get(`${baseUrl}/api/balance/bch/${address}/?include_token_sats=true`).catch(() => ({ data: { balance: 0 } }))
          const balance = response?.data?.balance || 0
          return balance > 0
        }
      } catch (error) {
        console.error('Error checking address balance:', error)
        // If check fails, assume no balance to be safe
        return false
      }
    },
    async refreshDynamicAddress() {
      // Step 1: Generate address from saved lastAddressIndex
      try {
        this.generating = true
        
        // Determine wallet type
        if (this.assetId.indexOf('slp/') > -1) {
          this.walletType = 'slp'
        } else {
          this.walletType = 'bch'
        }
        
        // Get lastAddressIndex
        const lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
        let validAddressIndex = typeof lastAddressIndex === 'number' && lastAddressIndex >= 0 ? lastAddressIndex : 1
        // Skip address 0/0 (reserved for message encryption)
        validAddressIndex = this.ensureAddressIndexNotZero(validAddressIndex)
        
        // Generate address from lastAddressIndex
        let address
        
        // Step 1: Generate address from lastAddressIndex WITHOUT subscribing (just to check balance)
          const addressResult = await generateAddressSetWithoutSubscription({
            walletIndex: this.$store.getters['global/getWalletIndex'],
            derivationPath: getDerivationPathForWalletType(this.walletType),
            addressIndex: validAddressIndex,
            isChipnet: this.isChipnet
          })
          
          if (!addressResult.success) {
            throw new Error('Failed to generate address: ' + (addressResult.error || 'Unknown error'))
          }
          
          address = addressResult.addresses.receiving
          
          // Step 2: Check if that address has balance (including token sats)
          const hasBalance = await this.checkAddressBalance(address, this.walletType)
          
          if (!hasBalance) {
            // Step 3: If balance is zero, subscribe and render that address
            // Now subscribe the address since we're using it
            const subscribeResult = await generateReceivingAddress({
              walletIndex: this.$store.getters['global/getWalletIndex'],
              derivationPath: getDerivationPathForWalletType(this.walletType),
              addressIndex: validAddressIndex,
              isChipnet: this.isChipnet
            })
            
            if (!subscribeResult) {
              throw new Error('Failed to subscribe address to watchtower')
            }
            
            // Store regular format for API calls and listeners
            this.dynamicAddressRegular = subscribeResult
            
            // Store display format (token format for CashToken, regular for others)
            if (this.assetId.indexOf('ct/') > -1) {
              this.dynamicAddress = convertCashAddress(subscribeResult, this.isChipnet, true)
            } else {
              this.dynamicAddress = subscribeResult
            }
            this.generating = false
            return
          }
          
          // Step 4: Else, generate a new address by incrementing the lastAddressIndex by 1
          let newAddressIndex = validAddressIndex + 1
          // Skip address 0/0 (reserved for message encryption)
          newAddressIndex = this.ensureAddressIndexNotZero(newAddressIndex)
          
          // Step 5: Generate and subscribe the new address (only subscribe when creating new address)
          const newAddress = await generateReceivingAddress({
            walletIndex: this.$store.getters['global/getWalletIndex'],
            derivationPath: getDerivationPathForWalletType(this.walletType),
            addressIndex: newAddressIndex,
            isChipnet: this.isChipnet
          })
          
          if (!newAddress) {
            throw new Error('Failed to generate and subscribe new address')
          }
          
          // Update store with new address index
          const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
          const wallet = new Wallet(mnemonic, this.network)
          const result = await getWalletByNetwork(wallet, this.walletType).getNewAddressSet(newAddressIndex)
          const addresses = result.addresses
          
          this.$store.commit('global/generateNewAddressSet', {
            type: this.walletType,
            lastAddress: addresses.receiving,
            lastChangeAddress: addresses.change,
            lastAddressIndex: newAddressIndex
          })
          
          // Step 6: Render that new address in the page
          // Store regular format for API calls and listeners
          this.dynamicAddressRegular = newAddress
          
          // Store display format (token format for CashToken, regular for others)
          if (this.assetId.indexOf('ct/') > -1) {
            this.dynamicAddress = convertCashAddress(newAddress, this.isChipnet, true)
          } else {
            this.dynamicAddress = newAddress
          }
          this.generating = false
      } catch (error) {
        console.error('Error refreshing dynamic address:', error)
        this.generating = false // Stop generating even on error
        this.$q.notify({
          message: this.$t('FailedToGenerateAddress') || 'Failed to generate address. Please try again.',
          color: 'negative',
          icon: 'warning'
        })
      }
    },
    getLastAddressIndex () {
      if (this.assetId.indexOf('slp/') > -1) {
        this.walletType = 'slp'
      } else {
        this.walletType = 'bch'
      }
      return this.$store.getters['global/getLastAddressIndex'](this.walletType)
    },
    copyToClipboard (value) {
      console.log('copyToClipboard', value)
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    getAsset (id) {
      const getter = 'assets/getAsset'
      const assets = this.$store.getters[getter](id)
      if (assets.length > 0) {
        return assets[0]
      }
    },
    notifyOnReceive (amount, symbol, logo, decimals = 0, isCashToken = false) {
      const vm = this
      vm.generateAddressOnLeave = vm.$store.getters['global/autoGenerateAddress']
      
      if (!vm.$q.platform.is.mobile) {
        vm.$q.notify({
          classes: 'br-15 text-body1',
          message: `${amount} ${symbol} received!`,
          color: 'blue-9',
          position: 'bottom',
          avatar: logo,
          timeout: 4000
        })
      }
    },
    convertToLegacyAddress (address) {
      const addressObj = new Address(address)
      return addressObj.toLegacyAddress()
    },
    async setupListener () {
      const vm = this

      let url
      let assetType
      // getAddress is async, so we need to await it
      const address = await vm.getAddress(true)
      if (!address) {
        console.error('Failed to get address for websocket listener')
        return
      }
      const wsURL = getWatchtowerWebsocketUrl(this.isChipnet)

      if (vm.assetId.indexOf('slp/') > -1) {
        assetType = 'slp'
        url = `${wsURL}/watch/slp/${address}/`
      } else {
        assetType = 'bch'
        url = `${wsURL}/watch/bch/${address}/`
      }

      vm.$connect(url)
      vm.$options.sockets.onmessage = async function (message) {
        const data = JSON.parse(message.data)
        const tokenType = vm.assetId.split('/')[0]
        const tokenId = vm.assetId.split('/')[1]
        const isListedToken = tokenType === 'ct' && !tokenId.includes('unlisted')

        if (assetType === 'slp' || isListedToken) {
          if (data.token_id.split('/')[1] === tokenId) {
            // Redirect to transaction details page for all received transactions
            if (data.txid) {
              const category = data.token_id ? data.token_id.split('/')[1] : ''
              
              // Get asset from store or construct from websocket data
              let asset = vm.asset
              if (!asset && data.token_id) {
                const assetId = data.token_id
                asset = vm.getAsset(assetId)
                
                // If not found, construct basic asset object
                if (!asset) {
                  asset = {
                    id: assetId,
                    symbol: data.token_symbol?.toUpperCase() || 'TOKEN',
                    decimals: data.token_decimals || 0,
                    logo: vm.getImageUrl ? vm.getImageUrl({ id: assetId }) : 'bch-logo.png'
                  }
                }
              }
              
              // Calculate amount
              const amount = data.amount / (10 ** data.token_decimals)
              
              // Construct transaction object from websocket data
              const wsTransaction = {
                txid: data.txid,
                record_type: 'incoming',
                amount: amount,
                asset: asset,
                tx_timestamp: Date.now(),
                date_created: Date.now(),
                _fromWebsocket: true
              }
              
              const query = { new: 'true' }
              if (category) {
                query.category = category
              }
              vm.$router.push({
                name: 'transaction-detail',
                params: { txid: data.txid },
                query,
                state: { tx: wsTransaction, fromWebsocket: true }
              })
              return // Exit early to prevent notification
            }
            
            vm.notifyOnReceive(
              data.amount / (10 ** data.token_decimals),
              data.token_symbol.toUpperCase(),
              vm.getImageUrl(vm.asset),
              tokenType === 'ct' ? (vm.asset?.decimals || 0) : 0,
              tokenType === 'ct'
            )
          }
        } else {
          let amount
          if (data.token_name === 'bch') {
            amount = data.value / (10 ** data.token_decimals)
          } else {
            amount = Number(data.amount) / (10 ** data.token_decimals)
          }
          
          // Redirect to transaction details page for all received transactions
          if (data.txid) {
            // Get asset from store or construct from websocket data
            let asset = vm.asset
            if (!asset && data.token_id) {
              const assetId = data.token_id === 'bch' ? 'bch' : data.token_id
              asset = vm.getAsset(assetId)
              
              // If not found, construct basic asset object
              if (!asset) {
                asset = {
                  id: assetId,
                  symbol: data.token_symbol?.toUpperCase() || (data.token_id === 'bch' ? 'BCH' : 'TOKEN'),
                  decimals: data.token_decimals || (data.token_id === 'bch' ? 8 : 0),
                  logo: vm.getImageUrl ? vm.getImageUrl({ id: assetId }) : (data.token_id === 'bch' ? 'bch-logo.png' : 'token-logo.png')
                }
              }
            }
            
            // Calculate amount based on token type
            let txAmount = 0
            if (data.token_name === 'bch') {
              txAmount = data.value / (10 ** 8) // Convert satoshis to BCH
            } else {
              txAmount = Number(data.amount) / (10 ** data.token_decimals)
            }
            
            // Construct transaction object from websocket data
            const wsTransaction = {
              txid: data.txid,
              record_type: 'incoming',
              amount: txAmount,
              asset: asset,
              tx_timestamp: Date.now(),
              date_created: Date.now(),
              _fromWebsocket: true
            }
            
            // Extract category from token_id if it's a token transaction, otherwise it's BCH
            const query = { new: 'true' }
            if (data.token_id && data.token_id !== 'bch') {
              const parts = data.token_id.split('/')
              if (parts.length === 2 && parts[0] === 'ct') {
                query.category = parts[1]
              }
            }
            // For BCH transactions, no category query param is needed
            vm.$router.push({
              name: 'transaction-detail',
              params: { txid: data.txid },
              query,
              state: { tx: wsTransaction, fromWebsocket: true }
            })
            return // Exit early to prevent notification and token addition
          }
          
          vm.notifyOnReceive(
            amount,
            data.token_symbol.toUpperCase(),
            vm.getImageUrl(vm.asset)
          )

          // if unlisted token is detected, add to front of list
          // check if token already added in list using store getters
          const allAssets = vm.$store.getters['assets/getAssets'] || []
          const existingAsset = allAssets.find(a => a && a.id === data.token_id)
          
          if (!existingAsset) {
            try {
              const newTokenData = await vm.$store.dispatch('assets/getAssetMetadata', data.token_id)
              if (newTokenData) {
                if (!newTokenData.decimals || newTokenData.isNft) {
                  console.log('Not adding unrecognized token due to being an nft')
                  return
                }
                
                // Create a new object with the balance property
                const tokenWithBalance = {
                  ...newTokenData,
                  balance: amount
                }

                vm.$store.commit('assets/addNewAsset', tokenWithBalance)
                vm.$store.commit('assets/moveAssetToBeginning')
              }
            } catch (error) {
              console.error('Error adding new token:', error)
            }
          }
        }
      }
    }
  },

  watch: {
    address () {},
    walletType (newVal, oldVal) {
      // Only refresh if wallet type actually changed (not during initial load)
      if (!this.isInitializing && oldVal && newVal !== oldVal) {
        this.refreshDynamicAddress()
      }
    },
    setAmountInFiat(newVal, oldVal) {
      const amount = parseFloat(this.amount)
      if (!amount) return

      let newAmount
      if (newVal && !oldVal) {
        newAmount = amount * this.selectedAssetMarketPrice
      } else if (!newVal && oldVal) {
        newAmount = amount / this.selectedAssetMarketPrice
      } else {
        newAmount = amount
      }

      const decimals = newVal ? 3 : parseInt(this.asset?.decimals) || 8
      const newParsedAmount = String(parseFloat(newAmount.toFixed(decimals)))
      this.amount = newParsedAmount
    }
  },

  async beforeUnmount() {
    if (this.generateAddressOnLeave) {
      this.generateNewAddress()
    }
  },

  async unmounted () {
    if (!this.assetId.endsWith('unlisted')) {
      this.$disconnect()
      delete this?.$options?.sockets
    }

    await self.wakeLock.release()
  },

  async mounted () {
    const vm = this
    
    // Generate the dynamic address first (this handles balance check and subscription)
    await vm.refreshDynamicAddress()
    
    // Mark initialization as complete so watchers can trigger
    vm.isInitializing = false
    
    // Setup websocket listener (async, needs to await address)
    await vm.setupListener()

    // Request wake lock with error handling
    try {
      self.wakeLock = useWakeLock()
      await self.wakeLock.request('screen')
    } catch (error) {
      // Wake lock permission may be denied - this is not critical, just log it
      console.warn('Wake lock permission denied or not available:', error)
    }

    vm.tokens = await vm.getMainchainTokens()
  },

  created () {
    const vm = this
    
    // Check if asset data was passed from select-asset page
    // This allows immediate rendering with correct logo and details
    if (vm.$route.query.assetData) {
      try {
        const passedAsset = JSON.parse(vm.$route.query.assetData)
        if (passedAsset && passedAsset.id) {
          // Use the passed asset data immediately
          vm.asset = {
            id: passedAsset.id,
            name: passedAsset.name || 'Unknown Token',
            symbol: passedAsset.symbol || '',
            decimals: passedAsset.decimals !== undefined ? passedAsset.decimals : 0,
            logo: passedAsset.logo || null,
            balance: passedAsset.balance !== undefined ? passedAsset.balance : undefined
          }
          console.log('[Receive] Using passed asset data from select-asset page:', vm.asset)
          if (vm.assetId.startsWith('ct/')) {
            vm.setAmountInFiat = false
          }
          return // Early return - we have the asset data we need
        }
      } catch (error) {
        console.warn('[Receive] Failed to parse passed asset data:', error)
        // Fall through to default logic below
      }
    }
    
    // Fallback to original logic if no asset data was passed or parsing failed
    if (vm.assetId.endsWith('unlisted')) {
      vm.asset = {
        id: vm.assetId,
        name: vm.$t('NewUnlisted'),
        symbol: vm.assetId.split('/')[0].toUpperCase() + ' Token',
        logo: vm.assetId.split('/')[0] + '-logo.png'
      }
    } else {
      vm.asset = vm.getAsset(vm.assetId)
      if (vm.assetId.startsWith('ct/')) {
        vm.setAmountInFiat = false
      }
    }
    // Don't set generating to false here - let refreshDynamicAddress() handle it
  }
}
</script>

<style lang="scss" scoped>
body {
  overflow: hidden;
}
.q-icon {
  position: relative;
  z-index: 10; /* Ensure the icon is clickable over the card */
}
#context-menu {
  position: fixed;
  top: 16px;
  color: #3b7bf6;
  z-index: 150;
}
.qr-code-container {
  margin-top: 20px;
  padding-left: 28px;
  padding-right: 28px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  
  // The QR component uses inline styles with fixed size (280px for size 220 + padding 30*2)
  // On small screens, reduce padding to give QR code more room
}
/* iPhone 5/SE and small screens - reduce padding to fit QR */
@media (min-width: 280px) and (max-width: 360px) {
  .qr-code-container {
    margin-top: 30px;
    padding-left: 12px;
    padding-right: 12px;
  }
}
/* Galaxy Fold and very small screens - minimal padding */
@media (max-width: 280px) {
  .qr-code-container {
    margin-top: 66px;
    padding-left: 8px;
    padding-right: 8px;
  }
}
.qr-code-text {
  font-family: monospace;
  font-size: 17px;
  color: #000;
}
.copy-container {
  padding: 20px 40px 0px 40px;
  overflow-wrap: break-word;
  .receive-label {
    font-size: 15px;
    letter-spacing: 1px;
  }
  .receive-amount-label {
    font-size: 18px;
    letter-spacing: 1px;
  }
}
.set-amount-button {
  margin-left: 35px;
  font-weight: 500;
}
</style>

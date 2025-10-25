<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('Receive') + ' ' + asset.symbol"
      backnavpath="/receive/select-asset"
      class="header-nav"
    ></header-nav>
    <div v-if="!amountDialog" class="text-bow" :class="getDarkModeClass(darkMode)">
      <q-icon
        v-if="!isSep20"
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
        <div v-if="asset.id ==='bch'" class="row flex-center">
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
                  <qr-code
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
        <div v-if="!isCt && asset.id ==='bch'" class="row flex-center">
          <q-icon v-if="showLegacy" name="fas fa-angle-up" size="1.4em" @click="showLegacy = false" style="z-index: 1000;" />
          <q-icon v-else name="fas fa-angle-down" size="1.4em" @click="showLegacy = true" />
        </div>
        <div class="row q-mt-md" v-if="walletType === 'bch' && asset.id ==='bch' && !isCt && showLegacy">
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
        <div class="row">
          <div class="col copy-container">
            <span class="qr-code-text text-weight-light text-center">
              <div
                class="text-nowrap text-bow"
                style="letter-spacing: 1px;"
                @click="copyToClipboard(isCt ? address : addressAmountFormat)"
                :class="getDarkModeClass(darkMode)"
              >
                {{ address.substring(0, 16) }}...{{ address.substring(address.length - 4) }} <q-icon name="fas fa-copy" style="font-size: 14px;" />
              </div>
              <div v-if="lnsName" class="text-center text-caption" style="color: #000 !important;">
                {{ lnsName }}
                <q-btn
                  type="a"
                  size="sm"
                  flat
                  padding="none"
                  icon="open_in_new"
                  :href="`https://app.bch.domains/name/${lnsName}/details`"
                  target="_blank"
                />
              </div>
            </span>
            <div v-if="amount && !isCt" class="text-center">
              <q-separator class="q-mb-sm q-mx-md q-mt-md" style="height: 2px;" />
              <div class="text-bow" :class="getDarkModeClass(darkMode)">
                <div class="receive-label q-mt-md">
                  {{ $t('YouWillReceive') }}
                </div>
                <div class="text-weight-light receive-amount-label">
                  {{ formatWithLocale(amount, decimalObj) }}
                  {{ setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : asset.symbol }}
                </div>
              </div>
            </div>
            <div
              v-if="!isCt"
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
            :inputSymbol="setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : asset.symbol"
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
import { watchTransactions } from '../../wallet/sbch'
import { NativeAudio } from '@capacitor-community/native-audio'
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
  generateSbchAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'

import HeaderNav from '../../components/header-nav'
import CustomInput from 'src/components/CustomInput.vue'

const sep20IdRegexp = /sep20\/(.*)/
const sBCHWalletType = 'Smart BCH'

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
      sBCHListener: null,
      activeBtn: 'btn-bch',
      walletType: '',
      isCt: false,
      asset: {},
      assetLoaded: false,
      legacy: false,
      showLegacy: false,
      lnsName: '',
      generateAddressOnLeave: false,
      generating: false,
      amount: '',
      amountDialog: false,
      setAmountInFiat: true,
      tokens: [],
      dynamicAddress: '' // Store dynamically generated address
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
    theme () {
      return this.$store.getters['global/theme']
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    isSep20 () {
      return this.network === 'sBCH'
    },
    address () {
      // Use dynamically generated address instead of store-retrieved address
      const address = this.dynamicAddress
      if (!address) return ''
      
      if (this.walletType === sBCHWalletType) {
        return address
      } else if (this.legacy) {
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
      return this.$store.getters['market/getAssetPrice'](this.asset.id, this.selectedMarketCurrency())
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
        const tokenAmount = parseFloat(tempAmount) * (10 ** this.asset.decimals)
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
    async getSmartchainTokens () {
      const tokens = await this.$store.dispatch(
        'sep20/getMissingAssets',
        {
          address: this.getWallet('sbch').lastAddress,
          icludeIgnoredTokens: false
        }
      )
      return tokens
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
    updateLnsName () {
      if (!this.isSep20) return
      if (!this.address) return

      return this.$store.dispatch('lns/resolveAddress', { address: this.address })
        .then(response => {
          if (response && response.name) {
            this.lnsName = response.name
            return Promise.resolve(response)
          }
        })
    },
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    getImageUrl (asset) {
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
      const newAddressIndex = lastAddressIndex + 1

      vm.stopSbchListener()
      delete this?.$options?.sockets

      getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
        const wallet = new Wallet(mnemonic, vm.network)
        if (vm.walletType === 'bch') {
          getWalletByNetwork(wallet, vm.walletType).getNewAddressSet(newAddressIndex).then(function (result) {
            const addresses = result.addresses
            vm.$store.commit('global/generateNewAddressSet', {
              type: 'bch',
              lastAddress: addresses.receiving,
              lastChangeAddress: addresses.change,
              lastAddressIndex: newAddressIndex
            })
            // Refresh the dynamic address after generating new address
            vm.refreshDynamicAddress()
            try { vm.setupListener() } catch {}
          }).finally(() => {
            vm.generating = false
          })
        }
        if (vm.walletType === 'slp') {
          getWalletByNetwork(wallet, vm.walletType).getNewAddressSet(newAddressIndex).then(function (addresses) {
            vm.$store.commit('global/generateNewAddressSet', {
              type: 'slp',
              lastAddress: addresses.receiving,
              lastChangeAddress: addresses.change,
              lastAddressIndex: newAddressIndex
            })
            // Refresh the dynamic address after generating new address
            vm.refreshDynamicAddress()
            try { vm.setupListener() } catch {}
          })
        }

        if (vm.walletType === sBCHWalletType) {
          wallet.sBCH.getOrInitWallet().then(() => {
            wallet.sBCH.subscribeWallet()
          })
        }
      })
    },
    async showPrivateKey () {
      try {
        const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
        const wallet = new Wallet(mnemonic, this.network)
        const lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
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
        const lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
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
      if (this.isSep20) {
        this.walletType = 'sbch'
        // For sBCH, generate dynamically
        try {
          const address = await generateSbchAddress({
            walletIndex: this.$store.getters['global/getWalletIndex']
          })
          if (!address) {
            throw new Error('Failed to generate and subscribe sBCH address')
          }
          return address
        } catch (error) {
          console.error('Error generating sBCH address:', error)
          this.$q.notify({
            message: this.$t('FailedToGenerateAddress') || 'Failed to generate address. Please try again.',
            color: 'negative',
            icon: 'warning'
          })
          // Fallback to store if generation fails
          return this.$store.getters['global/getAddress'](this.walletType)
        }
      } else if (this.assetId.indexOf('slp/') > -1) {
        this.walletType = 'slp'
      } else {
        this.walletType = 'bch'
      }

      // Generate address dynamically from mnemonic instead of using stored address
      try {
        const addressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
        let address = await generateReceivingAddress({
          walletIndex: this.$store.getters['global/getWalletIndex'],
          derivationPath: getDerivationPathForWalletType(this.walletType),
          addressIndex: addressIndex,
          isChipnet: this.isChipnet
        })
        
        // Check if subscription failed (returns null)
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
        // Fallback to store-retrieved address if dynamic generation fails
        let address = this.$store.getters['global/getAddress'](this.walletType)
        if (this.assetId.indexOf('ct/') > -1 && !forListener) {
          address = convertCashAddress(address, this.isChipnet, true)
        }
        return address
      }
    },
    async refreshDynamicAddress() {
      // Regenerate the dynamic address when needed
      const address = await this.getAddress()
      this.dynamicAddress = address
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
      let getter = 'assets/getAsset'
      if (this.isSep20) {
        getter = 'sep20/getAsset'
      }
      const assets = this.$store.getters[getter](id)
      if (assets.length > 0) {
        return assets[0]
      }
    },
    playSound (success) {
      if (success) {
        NativeAudio.play({
          assetId: 'send-success'
        })
      }
    },
    notifyOnReceive (amount, symbol, logo, decimals = 0, isCashToken = false) {
      const vm = this
      vm.generateAddressOnLeave = vm.$store.getters['global/autoGenerateAddress']
      vm.playSound(true)
      vm.$confetti.start({
        particles: [
          {
            type: 'heart'
          }
        ],
        size: 3,
        dropRate: 3
      })
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
      setTimeout(function () {
        vm.$confetti.stop()
      }, 3000)
    },
    convertToLegacyAddress (address) {
      const addressObj = new Address(address)
      return addressObj.toLegacyAddress()
    },
    setupListener () {
      const vm = this
      if (vm.isSep20) return vm.setupSbchListener()

      let url
      let assetType
      const address = vm.getAddress(true)
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
            vm.notifyOnReceive(
              data.amount / (10 ** data.token_decimals),
              data.token_symbol.toUpperCase(),
              vm.getImageUrl(vm.asset),
              tokenType === 'ct' ? vm.asset.decimals : 0,
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
          vm.notifyOnReceive(
            amount,
            data.token_symbol.toUpperCase(),
            vm.getImageUrl(vm.asset)
          )

          // if unlisted token is detected, add to front of list
          // check if token already added in list
          if (!vm.tokens.map(a => a.id).includes(data.token_id)) {
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

                vm.$store.commit(`${tokenWithBalance.isSep20 ? 'sep20' : 'assets'}/addNewAsset`, tokenWithBalance)
                vm.$store.commit(`${tokenWithBalance.isSep20 ? 'sep20' : 'assets'}/moveAssetToBeginning`)
              }
            } catch (error) {
              console.error('Error adding new token:', error)
            }
          }
        }
      }
    },

    setupSbchListener () {
      const vm = this
      if (!vm.isSep20) return

      const address = vm.getAddress()
      const opts = { type: 'incoming' }
      if (sep20IdRegexp.test(vm.asset.id)) {
        const contractAddress = vm.asset.id.match(sep20IdRegexp)[1]
        opts.contractAddresses = [contractAddress]
        opts.tokensOnly = true
      } else {
        opts.tokensOnly = false
      }

      // Stop listener if another listener already exists
      vm.stopSbchListener()
      watchTransactions(
        address,
        opts,
        function ({ tx }) {
          if (!tx || tx.to !== address) return

          vm.notifyOnReceive(
            tx.amount,
            vm.asset.symbol,
            vm.getImageUrl(vm.asset)
          )
        }
      ).then(listener => {
        vm.sBCHListener = listener
      })
    },

    stopSbchListener () {
      if (this.sBCHListener && this.sBCHListener.stop && this.sBCHListener.stop.call) {
        this.sBCHListener.stop()
      }
    }
  },

  watch: {
    address () {
      this.lnsName = ''
      this.updateLnsName()
    },
    walletType () {
      // Refresh dynamic address when wallet type changes
      this.refreshDynamicAddress()
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
      this.stopSbchListener()
      this.$disconnect()
      delete this?.$options?.sockets
    }

    NativeAudio.unload({
      assetId: 'send-success',
    })

    await self.wakeLock.release()
  },

  async beforeMount() {
    const result = await this.$store.dispatch('global/autoGenerateAddress', {
      walletType: this.walletType,
      tokenId: this.assetId.replace('ct/', '').replace('slp/', '')
    })
    console.log('Auto generate address', result)
  },

  async mounted () {
    const vm = this
    
    // Generate the dynamic address first
    await vm.refreshDynamicAddress()
    
    vm.setupListener()
    this.updateLnsName()

    let path = 'send-success.mp3'
    if (this.$q.platform.is.ios) {
      path = 'public/assets/send-success.mp3'
    }
    NativeAudio.preload({
      assetId: 'send-success',
      assetPath: path,
      audioChannelNum: 1,
      volume: 1.0,
      isUrl: false
    })

    self.wakeLock = useWakeLock()
    await wakeLock.request('screen')

    vm.tokens = vm.$store.getters['global/network'] === 'sBCH' ? await vm.getSmartchainTokens() : await vm.getMainchainTokens()
  },

  created () {
    const vm = this
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
    vm.generating = false
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
}
/* iPhone 5/SE */
@media (min-width: 280px) and (max-width: 320px) {
  .qr-code-container {
    margin-top: 30px;
  }
}
/* Galaxy Fold */
@media (min-width: 200px) and (max-width: 280px) {
  .qr-code-container {
    margin-top: 66px;
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

<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('Receive') + ' ' + asset.symbol"
      backnavpath="/receive/select-asset"
    ></header-nav>
    <div v-if="!amountDialog">
      <q-icon
        v-if="!isSep20"
        id="context-menu"
        size="35px"
        name="more_vert"
        :style="{'margin-left': (getScreenWidth() - 45) + 'px', 'margin-top': $q.platform.is.ios ? '42px' : '0px'}"
      >
        <q-menu anchor="bottom right" self="top end">
          <q-list class="pt-card" style="min-width: 100px" :class="getDarkModeClass(darkMode)">
            <q-item clickable v-close-popup>
              <q-item-section class="pt-label" :class="getDarkModeClass(darkMode)" @click="generateNewAddress">
                {{ $t('GenerateNewAddress') }}
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup>
              <q-item-section class="pt-label" :class="getDarkModeClass(darkMode)" @click="copyPrivateKey">
                <template v-if="copying">
                  {{ $t('Copying') }}...
                </template>
                <template v-else>
                  {{ $t('CopyPrivateKey') }}
                </template>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-icon>
      <div class="text-center" style="padding-top: 80px;" v-if="generatingAddress">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
      <template v-else>
        <div class="row">
          <div class="col qr-code-container" @click="copyToClipboard(address)">
            <div class="col col-qr-code q-pl-sm q-pr-sm">
              <div class="row text-center">
                <div class="col row justify-center q-pt-md">
                  <img :src="asset.logo || getFallbackAssetLogo(asset)" height="50" alt="" class="receive-icon-asset">
                  <qr-code :text="addressAmountFormat" color="#253933" :size="200" error-level="H" class="q-mb-sm"></qr-code>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row q-mt-md" v-if="walletType === 'bch' && assetId.indexOf('ct/') === -1">
          <q-toggle
            v-model="legacy"
            class="text-bow"
            style="margin: auto;"
            :class="getDarkModeClass(darkMode)"
            keep-color
            color="blue-9"
            :label="$t('LegacyAddress')"
          />
        </div>
        <div class="row">
          <div class="col copy-container">
            <span class="qr-code-text text-weight-light text-center">
              <div
                class="text-nowrap text-bow"
                style="letter-spacing: 1px;"
                @click="copyToClipboard(address)"
                :class="getDarkModeClass(darkMode)"
              >
                {{ address }}
                <p class="copy-address-button">{{ $t('ClickToCopyAddress') }}</p>
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

            <div v-if="amount" class="text-center">
              <q-separator class="q-mb-sm q-mx-md" style="height: 2px;" />
              <div class="text-bow" :class="getDarkModeClass(darkMode)">
                <div class="receive-label">
                  {{ $t('YouWillReceive') }}
                </div>
                <div class="text-weight-light receive-amount-label">
                  {{ amount }} {{ setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : 'BCH' }}
                </div>
              </div>
            </div>
            <div
              v-if="asset.symbol === 'BCH'"
              @click="amountDialog = true"
              class="text-center button button-text-primary"
              style="font-size: 18px;"
              :class="getDarkModeClass(darkMode)"
            >
              {{ amount ? $t('Update') : $t('Set') }} {{ $t('Amount') }}
            </div>
          </div>
        </div>
      </template>
    </div>
    <div v-if="amountDialog">
      <div class="text-right">
        <q-btn
          flat
          padding="lg"
          size="lg"
          icon="close"
          class="close-button"
          @click="setReceiveAmount('close')"
        />
      </div>
      <div :style="`margin-top: ${$q.screen.height * .15}px`">
        <div class="text-center text-bow text-h6" :class="getDarkModeClass(darkMode)">{{ $t('SetReceiveAmount') }}</div>
        <div class="col q-mt-md q-px-lg text-center">
          <q-input
            type="text"
            inputmode="none"
            @focus="openCustomKeyboard(true)"
            filled
            v-model="tempAmount"
            :label="$t('Amount')"
            :readonly="readonlyState"
            :dark="darkMode"
          >
            <template v-slot:append>
              <div class="q-pr-sm text-weight-bold" style="font-size: 15px;">
                {{setAmountInFiat ? String(selectedMarketCurrency()).toUpperCase() : 'BCH'}}
              </div>
            </template>
          </q-input>
        </div>
        <div
          class="q-pt-md text-subtitle1 button button-text-primary set-amount-button"
          :class="getDarkModeClass(darkMode)"
          @click="setAmountInFiat = !setAmountInFiat"
        >
          {{ $t('SetAmountIn') }} {{ setAmountInFiat ? 'BCH' : String(selectedMarketCurrency()).toUpperCase() }}
        </div>
      </div>
    </div>
  </div>

  <customKeyboard
    :custom-keyboard-state="customKeyboardState"
    v-on:addKey="setAmount"
    v-on:makeKeyAction="makeKeyAction"
  />
</template>

<script>
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'
import ProgressLoader from '../../components/ProgressLoader'
import customKeyboard from '../../pages/transaction/dialog/CustomKeyboard.vue'
import { getMnemonic, Wallet, Address } from '../../wallet'
import { watchTransactions } from '../../wallet/sbch'
import { NativeAudio } from '@capacitor-community/native-audio'
import {
  getWalletByNetwork,
  getWatchtowerWebsocketUrl,
  convertCashAddress,
  convertTokenAmount,
} from 'src/wallet/chipnet'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { useWakeLock } from '@vueuse/core'

const sep20IdRegexp = /sep20\/(.*)/
const sBCHWalletType = 'Smart BCH'

export default {
  name: 'receive-page',
  mixins: [
    walletAssetsMixin
  ],
  components: { HeaderNav, ProgressLoader, customKeyboard },
  data () {
    return {
      sBCHListener: null,
      activeBtn: 'btn-bch',
      walletType: '',
      asset: {},
      assetLoaded: false,
      legacy: false,
      lnsName: '',
      generatingAddress: false,
      generateAddressOnLeave: false,
      copying: false,
      amount: '',
      tempAmount: '',
      readonlyState: false,
      amountDialog: false,
      customKeyboardState: 'dismiss',
      setAmountInFiat: false,
      tokens: []
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
      const address = this.getAddress()
      if (this.walletType === sBCHWalletType) {
        return address
      } else if (this.legacy) {
        return this.convertToLegacyAddress(address)
      } else {
        return address
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

      tempAddress += this.amount ? '?amount=' + tempAmount : ''

      return tempAddress
    }
  },
  methods: {
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
    setReceiveAmount (state) {
      if (state !== 'close') {
        this.amount = this.tempAmount
      }
      this.readonlyState = false
      this.amountDialog = false
      this.customKeyboardState = 'dismiss'
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    openCustomKeyboard (state) {
      this.readonlyState = state

      if (state) {
        this.customKeyboardState = 'show'
      } else {
        this.customKeyboardState = 'dismiss'
      }
    },
    setAmount (key) {
      let receiveAmount, finalAmount, tempAmountFormatted = ''

      receiveAmount = this.tempAmount

      receiveAmount = receiveAmount === null ? '' : receiveAmount
      if (key === '.' && receiveAmount === '') {
        finalAmount = '0.'
      } else {
        finalAmount = receiveAmount.toString()
        const hasPeriod = finalAmount.indexOf('.')
        if (hasPeriod < 1) {
          if (Number(finalAmount) === 0 && Number(key) > 0) {
            finalAmount = key
          } else {
            // Check amount if still zero
            if (Number(finalAmount) === 0 && Number(finalAmount) === Number(key)) {
              finalAmount = 0
            } else {
              finalAmount += key.toString()
            }
          }
        } else {
          finalAmount += key !== '.' ? key.toString() : ''
        }
      }
      // // Set the new amount
      this.tempAmount = finalAmount
    },
    makeKeyAction (action) {
      if (action === 'backspace') {
        // Backspace
        this.tempAmount = String(this.tempAmount).slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.tempAmount = ''
      } else {
        // Enabled submit slider
        if (this.tempAmount) {
          this.setReceiveAmount('gen')
        }
        this.customKeyboardState = 'dismiss'
        this.readonlyState = false
      }
    },
    getDarkModeClass,
    isNotDefaultTheme,
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
    getScreenWidth () {
      const divBounds = document.body.getBoundingClientRect()
      return divBounds.width
    },
    generateNewAddress () {
      const vm = this
      vm.generatingAddress = true
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
            vm.generatingAddress = false
            vm.$store.dispatch('chat/addIdentity', result.pgpIdentity)
            try { vm.setupListener() } catch {}
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
            vm.generatingAddress = false
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
    async copyPrivateKey () {
      try {
        this.copying = true
        const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
        const wallet = new Wallet(mnemonic, this.network)
        const lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
        const dynamicWallet = getWalletByNetwork(wallet, this.walletType)
        const privateKey = await dynamicWallet.getPrivateKey('0/' + String(lastAddressIndex))
        this.copyToClipboard(privateKey)
      } finally {
        this.copying = false
      }
    },
    getAddress (forListener = false) {
      if (this.isSep20) {
        this.walletType = 'sbch'
        // if (this.wallet) return this.wallet.sBCH._wallet.address
        // else return ''
      } else if (this.assetId.indexOf('slp/') > -1) {
        this.walletType = 'slp'
      } else {
        this.walletType = 'bch'
      }

      let address = this.$store.getters['global/getAddress'](this.walletType)
      if (this.assetId.indexOf('ct/') > -1 && !forListener) {
        address = convertCashAddress(address, this.isChipnet, true)
      }
      return address
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
      let tempAddress = value
      let tempAmount = this.amount

      if (this.setAmountInFiat && this.amount) {
        tempAmount = this.convertFiatToSelectedAsset(this.amount)
      }

      tempAddress += this.amount ? '?amount=' + tempAmount : ''

      this.$copyText(tempAddress)
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
        if (isCashToken) {
          amount = convertTokenAmount(amount, decimals)
        }
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
              BigInt(data.amount) / (BigInt(10) ** BigInt(data.token_decimals)),
              data.token_symbol.toUpperCase(),
              vm.asset.logo || vm.getFallbackAssetLogo(vm.asset),
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
            vm.asset.logo || vm.getFallbackAssetLogo(vm.asset)
          )

          // if unlisted token is detected, add to front of list
          // check if token already added in list
          if (!vm.tokens.map(a => a.id).includes(data.token_id)) {
            const newTokenData = await vm.$store.dispatch('assets/getAssetMetadata', data.token_id)
            newTokenData.balance = amount

            if (!newTokenData?.decimals || newTokenData?.isNft) {
              console.log('Not adding unrecognized token due to being an nft')
            }

            vm.$store.commit(`${newTokenData.isSep20 ? 'sep20' : 'assets'}/addNewAsset`, newTokenData)
            vm.$store.commit(`${newTokenData.isSep20 ? 'sep20' : 'assets'}/moveAssetToBeginning`)
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
            vm.asset.logo || vm.getFallbackAssetLogo(vm.asset)
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
    amountDialog () {
      this.tempAmount = this.amount
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

  async mounted () {
    const vm = this

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
    }
  }
}
</script>

<style lang="scss" scoped>
  body {
    overflow: hidden;
  }
  #context-menu {
    position: fixed;
    top: 16px;
    color: #3b7bf6;
    z-index: 150;
  }
  .qr-code-container {
    margin-top: 40px;
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
  .col-qr-code {
    margin-left: auto;
    margin-right: auto;
    text-align: center;
    width: 300px;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    padding: 25px 10px 32px 10px;
    background: white;
  }
  .qr-code-text {
    font-size: 18px;
    color: #000;
  }
  .receive-icon-asset {
    position: absolute;
    margin-top: 73px;
    background: white;
    border-radius: 50%;
    padding: 4px;
  }
  .copy-container {
    padding: 20px 40px 0px 40px;
    overflow-wrap: break-word;
    .copy-address-button {
      font-size: 12px;
      margin-top: 7px;
    }
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

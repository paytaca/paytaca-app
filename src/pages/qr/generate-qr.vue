<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('GenerateQR')" backnavpath="/" />

    <div
      v-if="generatingAddress"
      class="text-center"
      style="padding-top: 80px;"
    >
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
    </div>

    <div v-else class="row flex-center">
      <div class="row flex-center" style="margin-top: 20px;">
        <q-img src="bch-logo.png" height="35px" width="35px" />
        &nbsp;BCH
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
        <q-img src="ct-logo.png" height="35px" width="35px" />
        {{ $t('CashToken') }}
      </div>

      <div class="row col-12 flex-center">
        <div class="col qr-code-container" @click="copyToClipboard(address)">
          <div class="col col-qr-code q-pl-sm q-pr-sm">
            <div class="row text-center">
              <div v-if="!isCt" class="col row justify-center q-pt-md">
                <img src="bch-logo.png" height="50" alt="" class="receive-icon-asset">
                <qr-code
                  class="q-mb-sm"
                  color="#253933"
                  error-level="H"
                  :text="address"
                  :size="200"
                />
              </div>
              <div v-else class="col row justify-center q-pt-md">
                <img src="ct-logo.png" height="50" alt="" class="receive-icon-asset">
                <qr-code
                  class="q-mb-sm"
                  color="#253933"
                  error-level="H"
                  :text="address"
                  :size="200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isCt" class="row col-12 flex-center q-mt-md">
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

      <div class="row col-12 flex-center">
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
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { getWatchtowerWebsocketUrl, convertCashAddress } from 'src/wallet/chipnet'
import { Address } from 'src/wallet'
import { useWakeLock } from '@vueuse/core'
import HeaderNav from 'src/components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader'

export default {
  name: 'GenerateQR',

  components: {
    HeaderNav,
    ProgressLoader
  },

  data () {
    return {
      generatingAddress: false,
      isCt: false,
      legacy: false,
      addresses: [],
      incomingTransactions: []
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
    address () {
      if (this.legacy) {
        return this.convertToLegacyAddress(this.addresses[0])
      }

      return this.addresses[this.isCt ? 1 : 0]
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    copyToClipboard (value) {
      const vm = this

      vm.$copyText(value)
      vm.$q.notify({
        message: vm.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    getAddresses () {
      const vm = this

      vm.addresses.push(vm.$store.getters['global/getAddress']('bch'))
      vm.addresses.push(convertCashAddress(
        vm.$store.getters['global/getAddress']('bch'),
        this.isChipnet,
        true
      ))
    },
    convertToLegacyAddress (address) {
      const addressObj = new Address(address)
      return addressObj.toLegacyAddress()
    },
    setupListener () {
      const vm = this
      const wsURL = getWatchtowerWebsocketUrl(vm.isChipnet)
      const url = `${wsURL}/watch/bch/${this.address}/`
      vm.$connect(url)
      vm.$options.sockets.onmessage = async function (message) {
        const data = JSON.parse(message.data)
        if (this.incomingTransactions.indexOf(data.txid) === -1) {
          this.incomingTransactions.push(data.txid)
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
            let decimals = 8
            let amount = data.value / (10 ** decimals)
            if (data.token_id.startsWith('ct/')) {
              decimals = data.token_decimals
              amount = Number(data.amount) / (10 ** data.token_decimals)
            }
            vm.$q.notify({
              classes: 'br-15 text-body1',
              message: `${amount.toFixed(decimals)} ${data.token_symbol.toUpperCase()} received!`,
              color: 'blue-9',
              position: 'bottom',
              timeout: 4000
            })
          }
          setTimeout(function () {
            vm.$confetti.stop()
          }, 3000)
        }
      }
    }
  },

  async mounted () {
    const vm = this

    vm.generatingAddress = true
    vm.getAddresses()
    vm.generatingAddress = false

    vm.setupListener()
    self.wakeLock = useWakeLock()
    await wakeLock.request('screen')
  },

  async unmounted () {
    await self.wakeLock.release()
    this.$disconnect()
  }
}
</script>

<style lang="scss" scoped>
  body {
    overflow: hidden;
  }
  .qr-code-container {
    margin-top: 20px;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .qr-code-container {
      margin-top: 10px;
    }
  }
  /* Galaxy Fold */
  @media (min-width: 200px) and (max-width: 280px) {
    .qr-code-container {
      margin-top: 46px;
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
    padding: 20px 20px 0px 20px;
    overflow-wrap: break-word;
    text-wrap: wrap;
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
</style>

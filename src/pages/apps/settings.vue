<template>
  <div class="pt-settings" :class="{'pt-dark': darkMode}">
      <header-nav :title="$t('Settings')" backnavpath="/apps" />
      <div class="row" :style="{ 'padding-top': $q.platform.is.ios ? '90px' : '60px'}">
          <div class="col-12 q-px-lg q-mt-md">
              <p class="q-px-sm q-my-sm dim-text text-h6">{{ $t('Security') }}</p>
              <q-list bordered separator style="border-radius: 14px; background: #fff" :class="{'pt-dark-card': darkMode}">
                <q-item clickable v-ripple v-if="securityAuth" @click="securityOptionDialogStatus='show in settings'">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('SecurityAuthenticationSetup') }}</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                        <q-icon name="security" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
                    </q-item-section>
                </q-item>
                <q-item :disable="!pinStatus" clickable v-ripple @click="popUpPinDialog">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Pin') }} {{ !pinStatus ? '(disabled)' : '' }}</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                        <q-icon name="mdi-pin" class="q-pr-sm" :class="darkMode ? 'text-blue-7' : 'text-grey'"></q-icon>
                    </q-item-section>
                </q-item>
              </q-list>
          </div>

          <div class="col-12 q-px-lg q-mt-md">
              <p class="q-px-sm q-my-sm dim-text text-h6">{{ $t('Wallet') }}</p>
              <q-list bordered separator style="border-radius: 14px; background: #fff" :class="{'pt-dark-card': darkMode}">
                <q-item>
                    <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Currency') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-select
                        dense
                        :style="{ width: $q.platform.is.mobile === true ? '75%' : '100%' }"
                        use-input
                        fill-input
                        hide-selected
                        borderless
                        :dark="darkMode"
                        :option-label="opt => String(opt && opt.name)"
                        v-model="selectedCurrency"
                        :options="filteredCurrencyOptions"
                        @filter="filterCurrencyOptionSelection"
                      >
                        <template v-slot:option="scope">
                          <q-item
                            v-bind="scope.itemProps"
                          >
                            <q-item-section>
                              <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
                                {{ String(scope.opt.symbol).toUpperCase() }}
                              </q-item-label>
                              <q-item-label
                                v-if="scope.opt.name"
                                caption
                                :class="{ 'text-black': !darkMode && !scope.selected }"
                              >
                                {{ scope.opt.name }}
                              </q-item-label>
                            </q-item-section>
                          </q-item>
                        </template>
                      </q-select>
                    </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Show Tokens') }}</q-item-label>
                  </q-item-section>
                  <q-item-section avatar>
                      <q-toggle
                        v-model="showTokens"
                        color="blue-9"
                        keep-color
                      />
                    </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Manage Ignored Tokens') }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      :label="$t('Manage')"
                      no-caps
                      :to="{ path: '/apps/settings/ignored-tokens' }"
                    />
                  </q-item-section>
                </q-item>

                <q-item clickable v-ripple @click="isChipnet = !isChipnet">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Use Chipnet Network') }}</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="isChipnet"
                        color="blue-9"
                        keep-color
                      />
                    </q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="enableSmartBCH = !enableSmartBCH">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Show SmartBCH') }}</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="enableSmartBCH"
                        color="blue-9"
                        keep-color
                      />
                    </q-item-section>
                </q-item>
              </q-list>
          </div>

          <div class="col-12 q-px-lg q-mt-md">
              <p class="q-px-sm q-my-sm dim-text text-h6">{{ $t('Personalize') }}</p>
              <q-list bordered separator style="border-radius: 14px; background: #fff" :class="{'pt-dark-card': darkMode}">
                <q-item>
                  <q-item-section>
                    <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('Language') }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <LanguageSelector :darkMode="darkMode" />
                  </q-item-section>
                </q-item>

                <q-item clickable v-ripple @click="darkMode = !darkMode">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu" :class="{'pt-dark-label': darkMode}">{{ $t('DarkMode') }}</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="darkMode"
                        color="blue-9"
                        keep-color
                      />
                    </q-item-section>
                </q-item>
              </q-list>
          </div>
      </div>

      <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" :darkMode="darkMode" />
      <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="removePinCaption" />

  </div>
</template>

<script>
import pinDialog from '../../components/pin'
import securityOptionDialog from '../../components/authOption'
import HeaderNav from '../../components/header-nav'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'
import LanguageSelector from '../../components/settings/LanguageSelector'

const { SecureStoragePlugin } = Plugins

export default {
  data () {
    return {
      pinDialogAction: '',
      securityOptionDialogStatus: 'dismiss',
      securityAuth: false,
      pinStatus: true,
      filteredCurrencyOptions: [],
      darkMode: this.$store.getters['darkmode/getStatus'],
      isChipnet: this.$store.getters['global/isChipnet'],
      showTokens: this.$store.getters['global/showTokens'],
      enableSmartBCH: this.$store.getters['global/enableSmartBCH']
    }
  },
  components: {
    HeaderNav,
    pinDialog,
    securityOptionDialog,
    LanguageSelector,
  },
  watch: {
    isChipnet (n, o) {
      this.$store.commit('global/toggleIsChipnet')
    },
    showTokens (n, o) {
      this.$store.commit('global/showTokens')
    },
    enableSmartBCH (n, o) {
      this.$store.commit('global/enableSmartBCH')
    },
    darkMode (newVal, oldVal) {
      this.$store.commit('darkmode/setDarkmodeSatus', newVal)
    },
    selectedCurrency () {
      this.$store.dispatch('market/updateAssetPrices', {})
    }
  },
  computed: {
    currencyOptions () {
      return this.$store.getters['market/currencyOptions']
    },
    selectedCurrency: {
      get () {
        return this.$store.getters['market/selectedCurrency']
      },
      set (value) {
        this.$store.commit('market/updateSelectedCurrency', value)
        this.$store.dispatch('global/saveWalletPreferences')
      }
    }
  },
  methods: {
    filterCurrencyOptionSelection (val, update) {
      if (!val) {
        this.filteredCurrencyOptions = this.currencyOptions
      } else {
        const needle = String(val).toLowerCase()
        this.filteredCurrencyOptions = this.currencyOptions
          .filter(currency =>
            String(currency && currency.name).toLowerCase().indexOf(needle) >= 0 ||
            String(currency && currency.symbol).toLowerCase().indexOf(needle) >= 0
          )
      }

      update()
    },
    popUpPinDialog () {
      this.pinDialogAction = 'SET NEW'
    },
    removePinCaption (action = '') {
      this.pinDialogAction = ''
      if (action !== 'cancel') {
        this.securityOptionDialogStatus = 'dismiss'
      }
    },
    setPreferredSecurity (auth) {
      const vm = this
      vm.$q.localStorage.set('preferredSecurity', auth)
      if (auth === 'pin') {
        vm.pinStatus = true
        SecureStoragePlugin.get({ key: 'pin' })
          .then(() => {
            vm.securityOptionDialogStatus = 'dismiss'
          })
          .catch(_err => {
            vm.pinDialogAction = 'SET NEW'
          })
      } else {
        vm.pinStatus = false
        vm.securityOptionDialogStatus = 'dismiss'
      }
    }
  },
  created () {
    console.log('SmartBCH', this.enableSmartBCH)
    NativeBiometric.isAvailable()
      .then(result => {
        if (result.isAvailable !== false) {
          this.securityAuth = true
        } else {
          this.securityAuth = false
          this.pinStatus = true
        }
      },
      (error) => {
        this.pinStatus = true
        console.log('Implementation error: ', error)
      })
  },
  mounted () {
    if (this.$q.localStorage.getItem('preferredSecurity') === 'pin') {
      this.pinStatus = true
    } else {
      this.pinStatus = false
    }

    this.$store.dispatch('market/updateSupportedCurrencies', {})
    this.$store.dispatch('global/refetchWalletPreferences')
  }
}
</script>

<style>
.pt-settings {
    background-color: #ECF3F3;
    min-height: 100vh;
}
.pt-item {
    border-bottom-right-radius: 14px;
    border-bottom-left-radius: 14px;
}
.dim-text {
    color: #ed5f59;
}
.pt-setting-menu {
    color: #3B7BF6;
    font-weight: 400;
}
.pt-setting-avatar-dark {
    color: #A6ACAF;
}
</style>

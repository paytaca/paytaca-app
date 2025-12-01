<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Support', {}, 'Support')" backnavpath="/apps" class="header-nav header-nav apps-header" />
    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('ScanTools', {}, 'Scan Tools') }}</p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('UtxoScan') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('UtxoScanDescription', {}, 'Scan for unspent transaction outputs to fix balance issues') }}
              </q-item-label>
              <q-banner
                v-if="bchUtxoScanTaskInfo?.taskId && bchUtxoScanTaskInfo?.completedAt"
                dense
                class="rounded-borders q-mt-sm pt-card-2 text-bow"
                :class="getDarkModeClass(darkMode, '', 'bg-grey-2')"
              >
                {{ $t('UTXOScanComplete') }} {{ formatTimestampToText(bchUtxoScanTaskInfo?.completedAt) }}
                <template v-slot:action>
                  <q-btn
                    no-caps flat
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('Dismiss')"
                    @click="$store.commit('global/removeUtxoScanTask', bchUtxoScanTaskInfo?.walletHash)"
                  />
                </template>
              </q-banner>
              <div v-if="bchUtxoScanOngoing" class="text-center text-grey q-mt-sm">
                <template v-if="bchUtxoScanTaskInfo?.taskId && bchUtxoScanTaskInfo?.queueInfo?.time_start">
                  {{ $t('UTXOScanOngoing') }} {{ formatRelativeTime(bchUtxoScanTaskInfo?.queueInfo?.time_start * 1000) }}
                </template>
                <template v-else>
                  {{ $t('ScanningForUtxos') }}
                </template>
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                no-caps
                class="button"
                :disable="bchUtxoScanOngoing"
                :loading="bchUtxoScanOngoing"
                :label="$t('Scan')"
                @click="scanBCHUtxos()"
              />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('AddressScan') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('AddressScanDescription', {}, 'Scan for untracked addresses to fix transaction issues') }}
              </q-item-label>
              <div v-if="scanningBchAddresses" class="text-center text-grey q-mt-sm">
                {{ $t('ScanningForUntrackedAddr') }}
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                no-caps
                class="button"
                :disable="scanningBchAddresses"
                :loading="scanningBchAddresses"
                :label="$t('Scan')"
                @click="scanBCHAddresses()"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('GetHelp', {}, 'Get Help') }}</p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/support')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('HelpCenter', {}, 'Help Center') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('HelpCenterDescription', {}, 'Browse articles and guides') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="help" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/faq')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('FAQ', {}, 'FAQ') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('FAQDescription', {}, 'Frequently asked questions') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="quiz" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('mailto:support@paytaca.com')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('ContactSupport', {}, 'Contact Support') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('ContactSupportDescription', {}, 'Email us at support@paytaca.com') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="email" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Community', {}, 'Community') }}</p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://t.me/PaytacaWalletApp')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('Telegram', {}, 'Telegram') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('TelegramDescription', {}, 'Join our Telegram community') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-telegram" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://github.com/paytaca/paytaca-app')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('GitHub', {}, 'GitHub') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('GitHubDescription', {}, 'View source code and report issues') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="code" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Resources', {}, 'Resources') }}</p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('Website', {}, 'Website') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('WebsiteDescription', {}, 'Visit paytaca.com') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="language" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/docs')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('Documentation', {}, 'Documentation') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('DocumentationDescription', {}, 'Read our documentation') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="menu_book" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getMnemonic, Wallet } from '../../wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { markRaw } from '@vue/reactivity'
import ago from 's-ago'

export default {
  name: 'app-support',
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      wallet: null,
      scanningBchUtxos: false,
      scanningBchAddresses: false,
      bchAddressScanResponseDialog: null,
      prevUtxoStatusUpdateTimeout: null
    }
  },
  computed: {
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    },
    bchUtxoScanTaskInfo() {
      let walletHash = this.getWallet('bch')?.walletHash
      if (this.wallet) walletHash = getWalletByNetwork(this.wallet, 'bch').walletHash

      const utxoScanInfo = this.$store.getters['global/getUtxoScanInfo'](walletHash)
      if (utxoScanInfo) {
        // if task was added 1 hour ago, consider as not scanning anymore
        const expiry = Date.now() - (60 * 60 * 1000 )
        utxoScanInfo.expired = expiry > utxoScanInfo.timestamp

        utxoScanInfo.walletHash = walletHash
      }
      return utxoScanInfo
    },
    bchUtxoScanOngoing() {
      if (this.scanningBchUtxos) return true
      if (this.bchUtxoScanTaskInfo?.taskId) {
        if (this.bchUtxoScanTaskInfo.completedAt) return false
        if (this.bchUtxoScanTaskInfo.expired) return false
        return true
      }
      return false
    }
  },
  methods: {
    getDarkModeClass,
    formatTimestampToText(timestamp) {
      const dateObj = new Date(timestamp)
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
    },
    formatRelativeTime (date) {
      return ago(new Date(date))
    },
    loadWallet () {
      const vm = this
      return getMnemonic(vm.$store.getters['global/getWalletIndex'])
        .then(function (mnemonic) {
          const wallet = new Wallet(mnemonic, 'BCH')
          vm.wallet = markRaw(wallet)
        })
    },
    updateUtxoScanTasksStatus(nextUpdate=5*1000, age=0) {
      const bchWalletHash = getWalletByNetwork(this.wallet, 'bch').getWalletHash()  

      const updateScanPromise = this.$store.dispatch('global/updateUtxoScanTaskStatus', { walletHash: bchWalletHash, age: age })

      updateScanPromise
        .finally(() => {
          if (Number.isSafeInteger(nextUpdate)) {
            clearTimeout(this.prevUtxoStatusUpdateTimeout)
            this.prevUtxoStatusUpdateTimeout = setTimeout(
              () => this.updateUtxoScanTasksStatus(nextUpdate),
              nextUpdate,
            )
          }
        })
    },
    async scanBCHUtxos() {
      if (!this.wallet) await this.loadWallet()

      this.scanningBchUtxos = true
      getWalletByNetwork(this.wallet, 'bch').scanUtxos({ background: true })
        .then(response => {
          if (response?.data?.task_id) {
            this.$store.commit('global/setUtxoScanTask', {
              walletHash: getWalletByNetwork(this.wallet, 'bch').getWalletHash(),
              taskId: response.data.task_id,
            })
            this.updateUtxoScanTasksStatus()
          }
        })
        .finally(() => {
          this.scanningBchUtxos = false
        })
    },
    async scanBCHAddresses() {
      if (!this.wallet) await this.loadWallet()
      const lastAddressFromStore = this.$store.getters['global/getWallet']('bch')?.lastAddress
      const lastAddressIndexFromStore = this.$store.getters['global/getWallet']('bch')?.lastAddressIndex
      const lastAddressIndex = (Number.isSafeInteger(lastAddressIndexFromStore) && lastAddressIndexFromStore >= 0)
        ? lastAddressIndexFromStore
        : -1
      const count = 5

      this.scanningBchAddresses = true
      getWalletByNetwork(this.wallet, 'bch').scanAddresses({ startIndex: lastAddressIndex+1, count: count })
        .then(response => {
          if (!response.success) return Promise.reject(response)
          if (!Array.isArray(response?.subscriptionResponses)) return Promise.reject(response)

          const subscribedAddressSets = response.subscriptionResponses
            .filter(subscriptionResponse => subscriptionResponse?.success)
            .map(subscriptionResponse => subscriptionResponse?.address_set)
            .filter(addressSet => {
              if (!Number.isSafeInteger(addressSet.address_index)) return false
              if (!addressSet.addresses.receiving) return false
              if (!addressSet.addresses.change) return false
              return true
            })

          // extract address set with greatest address_index
          const latestAddressSet = subscribedAddressSets
            .reduce((_latest, addressSet) => {
              if (addressSet.address_index < _latest?.address_index) return _latest
              return addressSet
            }, null)

          if (latestAddressSet?.address_index >= lastAddressIndex) {
            this.$store.commit('global/generateNewAddressSet', {
              type: 'bch',
              lastAddress: latestAddressSet.addresses.receiving,
              lastChangeAddress: latestAddressSet.addresses.change,
              lastAddressIndex: latestAddressSet.address_index
            })
            if (latestAddressSet.addresses.receiving !== lastAddressFromStore) {
              this.bchAddressScanResponseDialog?.hide?.()
              this.bchAddressScanResponseDialog = this.$q.dialog({
                title: 'BCH address scan complete',
                html: true,
                message: [
                  `Latest address is now:<br/>`,
                  latestAddressSet.addresses.receiving,
                  lastAddressFromStore ? `<br/><br/>Previous:<br/>${lastAddressFromStore}` : '',
                ].join(''),
                ok: true,
                seamless: true,
                class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
                style: 'word-break:break-word;',
              })
            }
          }
          return Promise.resolve({
            scanMore: subscribedAddressSets?.length >= count
          })
        })
        .then(postScanResponse => {
          if (postScanResponse?.scanMore) this.scanBCHAddresses()
        })
        .finally(() => {
          this.scanningBchAddresses = false
        })
    },
    getWallet (type) {
      const wallet = this.$store.getters['global/getWallet'](type)
      // Return wallet if it exists, otherwise return a safe default object
      if (!wallet) {
        // Return a minimal wallet object to prevent errors
        return {
          walletHash: '',
          derivationPath: '',
          xPubKey: '',
          lastAddress: '',
          lastChangeAddress: '',
          lastAddressIndex: 0,
          subscribed: false
        }
      }
      return wallet
    },
    openUrl (url) {
      if (url.startsWith('mailto:')) {
        window.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }
  },
  beforeUnmount() {
    clearTimeout(this.prevUtxoStatusUpdateTimeout)
  },
  mounted () {
    this.loadWallet().then(() => this.updateUtxoScanTasksStatus())
  }
}
</script>

<style lang="scss" scoped>
  .section-title {
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    opacity: 0.85;
    
    &.dark {
      color: rgba(255, 255, 255, 0.8);
    }
    &.light {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .pt-setting-menu {
    font-weight: 400;
    font-size: 15px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-setting-avatar-dark {
    color: #A6ACAF;
  }

  .pt-label {
    font-size: 14px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-card {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .settings-list {
    .q-item {
      padding: 16px 20px;
      min-height: 64px;
      
      &:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      &.dark:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
    }

    :deep(.q-item__label--caption) {
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1.3;
      font-size: 13px;
    }
  }

  #app-container {
    &.dark {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      }
    }
    
    &.light {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
    }
  }
</style>

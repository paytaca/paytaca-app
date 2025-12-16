<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Support', {}, 'Support')" backnavpath="/apps" class="header-nav header-nav apps-header" />
    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
          {{ $t('WalletTools', {}, 'Wallet Tools') }}
        </p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="scanUtxos" :disable="scanningUtxos">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('UtxoScan') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('UtxoScanDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="search" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
            <q-item-section side v-if="scanningUtxos">
              <q-spinner color="primary" size="20px" />
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="scanAddresses" :disable="scanningAddresses">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('AddressScan') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('AddressScanDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-map-search" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
            <q-item-section side v-if="scanningAddresses">
              <q-spinner color="primary" size="20px" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
          {{ $t('GetHelp') }}
        </p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/support')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('HelpCenter') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('HelpCenterDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="help" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/faq')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('FAQ') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('FAQDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="quiz" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('mailto:support@paytaca.com')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('ContactSupport') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('ContactSupportDescription', { supportEmail: 'support@paytaca.com' }, `Email us at support@paytaca.com`) }}
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
                {{ $t('Telegram') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('TelegramDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-telegram" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://github.com/paytaca/paytaca-app')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('GitHub') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('GitHubDescription') }}
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
                {{ $t('Website') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('WebsiteDescription', { website: 'paytaca.com' }, 'Visit paytaca.com') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="language" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/docs')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('Documentation') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('DocumentationDescription') }}
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
import { loadWallet, getMnemonic } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'

export default {
  name: 'app-support',
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      scanningUtxos: false,
      scanningAddresses: false,
      utxoScanPollInterval: null
    }
  },
  computed: {
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    }
  },
  methods: {
    getDarkModeClass,
    showDeleteDialog () {
      const vm = this
      vm.disableDeleteButton = true
      vm.$q.dialog({
        title: this.$t('DeleteWallet'),
        message: this.$t('DeleteWalletDescription'),
        dark: true,
        cancel: this.$t('Cancel'),
        seamless: true,
        ok: this.$t('Yes')
      }).onOk(() => {
        vm.deletingWalletDialog()
        vm.deleteWallet(vm)
      }).onCancel(() => {
        vm.disableDeleteButton = false
      })
    },
    switchWallet (index) {
      const vm = this
      const currentWalletIndex = this.$store.getters['global/getWalletIndex']
      if (index !== currentWalletIndex) {
        const asset = this.$store.getters['assets/getAllAssets']
        vm.$store.commit('assets/updateVaultSnapshot', { index: currentWalletIndex, snapshot: asset })
        vm.$store.commit('assets/updatedCurrentAssets', index)

        vm.$store.dispatch('global/switchWallet', index).then(function () {
          vm.$router.push('/')
          setTimeout(() => { location.reload() }, 500)
        })
      }
    },
    openUrl (url) {
      if (url.startsWith('mailto:')) {
        window.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    async scanUtxos () {
      const vm = this
      if (vm.scanningUtxos) return
      
      vm.scanningUtxos = true
      try {
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        const wallet = await loadWallet('BCH', walletIndex)
        const isChipnet = vm.$store.getters['global/isChipnet']
        const bchWallet = getWalletByNetwork(wallet, 'bch')
        const walletHash = bchWallet.walletHash
        
        const response = await bchWallet.scanUtxos({ background: true })
        const taskId = response?.data?.task_id || response?.data?.taskId
        
        if (taskId) {
          // Store the task in the store
          vm.$store.commit('global/setUtxoScanTask', {
            walletHash: walletHash,
            taskId: taskId,
            status: 'PENDING',
            completedAt: 0
          })
          
          vm.$q.notify({
            message: vm.$t('UTXOScanOngoing', {}, 'UTXO scan started in the background'),
            timeout: 3000,
            color: 'blue-9',
            icon: 'check_circle'
          })
          
          // Poll for completion (loader will be turned off in pollUtxoScanStatus)
          vm.pollUtxoScanStatus(walletHash)
        } else {
          throw new Error('No task ID returned from scan')
        }
      } catch (error) {
        console.error('Error starting UTXO scan:', error)
        vm.scanningUtxos = false
        vm.$q.notify({
          message: vm.$t('ErrorStartingUtxoScan', {}, 'Failed to start UTXO scan'),
          timeout: 3000,
          color: 'red-9',
          icon: 'error'
        })
      }
    },
    async pollUtxoScanStatus (walletHash) {
      const vm = this
      // Clear any existing polling interval
      if (vm.utxoScanPollInterval) {
        clearInterval(vm.utxoScanPollInterval)
      }
      
      const maxAttempts = 120 // Poll for up to 10 minutes (5 second intervals)
      let attempts = 0
      
      vm.utxoScanPollInterval = setInterval(async () => {
        attempts++
        
        try {
          const result = await vm.$store.dispatch('global/updateUtxoScanTaskStatus', {
            walletHash: walletHash,
            age: 5000 // Only update if last update was more than 5 seconds ago
          })
          
          if (result.success && result.taskInfo) {
            const status = result.taskInfo.status
            
            if (status === 'SUCCESS') {
              clearInterval(vm.utxoScanPollInterval)
              vm.utxoScanPollInterval = null
              vm.scanningUtxos = false
              
              vm.$q.notify({
                message: vm.$t('UTXOScanComplete', {}, 'UTXO scan completed'),
                timeout: 5000,
                color: 'green-9',
                icon: 'check_circle'
              })
            } else if (status === 'FAILURE') {
              clearInterval(vm.utxoScanPollInterval)
              vm.utxoScanPollInterval = null
              vm.scanningUtxos = false
              vm.$q.notify({
                message: vm.$t('UTXOScanFailed', {}, 'UTXO scan failed'),
                timeout: 5000,
                color: 'red-9',
                icon: 'error'
              })
            }
          }
          
          // Stop polling after max attempts
          if (attempts >= maxAttempts) {
            clearInterval(vm.utxoScanPollInterval)
            vm.utxoScanPollInterval = null
            vm.scanningUtxos = false
          }
        } catch (error) {
          // If update fails (e.g., no task found), stop polling
          if (error?.error === 'no ongoing task id found') {
            clearInterval(vm.utxoScanPollInterval)
            vm.utxoScanPollInterval = null
            vm.scanningUtxos = false
          }
        }
      }, 5000) // Poll every 5 seconds
    },
    async scanAddresses () {
      const vm = this
      if (vm.scanningAddresses) return
      
      vm.scanningAddresses = true
      try {
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        const wallet = await loadWallet('BCH', walletIndex)
        const isChipnet = vm.$store.getters['global/isChipnet']
        const bchWallet = getWalletByNetwork(wallet, 'bch')
        
        const lastAddressIndex = vm.$store.getters['global/getWallet']('bch')?.lastAddressIndex || 0
        const startIndex = Math.max(0, lastAddressIndex - 10)
        const count = 20
        
        const result = await bchWallet.scanAddresses({ startIndex, count })
        
        if (result.success) {
          vm.$q.notify({
            message: vm.$t('AddressScanComplete', {}, 'Address scan completed successfully'),
            timeout: 3000,
            color: 'blue-9',
            icon: 'check_circle'
          })
        } else {
          throw new Error(result.error || 'Address scan failed')
        }
      } catch (error) {
        console.error('Error scanning addresses:', error)
        vm.$q.notify({
          message: vm.$t('ErrorScanningAddresses', {}, 'Failed to scan addresses'),
          timeout: 3000,
          color: 'red-9',
          icon: 'error'
        })
      } finally {
        vm.scanningAddresses = false
      }
    }
  },
  beforeUnmount () {
    // Clean up polling interval when component is destroyed
    if (this.utxoScanPollInterval) {
      clearInterval(this.utxoScanPollInterval)
      this.utxoScanPollInterval = null
    }
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

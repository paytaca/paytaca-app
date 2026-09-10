<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Support', {}, 'Support')" :backnavpath="supportBacknavPath" class="header-nav header-nav apps-header" />
    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
          {{ $t('WalletTools', {}, 'Support Tools') }}
        </p>
        <p class="q-px-sm q-mb-sm text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="line-height: 1.4;">
          {{ $t('SupportToolsDescription', {}, 'Most issues involving balance, sending, and transaction history records can be resolved with these scan tools. Start with a Quick Scan. If still not resolved, do an Exhaustive Scan.') }}
        </p>
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-card
              class="scan-menu-card text-center text-bow"
              :class="getDarkModeClass(darkMode)"
              @click="scanUtxos"
            >
              <q-spinner v-if="scanningUtxos" color="primary" size="40px" class="q-mt-md" />
              <q-icon v-else name="search" size="40px" class="q-mt-md" :class="darkMode ? 'text-blue-4' : 'text-primary'" />
              <div class="text-weight-medium q-mt-sm">{{ $t('QuickScan', {}, 'Quick Scan') }}</div>
              <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('QuickScanDescription', {}, 'Scan for UTXOs of all the subscribed addresses') }}
              </div>
            </q-card>
          </div>
          <div class="col-6">
            <q-card
              class="scan-menu-card text-center text-bow"
              :class="getDarkModeClass(darkMode)"
              @click="scanAddresses"
            >
              <q-spinner v-if="scanningAddresses" color="primary" size="40px" class="q-mt-md" />
              <q-icon v-else name="mdi-map-search" size="40px" class="q-mt-md" :class="darkMode ? 'text-blue-4' : 'text-primary'" />
              <div class="text-weight-medium q-mt-sm">{{ $t('ExhaustiveScan', {}, 'Exhaustive Scan') }}</div>
              <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('ExhaustiveScanDescription', {}, 'Discover all used addresses and their UTXOs') }}
              </div>
            </q-card>
          </div>
        </div>
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
          <q-item clickable v-ripple @click="openUrl('https://github.com/paytaca/paytaca-app')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                GitHub
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('GitHubDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="code" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('mailto:support@paytaca.com')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('EmailSupport', {}, 'Email Support') }}
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
          <q-item clickable v-ripple @click="openUrl('https://www.facebook.com/paytaca')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                Facebook
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('FollowUsOn', { platform: 'Facebook' }, 'Follow us on Facebook') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-facebook" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://www.instagram.com/paytaca')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                Instagram
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('FollowUsOn', { platform: 'Instagram' }, 'Follow us on Instagram') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-instagram" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://x.com/_paytaca_')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                X
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('FollowUsOn', { platform: 'X (Twitter)' }, 'Follow us on X (Twitter)') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-twitter" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://t.me/PaytacaWalletApp')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                Telegram
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('TelegramDescription', { telegram: 'Telegram' }, 'Join our Telegram community') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-telegram" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Resources', {}, 'Resources') }}</p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://www.paytaca.com')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('PaytacaWebsite', {}, 'Paytaca Website') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('PaytacaWebsiteDescription', { paytacaWebsite: 'paytaca.com' }, 'Visit paytaca.com') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="language" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://bitcoiniscash.org')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                Bitcoin Is Cash
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('BitcoinIsCashDescription', {}, 'Learn about Bitcoin Cash') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="info" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://minisatoshi.cash')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('MoreAboutBitcoinCash', {}, 'More About Bitcoin Cash') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('MoreAboutBitcoinCashDescription', {}, 'Educational resources about Bitcoin Cash') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="school" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
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
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'

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
      utxoScanPollInterval: null,
      utxoScanDialog: null
    }
  },
  computed: {
    supportBacknavPath () {
      return this.$route.query.from === 'home' ? '/' : '/apps'
    },
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
          vm.$store.commit('global/setWalletSwitchInProgress', true)
          vm.$router.replace('/')
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
      vm.utxoScanDialog = vm.$q.dialog({
        title: vm.$t('QuickScan', {}, 'Quick Scan'),
        message: vm.$t('ScanInProgress', {}, 'Scanning in progress. Please keep this screen open until done.'),
        progress: { spinner: true },
        persistent: true,
        ok: false,
        dark: vm.darkMode
      })
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

          // Poll for completion (dialog will be closed in pollUtxoScanStatus)
          vm.pollUtxoScanStatus(walletHash)
        } else {
          throw new Error('No task ID returned from scan')
        }
      } catch (error) {
        console.error('Error starting quick scan:', error)
        vm.scanningUtxos = false
        if (vm.utxoScanDialog) {
          vm.utxoScanDialog.hide()
          vm.utxoScanDialog = null
        }
        vm.$q.notify({
          message: vm.$t('ErrorStartingQuickScan', {}, 'Failed to start quick scan'),
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
              if (vm.utxoScanDialog) {
                vm.utxoScanDialog.hide()
                vm.utxoScanDialog = null
              }

              vm.$q.dialog({
                title: vm.$t('QuickScan', {}, 'Quick Scan'),
                message: vm.$t('QuickScanComplete', {}, 'Quick scan completed'),
                dark: vm.darkMode
              })
            } else if (status === 'FAILURE') {
              clearInterval(vm.utxoScanPollInterval)
              vm.utxoScanPollInterval = null
              vm.scanningUtxos = false
              if (vm.utxoScanDialog) {
                vm.utxoScanDialog.hide()
                vm.utxoScanDialog = null
              }
              vm.$q.dialog({
                title: vm.$t('QuickScan', {}, 'Quick Scan'),
                message: vm.$t('QuickScanFailed', {}, 'Quick scan failed'),
                dark: vm.darkMode
              })
            }
          }

          // Stop polling after max attempts
          if (attempts >= maxAttempts) {
            clearInterval(vm.utxoScanPollInterval)
            vm.utxoScanPollInterval = null
            vm.scanningUtxos = false
            if (vm.utxoScanDialog) {
              vm.utxoScanDialog.hide()
              vm.utxoScanDialog = null
            }
          }
        } catch (error) {
          // If update fails (e.g., no task found), stop polling
          if (error?.error === 'no ongoing task id found') {
            clearInterval(vm.utxoScanPollInterval)
            vm.utxoScanPollInterval = null
            vm.scanningUtxos = false
            if (vm.utxoScanDialog) {
              vm.utxoScanDialog.hide()
              vm.utxoScanDialog = null
            }
          }
        }
      }, 5000) // Poll every 5 seconds
    },
    scanAddresses () {
      const vm = this
      if (vm.scanningAddresses) return

      vm.scanningAddresses = true
      let scanDialog = vm.$q.dialog({
        title: vm.$t('ExhaustiveScan', {}, 'Exhaustive Scan'),
        message: vm.$t('ScanInProgress', {}, 'Scanning in progress. Please keep this screen open until done.'),
        progress: { spinner: true },
        persistent: true,
        ok: false,
        dark: vm.darkMode
      })
      const closeScanDialog = () => {
        if (scanDialog) {
          scanDialog.hide()
          scanDialog = null
        }
      }
      setTimeout(async () => {
        let bchWallet
        let wallet
        try {
          const walletIndex = vm.$store.getters['global/getWalletIndex']
          wallet = await loadWallet('BCH', walletIndex)
          bchWallet = getWalletByNetwork(wallet, 'bch')

          let usedDiscovery = false
          try {
            const discoveryResult = await bchWallet.discoverAddresses({
              gapLimit: 20,
              batchSize: 50,
              onProgress(progress) {
                const phase = progress.phase === 'subscribing' ? 'subscribing' : 'discovering'
                console.log(`Address discovery: ${phase} - scanned ${progress.scanned}, found ${progress.discoveredReceiving + progress.discoveredChange} addresses`)
              },
            })

            if (discoveryResult.success) {
              const total = discoveryResult.discoveredReceiving.length + discoveryResult.discoveredChange.length
              usedDiscovery = total > 0

              closeScanDialog()
              vm.$q.dialog({
                title: vm.$t('ExhaustiveScan', {}, 'Exhaustive Scan'),
                message: vm.$t(
                  'ExhaustiveScanComplete',
                  { total },
                  'Address discovery completed. Found {total} used addresses.'
                ),
                dark: vm.darkMode
              })

              try {
                await vm.$store.dispatch('global/loadWalletLastAddressIndex')
              } catch (e) {
                console.warn('Failed to refresh last address index after discovery:', e)
              }

              try {
                await updateAssetBalanceOnLoad('bch', wallet, vm.$store)
              } catch (e) {
                console.warn('Failed to refresh BCH balance after address scan:', e)
              }
            }
          } catch (discoveryError) {
            console.warn('Address discovery endpoint not available, falling back to bulk scan:', discoveryError)
          }

          if (!usedDiscovery) {
            const lastAddressIndex = vm.$store.getters['global/getWallet']('bch')?.lastAddressIndex || 0

            const startIndex = 0
            const gapLimit = 20
            const count = lastAddressIndex + gapLimit + 1

            const result = await bchWallet.scanAddresses({ startIndex, count })

            if (result.success) {
              closeScanDialog()
              vm.$q.dialog({
                title: vm.$t('ExhaustiveScan', {}, 'Exhaustive Scan'),
                message: vm.$t('ExhaustiveScanComplete', {}, 'Exhaustive scan completed'),
                dark: vm.darkMode
              })

              try {
                await updateAssetBalanceOnLoad('bch', wallet, vm.$store)
              } catch (e) {
                console.warn('Failed to refresh BCH balance after address scan:', e)
              }
            } else {
              throw new Error(result.error || 'Address scan failed')
            }
          }
        } catch (error) {
          console.error('Error scanning addresses:', error)
          vm.$q.notify({
            message: vm.$t('ErrorExhaustiveScan', {}, 'Failed to scan addresses'),
            timeout: 3000,
            color: 'red-9',
            icon: 'error'
          })
        } finally {
          closeScanDialog()
          vm.scanningAddresses = false
          bchWallet?.clearMasterHDNodeCache()
        }
      }, 100)
    }
  },
  beforeUnmount () {
    if (this.utxoScanPollInterval) {
      clearInterval(this.utxoScanPollInterval)
      this.utxoScanPollInterval = null
    }
    if (this.utxoScanDialog) {
      this.utxoScanDialog.hide()
      this.utxoScanDialog = null
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

  .scan-menu-card {
    padding: 24px 12px;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }
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

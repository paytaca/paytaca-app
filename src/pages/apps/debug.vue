<template>
  <div id="app-container" class="debug-page sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('Debug')"
      backnavpath="/apps"
      class="header-nav q-px-sm apps-header"
    >
      <template #top-right-menu>
        <q-btn
          flat
          round
          icon="visibility_off"
          @click="hideDebugApp"
          class="q-mr-sm"
        >
          <q-tooltip>{{ $t('Hide') }}</q-tooltip>
        </q-btn>
      </template>
    </header-nav>

    <div class="q-pa-md q-mt-sm">
      <!-- Tools Section -->
      <q-expansion-item
        :default-opened="false"
        icon="build"
        :label="$t('Tools', {}, 'Tools')"
        header-class="expansion-header"
        :class="getDarkModeClass(darkMode)"
        class="q-mb-md"
      >
        <div v-if="isComponentReady" class="q-pa-md">
      <!-- Enable SLP Toggle -->
      <div class="q-mb-md">
        <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="col">
                <div class="text-subtitle1 text-weight-medium text-bow" :class="getDarkModeClass(darkMode)">
                  {{ $t('EnableSlp') }}
                </div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
                  {{ $t('EnableSlpToolTip', {}, 'Enable SLP token support') }}
                </div>
              </div>
              <q-toggle
                v-model="enableSLP"
                :color="toggleColor"
                keep-color
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

          <!-- Address Key Viewer -->
          <div v-if="isComponentReady" class="q-mb-md">
            <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
                  {{ $t('AddressKeyViewer', {}, 'Address Key Viewer') }}
                </div>
                <div class="text-caption q-mb-md" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
                  {{ $t('AddressKeyViewerToolTip', {}, 'View public and private keys for wallet addresses') }}
                </div>
                
                <q-btn-toggle
                  :model-value="addressInputMode"
                  @update:model-value="onAddressModeChange"
                  toggle-color="primary"
                  :options="addressInputToggleOptions"
                  class="q-mb-md full-width"
                />

                <q-select
                  v-if="addressInputMode === 'select' && addressOptions.length > 0"
                  v-model="selectedAddressForKeys"
                  :options="addressOptions"
                  :label="$t('SelectAddress', {}, 'Select Address')"
                  option-label="label"
                  option-value="address"
                  emit-value
                  map-options
                  :class="getDarkModeClass(darkMode)"
                  class="q-mb-md"
                  @update:model-value="loadKeysForAddress"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ $t('NoAddressesAvailable', {}, 'No addresses available') }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <div v-else class="q-mb-md">
                  <q-input
                    v-model="manualAddressInput"
                    :label="$t('EnterBCHAddress', {}, 'Enter BCH Address')"
                    filled
                    dense
                    :class="getDarkModeClass(darkMode)"
                    class="q-mb-sm"
                    @keyup.enter="loadKeysForManualAddress"
                  />
                  <q-btn
                    color="primary"
                    :label="$t('LoadKeys', {}, 'Load Keys')"
                    @click="loadKeysForManualAddress"
                    :loading="loadingManualAddress"
                    class="full-width"
                  />
                </div>

                <div v-if="(selectedAddressForKeys || manualAddressInput) && addressPublicKey && addressPrivateKey">
                  <div v-if="addressInfo?.address_path" class="q-mb-md">
                    <div class="text-caption text-weight-medium q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                      {{ $t('AddressPath', {}, 'Address Path') }}
                    </div>
                    <div class="text-body2" :class="darkMode ? 'text-grey-4' : 'text-grey-8'">
                      {{ addressInfo.address_path }}
                    </div>
                  </div>

                  <div v-if="addressInfo?.token_address" class="q-mb-md">
                    <div class="text-caption text-weight-medium q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                      {{ $t('TokenAddress', {}, 'Token Address') }}
                    </div>
                    <div class="row items-center q-gutter-sm">
                      <q-input
                        :model-value="addressInfo.token_address"
                        readonly
                        filled
                        dense
                        class="col"
                        :class="getDarkModeClass(darkMode)"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="content_copy"
                        @click="copyToClipboard(addressInfo.token_address, 'Token address')"
                        :class="getDarkModeClass(darkMode)"
                      >
                        <q-tooltip>{{ $t('Copy') }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>

                  <div class="q-mb-md">
                    <div class="text-caption text-weight-medium q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                      {{ $t('PublicKey', {}, 'Public Key') }}
                    </div>
                    <div class="row items-center q-gutter-sm">
                      <q-input
                        :model-value="addressPublicKey"
                        readonly
                        filled
                        dense
                        class="col"
                        :class="getDarkModeClass(darkMode)"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="content_copy"
                        @click="copyToClipboard(addressPublicKey, 'Public key')"
                        :class="getDarkModeClass(darkMode)"
                      >
                        <q-tooltip>{{ $t('Copy') }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>

                  <div class="q-mb-md">
                    <div class="text-caption text-weight-medium q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                      {{ $t('PrivateKey', {}, 'Private Key (WIF)') }}
                    </div>
                    <div class="row items-center q-gutter-sm">
                      <q-input
                        :model-value="addressPrivateKey"
                        readonly
                        filled
                        dense
                        :type="showPrivateKey ? 'text' : 'password'"
                        class="col"
                        :class="getDarkModeClass(darkMode)"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        :icon="showPrivateKey ? 'visibility_off' : 'visibility'"
                        @click="showPrivateKey = !showPrivateKey"
                        :class="getDarkModeClass(darkMode)"
                      >
                        <q-tooltip>{{ showPrivateKey ? $t('Hide') : $t('Show') }}</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        icon="content_copy"
                        @click="copyToClipboard(addressPrivateKey, 'Private key')"
                        :class="getDarkModeClass(darkMode)"
                      >
                        <q-tooltip>{{ $t('Copy') }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-expansion-item>

      <!-- Console Section -->
      <q-expansion-item
        :default-opened="true"
        icon="terminal"
        :label="$t('Console', {}, 'Console')"
        header-class="expansion-header"
        :class="getDarkModeClass(darkMode)"
        class="q-mb-md"
      >
      <div class="terminal-container" :class="getDarkModeClass(darkMode)">
        <div class="terminal-header">
          <span class="terminal-title">{{ $t('ConsoleLogs', {}, 'Console Logs') }}</span>
          <div class="terminal-header-actions">
            <!-- Log Level Filter -->
            <q-btn
              flat
              dense
              :label="getFilterDisplayValue()"
              icon="filter_list"
              class="log-filter-btn q-mr-sm"
              :class="getDarkModeClass(darkMode)"
            >
              <q-menu
                fit
                :offset="[0, 8]"
                class="log-filter-menu"
                :class="getDarkModeClass(darkMode)"
              >
                <q-list dense>
                  <q-item-label header>{{ $t('FilterLogs', {}, 'Filter Logs') }}</q-item-label>
                  <q-item
                    v-for="option in logLevelOptions"
                    :key="option.value"
                    tag="label"
                    clickable
                  >
                    <q-item-section avatar>
                      <q-checkbox
                        :model-value="logLevelFilter.includes(option.value)"
                        @update:model-value="toggleLogLevel(option.value, $event)"
                        :val="option.value"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ option.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="content_copy"
              size="sm"
              @click="copyLogs"
              class="q-mr-xs"
            >
              <q-tooltip>{{ $t('CopyLogs', {}, 'Copy Logs') }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="clear"
              size="sm"
              @click="clearLogs"
              class="q-mr-xs"
            >
              <q-tooltip>{{ $t('Clear') }}</q-tooltip>
            </q-btn>
          </div>
        </div>
        <div class="terminal-body" ref="terminalBody">
          <div
            v-for="(log, index) in filteredLogs"
            :key="index"
            class="log-line"
            :class="`log-${log.type}`"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-type">{{ log.type.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="filteredLogs.length === 0" class="log-empty">
            <span v-if="logs.length === 0">
              {{ $t('NoLogsYet', {}, 'No logs yet. Console output will appear here.') }}
            </span>
            <span v-else>
              {{ $t('NoFilteredLogs', {}, 'No logs match the current filter.') }}
            </span>
          </div>
        </div>
      </div>
      </q-expansion-item>
    </div>
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { wifToPubkey } from 'src/utils/crypto'
import { loadLibauthHdWallet } from 'src/wallet'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import axios from 'axios'

// Module-level log storage - persists across component mounts/unmounts
// This allows logs to continue being captured even when navigating away from debug page
const persistentLogs = []
let isIntercepting = false
let originalConsoleMethods = {}
let logInterceptors = {}
// Store reference to current component instance so interceptors can update the active instance
let currentComponentInstance = null

export default {
  name: 'DebugApp',
  components: {
    headerNav,
  },
  data () {
    return {
      logs: [], // Local reference to persistentLogs for reactivity
      enableSLP: this.$store.getters['global/enableSLP'],
      logLevelFilter: ['log', 'error', 'warn', 'debug', 'info'], // All log levels selected by default
      logLevelOptions: [
        { label: 'Log', value: 'log' },
        { label: 'Error', value: 'error' },
        { label: 'Warn', value: 'warn' },
        { label: 'Debug', value: 'debug' },
        { label: 'Info', value: 'info' }
      ],
      selectedAddressForKeys: null,
      addressPublicKey: null,
      addressPrivateKey: null,
      showPrivateKey: false,
      addressInputMode: 'select',
      manualAddressInput: '',
      loadingManualAddress: false,
      addressInfo: null, // Store full address info from watchtower
      isUpdatingTab: false, // Flag to prevent recursive updates
      addressOptions: [], // Address options as data property to prevent reactivity loops
      isComponentReady: false, // Flag to prevent rendering before component is ready
      addressInputToggleOptions: [
        { label: 'Select from Wallet', value: 'select' },
        { label: 'Enter Manually', value: 'manual' }
      ]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    },
    filteredLogs () {
      // Filter logs based on selected log levels
      if (!this.logLevelFilter || this.logLevelFilter.length === 0) {
        return []
      }
      return this.logs.filter(log => this.logLevelFilter.includes(log.type))
    },
  },
  watch: {
    enableSLP (n, o) {
      this.$store.commit('global/enableSLP')
    }
  },
  methods: {
    getDarkModeClass,
    updateAddressOptions () {
      // Use nextTick to prevent recursive updates during render
      this.$nextTick(() => {
        const addresses = this.$store.getters['global/walletAddresses'] || []
        if (!addresses || addresses.length === 0) {
          this.addressOptions = []
          return
        }
        // Create a new array with deep copy to break reactivity chain
        this.addressOptions = addresses.map(addr => ({
          label: `${addr.address} (Index: ${addr.address_index})`,
          address: addr.address,
          wif: addr.wif,
          index: addr.address_index
        }))
      })
    },
    onAddressModeChange (newMode) {
      // Prevent recursive updates
      if (this.isUpdatingTab || newMode === this.addressInputMode) {
        return
      }
      
      this.isUpdatingTab = true
      
      // Clear keys when switching modes
      this.addressPublicKey = null
      this.addressPrivateKey = null
      this.addressInfo = null
      this.showPrivateKey = false
      if (newMode === 'select') {
        this.manualAddressInput = ''
      } else {
        this.selectedAddressForKeys = null
      }
      
      // Update mode
      this.addressInputMode = newMode
      
      // Reset flag
      this.$nextTick(() => {
        this.isUpdatingTab = false
      })
    },
    async loadKeysForAddress (address) {
      // Reset private key visibility when changing address
      this.showPrivateKey = false
      this.addressInfo = null

      if (!address) {
        this.addressPublicKey = null
        this.addressPrivateKey = null
        return
      }

      // First try to get from store
      const addresses = this.$store.getters['global/walletAddresses'] || []
      const addressData = addresses.find(addr => addr.address === address)

      if (addressData && addressData.wif) {
        try {
          // Get private key (WIF)
          this.addressPrivateKey = addressData.wif

          // Derive public key from WIF
          this.addressPublicKey = wifToPubkey(addressData.wif)

          // Set basic address info
          this.addressInfo = {
            address: address,
            address_path: `0/${addressData.address_index}`,
            token_address: null
          }

          this.addLog('info', `Loaded keys for address: ${address}`)
          return
        } catch (error) {
          console.error('Error loading keys from store:', error)
        }
      }

      // If not in store, try watchtower API
      await this.loadKeysFromWatchtower(address)
    },
    async loadKeysForManualAddress () {
      if (!this.manualAddressInput || !this.manualAddressInput.trim()) {
        this.$q.notify({
          type: 'negative',
          message: this.$t('PleaseEnterAddress', {}, 'Please enter an address'),
          timeout: 2000
        })
        return
      }

      this.loadingManualAddress = true
      this.showPrivateKey = false

      try {
        await this.loadKeysFromWatchtower(this.manualAddressInput.trim())
      } finally {
        this.loadingManualAddress = false
      }
    },
    async loadKeysFromWatchtower (address) {
      try {
        const isChipnet = this.$store.getters['global/isChipnet']
        const baseUrl = getWatchtowerApiUrl(isChipnet)
        const addressUri = encodeURIComponent(address)
        const url = `${baseUrl}/address-info/bch/${addressUri}/`

        this.addLog('info', `Fetching address info from watchtower for: ${address}`)
        const response = await axios.get(url)
        
        const addressFromApi = response.data?.address
        const addressPath = response.data?.address_path

        if (!addressPath) {
          throw new Error('Address path not found in watchtower response')
        }

        // Verify the address matches
        if (addressFromApi && addressFromApi !== address) {
          this.$q.notify({
            type: 'negative',
            message: this.$t('AddressMismatch', {}, 'Address mismatch from watchtower'),
            timeout: 3000
          })
          return
        }

        // Load wallet and get keys from path
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const libauthWallet = await loadLibauthHdWallet(walletIndex, isChipnet)

        // Verify the address path is correct
        const derivedAddress = libauthWallet.getAddressAt({ path: addressPath, token: false })
        if (derivedAddress !== address && addressFromApi !== address) {
          this.$q.notify({
            type: 'negative',
            message: this.$t('AddressNotInWallet', {}, 'Address does not belong to this wallet'),
            timeout: 3000
          })
          this.addressPublicKey = null
          this.addressPrivateKey = null
          this.addressInfo = null
          return
        }

        // Get private key (WIF) from path
        const wif = libauthWallet.getPrivateKeyWifAt(addressPath)
        this.addressPrivateKey = wif

        // Derive public key from WIF
        this.addressPublicKey = wifToPubkey(wif)

        // Store address info from watchtower
        this.addressInfo = {
          address: response.data.address || address,
          token_address: response.data.token_address,
          address_path: addressPath,
          wallet_digest: response.data.wallet_digest,
          project_id: response.data.project_id
        }

        this.addLog('info', `Loaded keys for address: ${address} (path: ${addressPath})`)
        this.selectedAddressForKeys = address // Update selected address if using manual mode
      } catch (error) {
        console.error('Error loading keys from watchtower:', error)
        const errorMessage = error.response?.status === 404
          ? this.$t('AddressNotFoundInWatchtower', {}, 'Address not found in watchtower')
          : error.response?.status === 403
          ? this.$t('AddressNotInWallet', {}, 'Address does not belong to this wallet')
          : this.$t('ErrorLoadingKeys', {}, 'Error loading keys for address')
        
        this.$q.notify({
          type: 'negative',
          message: errorMessage,
          timeout: 3000
        })
        this.addressPublicKey = null
        this.addressPrivateKey = null
        this.addressInfo = null
      }
    },
    async copyToClipboard (text, label) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          this.$q.notify({
            type: 'positive',
            message: `${label} ${this.$t('CopiedToClipboard', {}, 'copied to clipboard')}`,
            timeout: 2000
          })
        } else {
          // Fallback for older browsers
          const textarea = document.createElement('textarea')
          textarea.value = text
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
          this.$q.notify({
            type: 'positive',
            message: `${label} ${this.$t('CopiedToClipboard', {}, 'copied to clipboard')}`,
            timeout: 2000
          })
        }
        this.addLog('info', `${label} copied to clipboard`)
      } catch (error) {
        console.error('Failed to copy:', error)
        this.$q.notify({
          type: 'negative',
          message: this.$t('FailedToCopy', {}, 'Failed to copy to clipboard'),
          timeout: 2000
        })
      }
    },
    addLog (type, message) {
      const time = new Date().toLocaleTimeString()
      const logEntry = {
        type,
        message: String(message),
        time
      }
      
      // Add to persistent storage
      persistentLogs.push(logEntry)
      
      // Limit logs to prevent memory issues (keep last 1000 logs)
      if (persistentLogs.length > 1000) {
        persistentLogs.shift()
      }
      
      // Update local reference for reactivity
      this.logs = [...persistentLogs]
      
      // Auto-scroll to bottom
      this.$nextTick(() => {
        const terminalBody = this.$refs.terminalBody
        if (terminalBody) {
          terminalBody.scrollTop = terminalBody.scrollHeight
        }
      })
    },
    clearLogs () {
      persistentLogs.length = 0
      this.logs = []
    },
    getFilterDisplayValue () {
      if (!this.logLevelFilter || this.logLevelFilter.length === 0) {
        return this.$t('NoFilter', {}, 'None')
      }
      if (this.logLevelFilter.length === this.logLevelOptions.length) {
        return this.$t('All', {}, 'All')
      }
      return `${this.logLevelFilter.length} ${this.$t('Selected', {}, 'selected')}`
    },
    toggleLogLevel (level, enabled) {
      if (enabled) {
        if (!this.logLevelFilter.includes(level)) {
          this.logLevelFilter.push(level)
        }
      } else {
        const index = this.logLevelFilter.indexOf(level)
        if (index > -1) {
          this.logLevelFilter.splice(index, 1)
        }
      }
    },
    copyLogs () {
      // Format filtered logs as text (only copy what's currently visible)
      const logText = this.filteredLogs.map(log => {
        return `[${log.time}] ${log.type.toUpperCase()}: ${log.message}`
      }).join('\n')
      
      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(logText).then(() => {
          this.$q.notify({
            type: 'positive',
            message: this.$t('LogsCopied', {}, 'Logs copied to clipboard'),
            timeout: 2000
          })
        }).catch(err => {
          console.error('Failed to copy logs:', err)
          this.$q.notify({
            type: 'negative',
            message: this.$t('FailedToCopyLogs', {}, 'Failed to copy logs'),
            timeout: 2000
          })
        })
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = logText
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          this.$q.notify({
            type: 'positive',
            message: this.$t('LogsCopied', {}, 'Logs copied to clipboard'),
            timeout: 2000
          })
        } catch (err) {
          console.error('Failed to copy logs:', err)
          this.$q.notify({
            type: 'negative',
            message: this.$t('FailedToCopyLogs', {}, 'Failed to copy logs'),
            timeout: 2000
          })
        }
        document.body.removeChild(textarea)
      }
    },
    interceptConsole () {
      // Always update the component instance reference, even if already intercepting
      // This ensures interceptors use the current (mounted) component instance
      currentComponentInstance = this
      
      // Only set up interceptors if not already intercepting
      if (isIntercepting) {
        // Update logs in current component instance
        if (currentComponentInstance && currentComponentInstance.logs) {
          currentComponentInstance.logs = [...persistentLogs]
        }
        return
      }
      
      // Store original console methods (only once)
      if (Object.keys(originalConsoleMethods).length === 0) {
        originalConsoleMethods = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          debug: console.debug,
          info: console.info
        }
      }

      // Intercept console methods
      const intercept = (method, type) => {
        logInterceptors[method] = (...args) => {
          // Call original method
          originalConsoleMethods[method](...args)
          
          // Add to logs
          const message = args.map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2)
              } catch (e) {
                return String(arg)
              }
            }
            return String(arg)
          }).join(' ')
          
          // Add to persistent logs (this always happens, even when component is unmounted)
          const time = new Date().toLocaleTimeString()
          const logEntry = {
            type,
            message: String(message),
            time
          }
          
          persistentLogs.push(logEntry)
          
          // Limit logs to prevent memory issues (keep last 1000 logs)
          if (persistentLogs.length > 1000) {
            persistentLogs.shift()
          }
          
          // Update local reference using stored component instance
          // This ensures we always update the currently mounted component
          // Note: This check prevents errors when component is unmounted, but logs are still saved above
          if (currentComponentInstance && currentComponentInstance.logs) {
            currentComponentInstance.logs = [...persistentLogs]
            
            // Auto-scroll to bottom if terminal is visible
            // Capture local reference to prevent null access if component unmounts
            const componentInstance = currentComponentInstance
            if (componentInstance.$nextTick) {
              componentInstance.$nextTick(() => {
                // Use captured reference to avoid accessing null if unmounted
                if (componentInstance && componentInstance.$refs) {
                  const terminalBody = componentInstance.$refs.terminalBody
                  if (terminalBody) {
                    terminalBody.scrollTop = terminalBody.scrollHeight
                  }
                }
              })
            }
          }
        }
        // Assign interceptor to console method - this persists even when component unmounts
        console[method] = logInterceptors[method]
      }

      intercept('log', 'log')
      intercept('error', 'error')
      intercept('warn', 'warn')
      intercept('debug', 'debug')
      intercept('info', 'info')
      
      isIntercepting = true
    },
    restoreConsole () {
      // Restore original console methods
      Object.keys(originalConsoleMethods).forEach(method => {
        if (originalConsoleMethods[method]) {
          console[method] = originalConsoleMethods[method]
        }
      })
      
      // Clear interceptors
      logInterceptors = {}
      isIntercepting = false
      
      // Clear component instance reference
      currentComponentInstance = null
    },
    async hideDebugApp () {
      this.$q.dialog({
        class: `text-bow ${this.getDarkModeClass(this.darkMode)}`,
        title: this.$t('HideDebugApp'),
        message: this.$t('AreYouSureYouWantToHideTheDebugApp'),
        cancel: { 
          label: this.$t('Cancel'),
          flat: true,
          color: this.darkMode ? 'grey-6' : 'grey-8'
        },
        ok: { 
          label: this.$t('OK'),
          color: this.toggleColor
        },
        persistent: true
      }).onOk(async () => {
        // Clean up before hiding
        await this.cleanup()
        
        // Store flag in localStorage
        localStorage.setItem('debugAppVisible', 'false')
        this.$router.push('/apps')
      })
    },
    async cleanup () {
      // Log cleanup start before restoring console
      this.addLog('info', 'Cleaning up Debug app...')
      
      // Restore original console methods (stop intercepting)
      // This only happens when user explicitly hides the debug app
      this.restoreConsole()
      
      // Note: We don't clear logs here - they persist in case user reopens debug app
      // Logs are limited to 1000 entries to prevent memory issues
    }
  },
  async mounted () {
    // Initialize toggle options with translations
    this.addressInputToggleOptions = [
      { label: this.$t('SelectFromWallet', {}, 'Select from Wallet'), value: 'select' },
      { label: this.$t('EnterManually', {}, 'Enter Manually'), value: 'manual' }
    ]
    
    // Sync logs from persistent storage
    this.logs = [...persistentLogs]
    
    // Verify interceptors are still active (they should be, but check to be sure)
    let interceptorsWereInactive = false
    if (isIntercepting) {
      // Check if console methods are still our interceptors
      interceptorsWereInactive = ['log', 'error', 'warn', 'debug', 'info'].some(method => {
        return logInterceptors[method] && console[method] !== logInterceptors[method]
      })
    }
    
    // Start intercepting console if not already intercepting
    this.interceptConsole()
    
    // Load wallet addresses if not already loaded
    const addresses = this.$store.getters['global/walletAddresses']
    if (!addresses || addresses.length === 0) {
      try {
        await this.$store.dispatch('global/loadWalletAddresses')
        this.addLog('info', 'Wallet addresses loaded')
      } catch (error) {
        console.error('Error loading wallet addresses:', error)
        this.addLog('warn', 'Could not load wallet addresses')
      }
    }
    
    // Update address options to prevent reactivity issues
    this.updateAddressOptions()
    
    // Mark component as ready after initial setup
    this.$nextTick(() => {
      this.isComponentReady = true
    })
    
    // Add initialization messages
    if (persistentLogs.length === 0) {
      this.addLog('info', 'Debug app initialized')
      this.addLog('info', `Platform: ${this.$q.platform.is.ios ? 'iOS' : this.$q.platform.is.android ? 'Android' : 'Web'}`)
    } else {
      this.addLog('info', 'Debug app resumed - logs continue from previous session')
      if (interceptorsWereInactive) {
        this.addLog('warn', 'Console interceptors were inactive - they have been restored')
      }
    }
    
    // Auto-scroll to bottom to show latest logs
    this.$nextTick(() => {
      const terminalBody = this.$refs.terminalBody
      if (terminalBody) {
        terminalBody.scrollTop = terminalBody.scrollHeight
      }
    })
  },
  async beforeUnmount () {
    // Clear component instance reference if this is the current instance
    // This prevents interceptors from trying to update an unmounted component
    if (currentComponentInstance === this) {
      currentComponentInstance = null
    }
    
    // DON'T restore console here - keep intercepting even when navigating away
    // This allows logs to continue being captured when user goes to sidebar/wallet switching
    // Only restore console when user explicitly hides the debug app
  }
}
</script>

<style scoped lang="scss">
.debug-page {
  min-height: 100vh;
  background-color: #ECF3F3;
}

/* Match Settings page background - inherits from #app-container.dark */
body.theme-glassmorphic-blue .debug-page.dark {
  background-color: #273746;
}

body.theme-glassmorphic-red .debug-page.dark {
  background-color: #462733;
}

body.theme-glassmorphic-green .debug-page.dark {
  background-color: #263d32;
}

body.theme-glassmorphic-gold .debug-page.dark {
  background-color: #3d3224;
}

body.theme-payhero .debug-page.dark {
  background-color: #012121;
}

/* Fallback for default theme or if theme class is not present */
.debug-page.dark {
  background-color: #273746;
}

.debug-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.debug-card.dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-card.light {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.terminal-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.terminal-container.dark {
  background: #0d1117;
  color: #c9d1d9;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
  flex-wrap: wrap;
  gap: 8px;
}

.terminal-container.dark .terminal-header {
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.terminal-title {
  font-weight: bold;
  color: #fff;
}

.terminal-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.log-filter-btn {
  font-size: 11px;
  min-height: 28px;
  padding: 4px 12px;
  
  &.dark {
    color: #c9d1d9;
    background: rgba(255, 255, 255, 0.1);
    
    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }
  
  &.light {
    color: #1e1e1e;
    background: rgba(0, 0, 0, 0.1);
    
    &:hover {
      background: rgba(0, 0, 0, 0.15);
    }
  }
}

.log-filter-menu {
  min-width: 180px;
  
  &.dark {
    background: #1e1e1e;
    color: #c9d1d9;
  }
  
  &.light {
    background: #fff;
    color: #1e1e1e;
  }
}

.terminal-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 12px;
  background: #1e1e1e;
}

.terminal-container.dark .terminal-body {
  background: #0d1117;
}

.log-line {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  word-break: break-word;
  padding: 2px 0;
}

.log-time {
  color: #858585;
  min-width: 80px;
  font-size: 11px;
}

.log-type {
  min-width: 50px;
  font-weight: bold;
  font-size: 10px;
}

.log-message {
  flex: 1;
  white-space: pre-wrap;
}

.log-log .log-type {
  color: #4ec9b0;
}

.log-info .log-type {
  color: #569cd6;
}

.log-warn .log-type {
  color: #dcdcaa;
}

.log-error .log-type {
  color: #f48771;
}

.log-debug .log-type {
  color: #c586c0;
}

.log-success .log-type {
  color: #4ec9b0;
}

.log-empty {
  color: #858585;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

/* Scrollbar styling */
.terminal-body::-webkit-scrollbar {
  width: 8px;
}

.terminal-body::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.terminal-container.dark .terminal-body::-webkit-scrollbar-track {
  background: #161b22;
}

.terminal-body::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.terminal-body::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.expansion-header {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.expansion-header.dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.expansion-header.light {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>


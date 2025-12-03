<template>
  <div class="debug-page" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('Debug')"
      backnavpath="/apps"
      class="header-nav"
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

    <div class="debug-content q-pa-md">
      <!-- Enable SLP Toggle -->
      <div class="q-mb-md">
        <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="col">
                <div class="text-subtitle1 text-weight-medium" :class="getDarkModeClass(darkMode)">
                  {{ $t('EnableSlp') }}
                </div>
                <div class="text-caption text-grey-7" :class="getDarkModeClass(darkMode)">
                  Enable SLP token support
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

      <!-- BCH Denomination Selector -->
      <div class="q-mb-md">
        <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="col">
                <div class="text-subtitle1 text-weight-medium" :class="getDarkModeClass(darkMode)">
                  {{ $t('SelectBCHDenomination') }}
                </div>
                <div class="text-caption text-grey-7" :class="getDarkModeClass(darkMode)">
                  Choose how BCH amounts are displayed
                </div>
              </div>
              <div class="q-ml-md">
                <DenominatorSelector :darkMode="darkMode" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Auto Generate Address Toggle -->
      <div class="q-mb-md">
        <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="col">
                <div class="text-subtitle1 text-weight-medium" :class="getDarkModeClass(darkMode)">
                  {{ $t('AutoGenerateAddress', {}, 'Auto generate address') }}
                </div>
                <div class="text-caption text-grey-7" :class="getDarkModeClass(darkMode)">
                  {{ $t('AutoGenerateAddressToolTip', {}, 'A new address will be generated after receiving assets.') }}
                </div>
              </div>
              <q-toggle
                v-model="autoGenerateAddress"
                :color="toggleColor"
                keep-color
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Sound Test Button -->
      <div class="q-mb-md">
        <q-btn
          color="primary"
          label="Test Sound"
          icon="volume_up"
          @click="testSound"
          :loading="testingSound"
          class="full-width"
        />
      </div>

      <!-- Terminal Display -->
      <div class="terminal-container" :class="getDarkModeClass(darkMode)">
        <div class="terminal-header">
          <span class="terminal-title">Console Logs</span>
          <q-btn
            flat
            dense
            round
            icon="clear"
            size="sm"
            @click="clearLogs"
            class="q-mr-xs"
          >
            <q-tooltip>Clear</q-tooltip>
          </q-btn>
        </div>
        <div class="terminal-body" ref="terminalBody">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="log-line"
            :class="`log-${log.type}`"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-type">{{ log.type.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="log-empty">
            No logs yet. Console output will appear here.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Capacitor } from '@capacitor/core'
import DenominatorSelector from 'src/components/settings/DenominatorSelector'

export default {
  name: 'DebugApp',
  components: {
    headerNav,
    DenominatorSelector
  },
  data () {
    return {
      logs: [],
      testingSound: false,
      originalConsole: {},
      logInterceptors: {
        log: null,
        error: null,
        warn: null,
        debug: null,
        info: null
      },
      enableSLP: this.$store.getters['global/enableSLP'],
      autoGenerateAddress: this.$store.getters['global/autoGenerateAddress']
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
    }
  },
  watch: {
    enableSLP (n, o) {
      this.$store.commit('global/enableSLP')
    },
    autoGenerateAddress (n, o) {
      this.$store.commit('global/toggleAutoGenerateAddress')
    }
  },
  methods: {
    getDarkModeClass,
    addLog (type, message) {
      const time = new Date().toLocaleTimeString()
      this.logs.push({
        type,
        message: String(message),
        time
      })
      
      // Auto-scroll to bottom
      this.$nextTick(() => {
        const terminalBody = this.$refs.terminalBody
        if (terminalBody) {
          terminalBody.scrollTop = terminalBody.scrollHeight
        }
      })
    },
    clearLogs () {
      this.logs = []
    },
    interceptConsole () {
      // Store original console methods
      this.originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.debug,
        info: console.info
      }

      // Intercept console methods
      const intercept = (method, type) => {
        this.logInterceptors[method] = (...args) => {
          // Call original method
          this.originalConsole[method](...args)
          
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
          
          this.addLog(type, message)
        }
        console[method] = this.logInterceptors[method]
      }

      intercept('log', 'log')
      intercept('error', 'error')
      intercept('warn', 'warn')
      intercept('debug', 'debug')
      intercept('info', 'info')
    },
    restoreConsole () {
      // Restore original console methods
      Object.keys(this.originalConsole).forEach(method => {
        if (this.originalConsole[method]) {
          console[method] = this.originalConsole[method]
        }
      })
    },
    async testSound () {
      this.testingSound = true
      this.addLog('info', 'Testing sound playback...')
      
      try {
        // Unload existing audio first to avoid "AssetId already exists" error
        try {
          await NativeAudio.unload({
            assetId: 'send-success'
          })
          this.addLog('debug', 'Unloaded existing audio asset')
        } catch (unloadError) {
          // Ignore errors if asset doesn't exist yet
          this.addLog('debug', 'No existing audio asset to unload')
        }

        // Try to preload audio first
        // For iOS, Native Audio plugin looks for files in the main bundle, not www
        // We need to try different approaches, but be careful to avoid crashes
        let paths = []
        if (this.$q.platform.is.ios) {
          // Try safer path formats for iOS - avoid invalid URLs that could crash
          // Only try paths that are likely to work or fail gracefully
          paths = [
            // Try relative paths first (safer)
            'assets/sounds/send-success.mp3',
            'send-success.mp3',
            // Try Capacitor file URLs (if available)
            ...(typeof Capacitor !== 'undefined' && Capacitor.convertFileSrc ? [
              Capacitor.convertFileSrc('assets/sounds/send-success.mp3'),
              Capacitor.convertFileSrc('/assets/sounds/send-success.mp3')
            ] : [])
          ]
        } else {
          paths = ['send-success.mp3']
        }

        let preloaded = false
        let lastError = null
        
        for (const path of paths) {
          // Skip empty or invalid paths
          if (!path || typeof path !== 'string' || path.trim() === '') {
            this.addLog('warn', `Skipping invalid path: ${path}`)
            continue
          }
          
          try {
            // Determine if this is a URL
            const isUrl = path.startsWith('http') || path.startsWith('https') || 
                        path.startsWith('capacitor') || path.startsWith('file://')
            
            this.addLog('debug', `Trying to preload sound with path: ${path} (isUrl: ${isUrl})`)
            
            // Add timeout to prevent hanging
            const preloadPromise = NativeAudio.preload({
              assetId: 'send-success',
              assetPath: path,
              audioChannelNum: 1,
              volume: 1.0,
              isUrl: isUrl
            })
            
            // Add timeout protection (5 seconds)
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Preload timeout')), 5000)
            })
            
            await Promise.race([preloadPromise, timeoutPromise])
            
            this.addLog('success', `Sound preloaded successfully with path: ${path}`)
            preloaded = true
            break
          } catch (error) {
            lastError = error
            const errorMsg = error?.message || String(error) || 'Unknown error'
            // Don't log full error details if it's a crash-prone scenario
            if (errorMsg.includes('Index out of range') || errorMsg.includes('crash')) {
              this.addLog('error', `Path ${path} caused a plugin error - skipping`)
            } else {
              this.addLog('warn', `Failed to preload with path ${path}: ${errorMsg}`)
            }
          }
        }

        if (!preloaded) {
          const errorMsg = lastError?.message || 'Unknown error'
          throw new Error(`Failed to preload audio with any path. Last error: ${errorMsg}`)
        }

        // Play the sound
        this.addLog('info', 'Playing sound...')
        try {
          await NativeAudio.play({
            assetId: 'send-success'
          })
          this.addLog('success', 'Sound played successfully!')
        } catch (playError) {
          this.addLog('error', `Failed to play sound: ${playError?.message || playError}`)
          throw playError
        }
      } catch (error) {
        const errorMsg = error?.message || String(error) || 'Unknown error'
        this.addLog('error', `Sound test failed: ${errorMsg}`)
        
        // If it's a crash-related error, provide helpful message
        if (errorMsg.includes('Index out of range') || errorMsg.includes('crash')) {
          this.addLog('error', 'The audio plugin encountered an internal error. This may be due to missing audio files in the iOS bundle.')
        }
      } finally {
        this.testingSound = false
      }
    },
    async hideDebugApp () {
      this.$q.dialog({
        class: `text-bow ${this.getDarkModeClass(this.darkMode)}`,
        title: this.$t('HideDebugApp'),
        message: this.$t('AreYouSureYouWantToHideTheDebugApp'),
        cancel: true,
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
      
      // Clear logs to free memory first (before restoring console)
      const logsCount = this.logs.length
      this.logs = []
      
      // Restore original console methods (stop intercepting)
      this.restoreConsole()
      
      // Unload audio assets
      try {
        await NativeAudio.unload({
          assetId: 'send-success'
        })
      } catch (error) {
        // Ignore errors
      }
      
      // Clear any timers or intervals if we had any
      // (Currently we don't have any, but this is a good place for future cleanup)
      
      // Use original console for final cleanup message
      if (this.originalConsole.log) {
        this.originalConsole.log(`[Debug] Cleanup complete. Freed ${logsCount} log entries from memory.`)
      }
    }
  },
  mounted () {
    this.addLog('info', 'Debug app initialized')
    this.addLog('info', `Platform: ${this.$q.platform.is.ios ? 'iOS' : this.$q.platform.is.android ? 'Android' : 'Web'}`)
    this.interceptConsole()
  },
  async beforeUnmount () {
    // Clean up when component is destroyed
    await this.cleanup()
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

.debug-content {
  margin-top: 20px;
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
}

.terminal-container.dark .terminal-header {
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.terminal-title {
  font-weight: bold;
  color: #fff;
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
</style>


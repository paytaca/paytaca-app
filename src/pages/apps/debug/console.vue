<template>
  <div id="app-container" class="debug-page sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('Console', {}, 'Console')"
      backnavpath="/apps/debug"
      class="header-nav q-px-sm apps-header"
    />

    <div class="q-pa-md q-mt-sm">
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
    </div>
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

// Module-level log storage - persists across component mounts/unmounts
const persistentLogs = []
let isIntercepting = false
let originalConsoleMethods = {}
let logInterceptors = {}
let currentComponentInstance = null
let isInitializing = false

export default {
  name: 'DebugConsole',
  components: {
    headerNav
  },
  data () {
    return {
      logs: [],
      logLevelFilter: ['log', 'error']
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    logLevelOptions () {
      return [
        { label: 'Log', value: 'log' },
        { label: 'Error', value: 'error' },
        { label: 'Warn', value: 'warn' },
        { label: 'Debug', value: 'debug' },
        { label: 'Info', value: 'info' }
      ]
    },
    filteredLogs () {
      if (!this.logLevelFilter || this.logLevelFilter.length === 0) {
        return []
      }
      return this.logs.filter(log => this.logLevelFilter.includes(log.type))
    }
  },
  methods: {
    getDarkModeClass,
    addLog (type, message) {
      // Prevent recursive updates during initialization
      if (isInitializing) {
        return
      }
      
      const time = new Date().toLocaleTimeString()
      const logEntry = {
        type,
        message: String(message),
        time
      }
      
      persistentLogs.push(logEntry)
      
      if (persistentLogs.length > 1000) {
        persistentLogs.shift()
      }
      
      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(() => {
        if (!isInitializing && this.logs) {
          this.logs = [...persistentLogs]
          
          // Scroll after logs are updated
          requestAnimationFrame(() => {
            const terminalBody = this.$refs.terminalBody
            if (terminalBody) {
              terminalBody.scrollTop = terminalBody.scrollHeight
            }
          })
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
      const logText = this.filteredLogs.map(log => {
        return `[${log.time}] ${log.type.toUpperCase()}: ${log.message}`
      }).join('\n')
      
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
      currentComponentInstance = this
      
      if (isIntercepting) {
        if (currentComponentInstance && currentComponentInstance.logs) {
          currentComponentInstance.logs = [...persistentLogs]
        }
        return
      }
      
      if (Object.keys(originalConsoleMethods).length === 0) {
        originalConsoleMethods = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          debug: console.debug,
          info: console.info
        }
      }

      const intercept = (method, type) => {
        logInterceptors[method] = (...args) => {
          originalConsoleMethods[method](...args)
          
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
          
          const time = new Date().toLocaleTimeString()
          const logEntry = {
            type,
            message: String(message),
            time
          }
          
          persistentLogs.push(logEntry)
          
          if (persistentLogs.length > 1000) {
            persistentLogs.shift()
          }
          
          if (currentComponentInstance && currentComponentInstance.logs && !isInitializing) {
            // Use requestAnimationFrame to batch updates and prevent recursion
            requestAnimationFrame(() => {
              if (currentComponentInstance && currentComponentInstance.logs && !isInitializing) {
                currentComponentInstance.logs = [...persistentLogs]
                
                // Scroll after logs are updated
                requestAnimationFrame(() => {
                  if (currentComponentInstance && currentComponentInstance.$refs) {
                    const terminalBody = currentComponentInstance.$refs.terminalBody
                    if (terminalBody) {
                      terminalBody.scrollTop = terminalBody.scrollHeight
                    }
                  }
                })
              }
            })
          }
        }
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
      Object.keys(originalConsoleMethods).forEach(method => {
        if (originalConsoleMethods[method]) {
          console[method] = originalConsoleMethods[method]
        }
      })
      
      logInterceptors = {}
      isIntercepting = false
      currentComponentInstance = null
    }
  },
  mounted () {
    // Initialize logs immediately
    this.logs = [...persistentLogs]
    
    let interceptorsWereInactive = false
    if (isIntercepting) {
      interceptorsWereInactive = ['log', 'error', 'warn', 'debug', 'info'].some(method => {
        return logInterceptors[method] && console[method] !== logInterceptors[method]
      })
    }
    
    // Set initialization flag before intercepting
    isInitializing = true
    this.interceptConsole()
    
    // Clear flag and sync logs after a short delay
    setTimeout(() => {
      isInitializing = false
      
      // Sync logs once after initialization
      if (this.logs.length !== persistentLogs.length) {
        this.logs = [...persistentLogs]
      }
      
      // Add initialization messages using original console to avoid loops
      if (persistentLogs.length === 0) {
        const originalInfo = originalConsoleMethods.info || console.info
        originalInfo('Debug console initialized')
        originalInfo(`Platform: ${this.$q.platform.is.ios ? 'iOS' : this.$q.platform.is.android ? 'Android' : 'Web'}`)
      } else {
        const originalInfo = originalConsoleMethods.info || console.info
        originalInfo('Debug console resumed - logs continue from previous session')
        if (interceptorsWereInactive) {
          const originalWarn = originalConsoleMethods.warn || console.warn
          originalWarn('Console interceptors were inactive - they have been restored')
        }
      }
    }, 100)
  },
  beforeUnmount () {
    if (currentComponentInstance === this) {
      currentComponentInstance = null
    }
  }
}
</script>

<style scoped lang="scss">
.debug-page {
  min-height: 100vh;
  background-color: #ECF3F3;
}

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

.debug-page.dark {
  background-color: #273746;
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


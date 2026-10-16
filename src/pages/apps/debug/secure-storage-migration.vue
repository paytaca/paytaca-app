<template>
  <div id="app-container" class="debug-page sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('SecureStorageMigration', {}, 'Secure Storage Migration')"
      backnavpath="/apps/debug"
      class="header-nav q-px-sm apps-header"
    >
      <template #top-right-menu>
        <q-btn
          flat
          round
          icon="refresh"
          :loading="loading"
          @click="refresh"
          class="q-mr-sm"
        >
          <q-tooltip>{{ $t('Refresh', {}, 'Refresh') }}</q-tooltip>
        </q-btn>
      </template>
    </header-nav>

    <div class="q-pa-md q-mt-sm">
      <!-- Status -->
      <q-card class="debug-card q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium q-mb-sm">
            {{ $t('MigrationStatus', {}, 'Migration Status') }}
          </div>

          <div class="row items-center q-gutter-sm q-mb-xs">
            <q-icon
              :name="flagStateIcon"
              :color="flagStateColor"
              size="20px"
            />
            <span class="text-body2">
              {{ $t('MigrationFlag', {}, 'Migration flag') }}
              (<code>secure_storage_native_migrated</code>):
            </span>
            <q-badge :color="flagStateColor">
              {{ flagStateLabel }}
            </q-badge>
          </div>

          <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
            {{ $t('Platform', {}, 'Platform') }}: <code>{{ platform }}</code>
            &middot; {{ $t('LegacyKeys', {}, 'Legacy keys') }}: {{ oldEntries.length }}
            &middot; {{ $t('NativeKeys', {}, 'Native keys') }}: {{ nativeEntries.length }}
          </div>
        </q-card-section>
      </q-card>

      <!-- Legacy localStorage -->
      <q-card class="debug-card q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-weight-medium">
              {{ $t('LegacyLocalStorage', {}, 'Legacy localStorage') }}
              <span class="text-caption">(cap_sec_*)</span>
            </div>
            <q-badge :color="oldEntries.length ? 'warning' : 'grey'">{{ oldEntries.length }}</q-badge>
          </div>

          <q-banner
            v-if="!isNativePlatform"
            dense
            rounded
            class="bg-warning text-black q-mb-sm"
          >
            {{ $t('LiveStorageWarning', {}, 'On web/BEX these cap_sec_* localStorage entries ARE the live secure storage backend — not disposable legacy leftovers. Clearing them would make the wallet unreadable. Clearing is disabled here.') }}
          </q-banner>

          <div v-if="!oldEntries.length" class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
            {{ $t('NoLegacyEntries', {}, 'No legacy secure storage entries found in localStorage.') }}
          </div>

          <div v-else class="q-gutter-sm">
            <div
              v-for="entry in oldEntries"
              :key="'old-' + entry.key"
              class="storage-entry"
              :class="darkMode ? 'storage-entry-dark' : 'storage-entry-light'"
            >
              <div class="row items-center justify-between">
                <div class="entry-key">{{ entry.key }}</div>
                <div class="row items-center q-gutter-xs">
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    :icon="entry.revealed ? 'visibility_off' : 'visibility'"
                    @click="entry.revealed = !entry.revealed"
                  >
                    <q-tooltip>{{ entry.revealed ? $t('Hide', {}, 'Hide') : $t('Reveal', {}, 'Reveal') }}</q-tooltip>
                  </q-btn>
                  <q-badge :color="entry.encoded ? 'deep-purple' : 'orange'">
                    {{ entry.encoded ? $t('Encrypted', {}, 'enc:v1') : $t('Plaintext', {}, 'plaintext') }}
                  </q-badge>
                </div>
              </div>
              <div class="entry-value">
                <div class="entry-value-label">{{ $t('Raw', {}, 'Raw') }}</div>
                <pre v-if="entry.revealed" class="entry-value-pre">{{ entry.raw }}</pre>
                <div v-else class="entry-value-masked">{{ $t('HiddenTapReveal', {}, '•••••• hidden — tap reveal') }}</div>
              </div>
              <div v-if="entry.decoded !== null" class="entry-value">
                <div class="entry-value-label">{{ $t('Decoded', {}, 'Decoded') }}</div>
                <pre v-if="entry.revealed" class="entry-value-pre">{{ entry.decoded }}</pre>
                <div v-else class="entry-value-masked">{{ $t('HiddenTapReveal', {}, '•••••• hidden — tap reveal') }}</div>
              </div>
            </div>
          </div>

          <div class="q-mt-md">
            <q-btn
              color="negative"
              icon="delete_forever"
              :label="$t('ClearLegacyStorage', {}, 'Clear legacy storage')"
              :loading="clearingOld"
              :disable="!oldEntries.length || !isNativePlatform"
              class="full-width"
              @click="confirmClearOld"
            />
            <div
              v-if="!isNativePlatform"
              class="text-caption q-mt-xs"
              :class="darkMode ? 'text-grey-6' : 'text-grey-7'"
            >
              {{ $t('ClearLegacyStorageWebDisabled', {}, 'Disabled on web/BEX: cap_sec_* is the live secure storage backend here.') }}
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Native secure storage -->
      <q-card class="debug-card q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-weight-medium">
              {{ $t('NativeSecureStorage', {}, 'Native secure storage') }}
            </div>
            <q-badge :color="nativeEntries.length ? 'positive' : 'grey'">{{ nativeEntries.length }}</q-badge>
          </div>

          <q-banner
            v-if="!isNativePlatform"
            dense
            rounded
            class="bg-info text-white q-mb-sm"
          >
            {{ $t('NativeWebNotice', {}, 'On web/BEX this list is backed by the same localStorage entries shown above.') }}
          </q-banner>

          <q-banner
            v-if="nativeError"
            dense
            rounded
            class="bg-negative text-white q-mb-sm"
          >
            {{ nativeError }}
          </q-banner>

          <div v-if="!nativeEntries.length && !nativeError" class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
            {{ $t('NoNativeEntries', {}, 'No entries found in native secure storage.') }}
          </div>

          <div v-else class="q-gutter-sm">
            <div
              v-for="entry in nativeEntries"
              :key="'native-' + entry.key"
              class="storage-entry"
              :class="darkMode ? 'storage-entry-dark' : 'storage-entry-light'"
            >
              <div class="row items-center justify-between">
                <div class="entry-key">{{ entry.key }}</div>
                <div class="row items-center q-gutter-xs">
                  <q-btn
                    v-if="!entry.unreadable"
                    flat
                    dense
                    round
                    size="sm"
                    :icon="entry.revealed ? 'visibility_off' : 'visibility'"
                    @click="entry.revealed = !entry.revealed"
                  >
                    <q-tooltip>{{ entry.revealed ? $t('Hide', {}, 'Hide') : $t('Reveal', {}, 'Reveal') }}</q-tooltip>
                  </q-btn>
                  <q-badge :color="entry.unreadable ? 'negative' : 'positive'">
                    {{ entry.unreadable ? $t('Unreadable', {}, 'unreadable') : $t('Ok', {}, 'ok') }}
                  </q-badge>
                </div>
              </div>
              <div class="entry-value">
                <div class="entry-value-label">{{ $t('Value', {}, 'Value') }}</div>
                <template v-if="entry.unreadable">
                  <pre class="entry-value-pre">—</pre>
                </template>
                <template v-else>
                  <pre v-if="entry.revealed" class="entry-value-pre">{{ entry.value }}</pre>
                  <div v-else class="entry-value-masked">{{ $t('HiddenTapReveal', {}, '•••••• hidden — tap reveal') }}</div>
                </template>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Capacitor } from '@capacitor/core'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { LEGACY_PREFIX, ENC_PREFIX, MIGRATION_FLAG_KEY, isNativeMigrationPlatform } from 'src/wallet/secure-storage-migration'

export default {
  name: 'SecureStorageMigration',
  components: {
    headerNav
  },
  data () {
    return {
      loading: false,
      clearingOld: false,
      platform: 'unknown',
      migrationFlagState: 'not-set',
      oldEntries: [],
      nativeEntries: [],
      nativeError: ''
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isNativePlatform () {
      return isNativeMigrationPlatform(this.platform)
    },
    flagStateLabel () {
      if (this.migrationFlagState === 'set') return this.$t('Set', {}, 'Set')
      if (this.migrationFlagState === 'unreadable') return this.$t('Unreadable', {}, 'Unreadable')
      return this.$t('NotSet', {}, 'Not set')
    },
    flagStateColor () {
      if (this.migrationFlagState === 'set') return 'positive'
      if (this.migrationFlagState === 'unreadable') return 'negative'
      return 'warning'
    },
    flagStateIcon () {
      if (this.migrationFlagState === 'set') return 'check_circle'
      if (this.migrationFlagState === 'unreadable') return 'error'
      return 'warning'
    }
  },
  mounted () {
    this.refresh()
  },
  methods: {
    getDarkModeClass,
    async refresh () {
      this.loading = true
      try {
        this.platform = Capacitor.getPlatform()
        const flag = await this.readNativeValue(MIGRATION_FLAG_KEY)
        if (flag.error) {
          this.migrationFlagState = 'unreadable'
        } else {
          this.migrationFlagState = flag.value === 'true' ? 'set' : 'not-set'
        }
        this.oldEntries = this.listLegacyEntries()
        await this.loadNativeEntries()
      } finally {
        this.loading = false
      }
    },
    listLegacyEntries () {
      const entries = []
      for (let i = 0; i < localStorage.length; i++) {
        const full = localStorage.key(i)
        if (!full || !full.startsWith(LEGACY_PREFIX)) continue
        const raw = localStorage.getItem(full)
        const encoded = typeof raw === 'string' && raw.startsWith(ENC_PREFIX)
        let decoded = null
        if (typeof raw === 'string' && !encoded) {
          try {
            decoded = atob(raw)
          } catch {
            decoded = null
          }
        }
        entries.push({
          key: full.slice(LEGACY_PREFIX.length),
          raw,
          encoded,
          decoded,
          revealed: false
        })
      }
      entries.sort((a, b) => a.key.localeCompare(b.key))
      return entries
    },
    async loadNativeEntries () {
      this.nativeError = ''
      let keys = []
      try {
        const result = await SecureStoragePlugin.keys()
        keys = (result && result.value) || []
      } catch (err) {
        this.nativeError = this.$t('NativeKeysError', {}, 'Could not list native secure storage keys') + ': ' + this.describeError(err)
        this.nativeEntries = []
        return
      }

      const entries = []
      for (const key of keys) {
        const read = await this.readNativeValue(key)
        entries.push({
          key,
          value: read.value,
          unreadable: read.error !== null || read.value === null,
          revealed: false
        })
      }
      entries.sort((a, b) => a.key.localeCompare(b.key))
      this.nativeEntries = entries
    },
    async readNativeValue (key) {
      try {
        const result = await SecureStoragePlugin.get({ key })
        return { value: result && result.value !== undefined ? result.value : null, error: null }
      } catch (err) {
        return { value: null, error: err }
      }
    },
    confirmClearOld () {
      if (!this.isNativePlatform) return
      this.$q.dialog({
        class: `text-bow ${this.getDarkModeClass(this.darkMode)}`,
        title: this.$t('ClearLegacyStorage', {}, 'Clear legacy storage'),
        message: this.$t(
          'ClearLegacyStorageConfirm',
          { count: this.oldEntries.length },
          `This permanently removes ${this.oldEntries.length} legacy cap_sec_* entr${this.oldEntries.length === 1 ? 'y' : 'ies'} from localStorage. This cannot be undone. Make sure the values are safely present in native secure storage before continuing.`
        ),
        cancel: {
          label: this.$t('Cancel', {}, 'Cancel'),
          flat: true,
          color: this.darkMode ? 'grey-6' : 'grey-8'
        },
        ok: {
          label: this.$t('Clear', {}, 'Clear'),
          color: 'negative'
        },
        persistent: true
      }).onOk(() => {
        this.clearLegacyStorage()
      })
    },
    async clearLegacyStorage () {
      if (!this.isNativePlatform) return
      this.clearingOld = true
      try {
        const toRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const full = localStorage.key(i)
          if (full && full.startsWith(LEGACY_PREFIX)) toRemove.push(full)
        }
        for (const full of toRemove) localStorage.removeItem(full)

        this.oldEntries = this.listLegacyEntries()
        this.$q.notify({
          type: 'positive',
          message: this.$t('LegacyStorageCleared', { count: toRemove.length }, `Cleared ${toRemove.length} legacy storage entr${toRemove.length === 1 ? 'y' : 'ies'}`),
          timeout: 3000
        })
      } catch (err) {
        this.$q.notify({
          type: 'error',
          message: this.$t('LegacyStorageClearFailed', {}, 'Failed to clear legacy storage') + ': ' + this.describeError(err),
          timeout: 5000
        })
      } finally {
        this.clearingOld = false
      }
    },
    describeError (err) {
      return err?.message || String(err)
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

.storage-entry {
  border-radius: 6px;
  padding: 8px 10px;
}

.storage-entry-dark {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.storage-entry-light {
  background: #f5f7f8;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.entry-key {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  word-break: break-all;
}

.entry-value {
  margin-top: 6px;
}

.entry-value-label {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 2px;
}

.entry-value-pre {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow: auto;
}

.entry-value-masked {
  font-family: monospace;
  font-size: 12px;
  letter-spacing: 1px;
  opacity: 0.5;
}
</style>

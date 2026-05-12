<template>
  <div class="static-container">
    <div
      id="app-container"
      class="sticky-header-container text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <header-nav
        class="apps-header"
        backnavpath="/apps/chat"
        :title="$t('Profile', {}, 'Profile')"
      />

      <div class="profile-body">
        <!-- Identity Card -->
        <div
          class="identity-card"
          :class="getDarkModeClass(darkMode)"
          :style="{ background: `linear-gradient(135deg, ${themeColor}14, ${themeColor}0a)` }"
        >
          <q-avatar
            size="64px"
            class="identity-avatar"
            :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }"
          >
            <q-icon name="account_circle" size="56px" />
          </q-avatar>
          <div class="identity-info">
            <div class="identity-name">{{ profileDisplayName || 'No display name' }}</div>
            <div class="identity-npub" @click="copyNpub">
              <span class="npub-text">{{ displayNpub }}</span>
              <q-icon name="content_copy" size="14px" class="copy-icon" />
            </div>
          </div>
        </div>

        <!-- Settings Sections -->
        <div class="settings-section q-mt-lg">
          
          <!-- Display Name Row -->
          <div class="setting-row">
            <div class="setting-content">
              <div class="setting-label">{{ $t('DisplayName', {}, 'Display Name') }}</div>
              <div v-if="!editingDisplayName" class="setting-value">
                {{ profileDisplayName || $t('NotSet', {}, 'Not set') }}
              </div>
              <q-input
                v-else
                v-model="editDisplayNameValue"
                outlined
                dense
                :placeholder="$t('DisplayNamePlaceholder', {}, 'e.g. Alice')"
                :error="displayNameError"
                :error-message="displayNameErrorMessage"
                class="setting-input"
                @update:model-value="validateDisplayName"
              />
            </div>
            <div class="setting-actions">
              <template v-if="!editingDisplayName">
                <q-btn
                  v-if="profileDisplayName"
                  flat
                  dense
                  round
                  icon="delete"
                  color="grey-6"
                  @click="removeDisplayName"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="edit"
                  color="primary"
                  @click="startEditDisplayName"
                />
              </template>
              <template v-else>
                <q-btn
                  flat
                  dense
                  round
                  icon="clear"
                  color="grey-6"
                  @click="cancelEditDisplayName"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="check"
                  color="positive"
                  :disable="!displayNameValid"
                  @click="publishDisplayName"
                />
              </template>
            </div>
          </div>

          <q-separator :color="darkMode ? 'white-10' : 'black-5'" />

          <!-- BCH Address Row -->
          <div class="setting-row">
            <div class="setting-content">
              <div class="setting-label">{{ $t('BCHAddress', {}, 'BCH Address') }}</div>
              <div v-if="!editingAddress" class="setting-value">
                {{ profileAddress ? profileAddress.slice(0, 12) + '...' + profileAddress.slice(-8) : $t('NotSet', {}, 'Not set') }}
              </div>
              <q-input
                v-else
                v-model="editAddressValue"
                outlined
                dense
                placeholder="bitcoincash:qz..."
                :error="addressError"
                :error-message="addressErrorMessage"
                class="setting-input"
                @update:model-value="validateInput"
              >
                <template #hint>
                  <div v-if="addressGeneratedFromWallet" class="address-hint">
                    <q-icon name="info" size="14px" />
                    <span>This is a fresh address generated from your wallet</span>
                  </div>
                </template>
              </q-input>
            </div>
            <div class="setting-actions">
              <template v-if="!editingAddress">
                <q-btn
                  v-if="profileAddress"
                  flat
                  dense
                  round
                  icon="content_copy"
                  color="grey-6"
                  @click="copyAddress"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="edit"
                  color="primary"
                  @click="startEditAddress"
                />
              </template>
              <template v-else>
                <q-btn
                  flat
                  dense
                  round
                  icon="refresh"
                  color="primary"
                  :loading="generatingAddress"
                  @click="generateNewAddress"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="clear"
                  color="grey-6"
                  @click="cancelEdit"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="check"
                  color="positive"
                  :disable="!addressValid"
                  @click="publishAddress"
                />
              </template>
            </div>
          </div>

        </div>

        <!-- Cache Management -->
        <div class="danger-section q-mt-lg">
          <div class="section-label">
            {{ $t('ChatCache', {}, 'Chat Cache') }}
          </div>
          <div class="section-description">
            {{ $t('ChatCacheDescription', {}, 'Cached images are stored to improve loading speed. Clear cache to free up storage space.') }}
          </div>
          <q-btn
            :label="$t('ClearChatCache', {}, 'Clear Chat Cache')"
            color="negative"
            outline
            rounded
            class="full-width"
            :loading="clearingCache"
            @click="confirmClearCache"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import { validateAddress } from 'src/utils/send-page-utils'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { cachedLoadWallet } from 'src/wallet'
import { npubEncode } from 'nostr-tools/nip19'
import { clearChatCache } from 'src/components/chat/MessageBubble.vue'
import { copyToClipboard } from 'quasar'

export default {
  name: 'ChatProfile',
  components: { HeaderNav },
  data () {
    return {
      editingAddress: false,
      editAddressValue: '',
      addressValid: false,
      addressError: false,
      addressErrorMessage: '',
      publishing: false,
      removing: false,
      editingDisplayName: false,
      editDisplayNameValue: '',
      displayNameValid: false,
      displayNameError: false,
      displayNameErrorMessage: '',
      publishingDisplayName: false,
      removingDisplayName: false,
      clearingCache: false,
      addressGeneratedFromWallet: false,
      generatingAddress: false,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    myNpub () {
      return this.$store.getters['nostrChat/myNpub']
    },
    myPubKeyHex () {
      return this.$store.getters['nostrChat/myPubKey']
    },
    displayNpub () {
      const npub = this.myNpub
      if (!npub) return ''
      return npub.slice(0, 12) + '...' + npub.slice(-8)
    },
    profileAddress () {
      return this.$store.state.nostrChat.profile?.bchAddress || null
    },
    profileDisplayName () {
      return this.$store.state.nostrChat.profile?.displayName || null
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
  },
  methods: {
    getDarkModeClass,
    copyNpub () {
      if (!this.myNpub) return
      copyToClipboard(this.myNpub)
      this.$q.notify({
        type: 'positive',
        message: this.$t('Copied', {}, 'Copied to clipboard'),
        timeout: 1500,
      })
    },
    copyAddress () {
      if (!this.profileAddress) return
      copyToClipboard(this.profileAddress)
      this.$q.notify({
        type: 'positive',
        message: this.$t('Copied', {}, 'Copied to clipboard'),
        timeout: 1500,
      })
    },
    async startEditAddress () {
      this.editingAddress = true
      this.addressGeneratedFromWallet = false
      // Pre-fill with currently published address if available
      if (this.profileAddress) {
        this.editAddressValue = this.profileAddress
        this.validateInput()
        return
      }
      // Otherwise fetch the next receiving address from the wallet (lastIndex + 1)
      try {
        // First sync last address index from watchtower
        await this.$store.dispatch('global/loadWalletLastAddressIndex')
        
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const wallet = await cachedLoadWallet('BCH', walletIndex)
        const bchWallet = getWalletByNetwork(wallet, 'bch')
        if (bchWallet?.getAddressSetAt) {
          const lastAddressIndex = this.$store.getters['global/getLastAddressIndex']('bch')
          const addressIndex = typeof lastAddressIndex === 'number' && lastAddressIndex >= 0
            ? lastAddressIndex + 1
            : 0
          const addressSet = await bchWallet.getAddressSetAt(addressIndex)
          if (addressSet?.receiving) {
            this.editAddressValue = addressSet.receiving
            this.addressGeneratedFromWallet = true
            this.validateInput()
            return
          }
        }
      } catch (err) {
        console.warn('[Profile] Failed to load wallet address:', err)
      }
      this.editAddressValue = ''
      this.validateInput()
    },
    async generateNewAddress () {
      this.generatingAddress = true
      try {
        // Sync last address index from watchtower
        await this.$store.dispatch('global/loadWalletLastAddressIndex')
        
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const wallet = await cachedLoadWallet('BCH', walletIndex)
        const bchWallet = getWalletByNetwork(wallet, 'bch')
        if (bchWallet?.getAddressSetAt) {
          const lastAddressIndex = this.$store.getters['global/getLastAddressIndex']('bch')
          const addressIndex = typeof lastAddressIndex === 'number' && lastAddressIndex >= 0
            ? lastAddressIndex + 1
            : 0
          const addressSet = await bchWallet.getAddressSetAt(addressIndex)
          if (addressSet?.receiving) {
            this.editAddressValue = addressSet.receiving
            this.addressGeneratedFromWallet = true
            this.validateInput()
            this.$q.notify({
              type: 'positive',
              message: this.$t('NewAddressGenerated', {}, 'New address generated'),
              timeout: 1500,
            })
            return
          }
        }
        throw new Error('Failed to generate address')
      } catch (err) {
        console.warn('[Profile] Failed to generate new address:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || this.$t('GenerateAddressFailed', {}, 'Failed to generate new address'),
        })
      } finally {
        this.generatingAddress = false
      }
    },
    cancelEdit () {
      this.editingAddress = false
      this.editAddressValue = ''
      this.addressError = false
      this.addressValid = false
      this.addressGeneratedFromWallet = false
      this.generatingAddress = false
    },
    validateInput () {
      if (!this.editAddressValue) {
        this.addressValid = false
        this.addressError = false
        return
      }
      const result = validateAddress(this.editAddressValue, 'bch', false)
      this.addressValid = result.valid
      this.addressError = !result.valid
      this.addressErrorMessage = result.valid ? '' : this.$t('InvalidAddress', {}, 'Invalid BCH address')
    },
    async publishAddress () {
      if (!this.addressValid) return
      this.publishing = true
      try {
        await this.$store.dispatch('nostrChat/publishBchAddress', {
          address: this.editAddressValue.trim(),
        })
        this.$q.notify({
          type: 'positive',
          message: this.$t('AddressPublished', {}, 'BCH address published successfully'),
        })
        this.editingAddress = false
      } catch (err) {
        console.error('[Profile] Failed to publish BCH address:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || this.$t('PublishFailed', {}, 'Failed to publish address'),
        })
      } finally {
        this.publishing = false
      }
    },
    async removeAddress () {
      this.removing = true
      try {
        await this.$store.dispatch('nostrChat/removeBchAddress')
        this.$q.notify({
          type: 'positive',
          message: this.$t('AddressRemoved', {}, 'BCH address removed'),
        })
        this.editingAddress = false
      } catch (err) {
        console.error('[Profile] Failed to remove BCH address:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || this.$t('RemoveFailed', {}, 'Failed to remove address'),
        })
      } finally {
        this.removing = false
      }
    },
    startEditDisplayName () {
      this.editingDisplayName = true
      this.editDisplayNameValue = this.profileDisplayName || ''
      this.validateDisplayName()
    },
    cancelEditDisplayName () {
      this.editingDisplayName = false
      this.editDisplayNameValue = ''
      this.displayNameError = false
      this.displayNameValid = false
    },
    validateDisplayName () {
      const val = this.editDisplayNameValue.trim()
      if (!val) {
        this.displayNameValid = false
        this.displayNameError = false
        this.displayNameErrorMessage = ''
        return
      }
      if (val.length > 50) {
        this.displayNameValid = false
        this.displayNameError = true
        this.displayNameErrorMessage = this.$t('DisplayNameTooLong', {}, 'Display name must be 50 characters or fewer')
        return
      }
      this.displayNameValid = true
      this.displayNameError = false
      this.displayNameErrorMessage = ''
    },
    async publishDisplayName () {
      if (!this.displayNameValid) return
      this.publishingDisplayName = true
      try {
        await this.$store.dispatch('nostrChat/publishDisplayName', {
          displayName: this.editDisplayNameValue.trim(),
        })
        this.$q.notify({
          type: 'positive',
          message: this.$t('DisplayNamePublished', {}, 'Display name published successfully'),
        })
        this.editingDisplayName = false
      } catch (err) {
        console.error('[Profile] Failed to publish display name:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || this.$t('PublishFailed', {}, 'Failed to publish display name'),
        })
      } finally {
        this.publishingDisplayName = false
      }
    },
    async removeDisplayName () {
      this.$q.dialog({
        title: this.$t('RemoveDisplayName', {}, 'Remove Display Name'),
        message: this.$t('RemoveDisplayNameConfirm', {}, 'Remove your published display name? Others will no longer see it when adding you as a contact.'),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Remove', {}, 'Remove'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        this.removingDisplayName = true
        try {
          await this.$store.dispatch('nostrChat/removeDisplayName')
          this.$q.notify({
            type: 'positive',
            message: this.$t('DisplayNameRemoved', {}, 'Display name removed'),
          })
          this.editingDisplayName = false
        } catch (err) {
          console.error('[Profile] Failed to remove display name:', err)
          this.$q.notify({
            type: 'negative',
            message: err.message || this.$t('RemoveFailed', {}, 'Failed to remove display name'),
          })
        } finally {
          this.removingDisplayName = false
        }
      })
    },
    async confirmClearCache () {
      this.$q.dialog({
        title: this.$t('ClearChatCache', {}, 'Clear Chat Cache'),
        message: this.$t('ClearChatCacheConfirm', {}, 'Clear all cached chat images? This will speed up initial loading but images will need to be re-downloaded.'),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Clear', {}, 'Clear'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        this.clearingCache = true
        try {
          const success = await clearChatCache()
          if (success) {
            this.$q.notify({
              type: 'positive',
              message: this.$t('ChatCacheCleared', {}, 'Chat cache cleared successfully'),
            })
          } else {
            throw new Error('Failed to clear cache')
          }
        } catch (err) {
          this.$q.notify({
            type: 'negative',
            message: err.message || this.$t('ClearCacheFailed', {}, 'Failed to clear cache'),
          })
        } finally {
          this.clearingCache = false
        }
      })
    },
  },
}
</script>

<style scoped>
.profile-body {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

/* Identity Card */
.identity-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
}

.identity-avatar {
  color: #ffffff;
  flex-shrink: 0;
}

.identity-info {
  flex: 1;
  min-width: 0;
}

.identity-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.identity-npub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.identity-npub:hover {
  background: rgba(0, 0, 0, 0.05);
}

.npub-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #6b7280;
}

.copy-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

/* Settings Section */
.settings-section {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16px;
  padding: 8px 0;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
}

.setting-content {
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.setting-value {
  font-size: 13px;
  color: #6b7280;
  word-break: break-all;
}

.setting-input {
  width: 100%;
  max-width: 280px;
}

.setting-input :deep(.q-field__control) {
  border-radius: 8px;
  background: transparent;
}

.setting-input :deep(.q-field__hint) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.setting-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Danger Section */
.danger-section {
  background: rgba(239, 68, 68, 0.04);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(239, 68, 68, 0.1);
}

.danger-section .section-label {
  font-size: 14px;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 4px;
}

.danger-section .section-description {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
  margin-bottom: 12px;
}

/* Dark mode */
.dark .identity-name {
  color: #e2e8f0;
}

.dark .npub-text {
  color: #94a3b8;
}

.dark .identity-npub:hover {
  background: rgba(255, 255, 255, 0.05);
}

.dark .settings-section {
  background: rgba(255, 255, 255, 0.03);
}

.dark .setting-label {
  color: #e2e8f0;
}

.dark .setting-value {
  color: #94a3b8;
}

.dark .setting-input :deep(.q-field__hint) {
  color: #94a3b8;
}

.dark .danger-section {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.2);
}

.dark .danger-section .section-label {
  color: #f87171;
}
</style>

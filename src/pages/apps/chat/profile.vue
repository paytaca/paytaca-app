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
        <!-- Identity card -->
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
            <div class="identity-label">{{ $t('YourNostrID', {}, 'Your Nostr ID') }}</div>
            <div class="identity-npub" @click="copyNpub">
              <span class="npub-text">{{ displayNpub }}</span>
              <q-icon name="content_copy" size="14px" class="copy-icon" />
            </div>
          </div>
        </div>

        <!-- BCH Address Section -->
        <div class="address-section q-mt-md">
          <div class="section-header-row">
            <div class="section-title">{{ $t('BCHAddress', {}, 'BCH Address') }}</div>
            <q-btn
              v-if="!editingAddress"
              flat
              dense
              round
              icon="edit"
              color="primary"
              @click="startEditAddress"
            />
          </div>

          <div class="section-description">
            {{ $t('BCHAddressDescription', {}, 'Associate a BCH address with your Nostr profile so others can send you BCH directly from chat.') }}
          </div>

          <!-- Published address display -->
          <div v-if="!editingAddress && profileAddress" class="address-display">
            <q-icon name="account_balance_wallet" size="20px" color="positive" />
            <div class="address-text">{{ profileAddress }}</div>
            <q-btn
              flat
              dense
              round
              icon="content_copy"
              size="sm"
              @click="copyAddress"
            />
          </div>

          <!-- No address published -->
          <div v-else-if="!editingAddress && !profileAddress" class="address-empty">
            <q-icon name="info" size="20px" color="grey-5" />
            <span>{{ $t('NoBCHAddress', {}, 'No BCH address published') }}</span>
          </div>

          <!-- Edit form -->
          <div v-if="editingAddress" class="address-edit">
            <q-input
              v-model="editAddressValue"
              outlined
              dense
              :label="$t('BCHAddress', {}, 'BCH Address')"
              placeholder="bitcoincash:qz..."
              :error="addressError"
              :error-message="addressErrorMessage"
              class="address-input"
              @update:model-value="validateInput"
            >
              <template #append>
                <q-btn
                  v-if="editAddressValue"
                  flat
                  dense
                  round
                  icon="clear"
                  size="sm"
                  @click="editAddressValue = ''"
                />
              </template>
            </q-input>

            <div class="edit-actions q-mt-sm">
              <q-btn
                flat
                :label="$t('Cancel', {}, 'Cancel')"
                color="grey"
                @click="cancelEdit"
              />
              <q-btn
                v-if="profileAddress"
                flat
                :label="$t('Remove', {}, 'Remove')"
                color="negative"
                :loading="removing"
                @click="removeAddress"
              />
              <q-btn
                unelevated
                :label="$t('Publish', {}, 'Publish')"
                color="positive"
                :loading="publishing"
                :disable="!addressValid"
                @click="publishAddress"
              />
            </div>
          </div>
        </div>

        <!-- Info box -->
        <div class="info-box q-mt-md">
          <q-icon name="security" size="18px" color="primary" />
          <div class="info-text">
            {{ $t('BCHAddressInfo', {}, 'Your BCH address is signed with your Nostr private key and published as a verifiable event. Anyone can verify that you (the owner of this Nostr identity) published this address.') }}
          </div>
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
      this.$copyToClipboard(this.myNpub)
      this.$q.notify({
        type: 'positive',
        message: this.$t('Copied', {}, 'Copied to clipboard'),
        timeout: 1500,
      })
    },
    copyAddress () {
      if (!this.profileAddress) return
      this.$copyToClipboard(this.profileAddress)
      this.$q.notify({
        type: 'positive',
        message: this.$t('Copied', {}, 'Copied to clipboard'),
        timeout: 1500,
      })
    },
    async startEditAddress () {
      this.editingAddress = true
      // Pre-fill with currently published address if available
      if (this.profileAddress) {
        this.editAddressValue = this.profileAddress
        this.validateInput()
        return
      }
      // Otherwise fetch the latest receiving address from the wallet
      try {
        const walletIndex = this.$store.getters['global/getWalletIndex']
        const wallet = await cachedLoadWallet('BCH', walletIndex)
        const bchWallet = getWalletByNetwork(wallet, 'bch')
        if (bchWallet?.getAddressSetAt) {
          const lastAddressIndex = this.$store.getters['global/getLastAddressIndex']('bch')
          const addressIndex = typeof lastAddressIndex === 'number' && lastAddressIndex >= 0
            ? lastAddressIndex
            : 0
          const addressSet = await bchWallet.getAddressSetAt(addressIndex)
          if (addressSet?.receiving) {
            this.editAddressValue = addressSet.receiving
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
    cancelEdit () {
      this.editingAddress = false
      this.editAddressValue = ''
      this.addressError = false
      this.addressValid = false
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
  },
}
</script>

<style scoped>
.profile-body {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.identity-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border-radius: 16px;
}

.identity-avatar {
  color: #ffffff;
}

.identity-info {
  flex: 1;
  min-width: 0;
}

.identity-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.identity-npub {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 0;
}

.npub-text {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #1f2937;
  word-break: break-all;
}

.copy-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.address-section {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16px;
  padding: 16px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.section-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 12px;
}

.address-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
}

.address-text {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #1f2937;
  word-break: break-all;
}

.address-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  color: #9ca3af;
  font-size: 13px;
}

.address-edit {
  margin-top: 8px;
}

.address-input :deep(.q-field__control) {
  border-radius: 10px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.info-box {
  display: flex;
  gap: 10px;
  padding: 14px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 12px;
  border-left: 3px solid #3b82f6;
}

.info-text {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}

/* Dark mode overrides */
.dark .identity-npub .npub-text {
  color: #e2e8f0;
}

.dark .section-title {
  color: #e2e8f0;
}

.dark .section-description {
  color: #9ca3af;
}

.dark .address-text {
  color: #e2e8f0;
}

.dark .info-text {
  color: #cbd5e1;
}
</style>

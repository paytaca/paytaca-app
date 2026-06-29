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
          <div class="identity-avatar-wrapper" @click="onAvatarClick">
            <q-avatar
              size="64px"
              class="identity-avatar"
              :style="avatarStyle"
            >
              <img v-if="avatarDisplaySrc" :src="avatarDisplaySrc" />
              <q-icon v-else name="account_circle" size="56px" />
            </q-avatar>
            <div class="avatar-overlay" :class="{ 'avatar-overlay--always': !avatarDisplaySrc }">
              <q-icon name="camera_alt" size="20px" />
            </div>
          </div>
          <div class="identity-info">
            <div class="identity-name">{{ profileDisplayName || $t('NoDisplayName') }}</div>
            <div class="identity-npub" @click="copyNpub">
              <span class="npub-text">{{ displayNpub }}</span>
              <q-icon name="content_copy" size="14px" class="copy-icon" />
            </div>
          </div>
          <q-btn
            flat
            round
            dense
            icon="qr_code"
            class="identity-qr-btn"
            :class="getDarkModeClass(darkMode)"
            @click="showQrDialog = true"
          >
            <q-tooltip :delay="500">
              {{ $t('YourChatID', {}, 'Your Chat ID') }}
            </q-tooltip>
          </q-btn>
        </div>

        <!-- Chat ID dialog -->
        <q-dialog v-model="showQrDialog">
          <q-card style="min-width: 300px; border-radius: 16px;" :class="getDarkModeClass(darkMode)">
            <q-card-section class="row items-center justify-between">
              <div class="text-h6">{{ $t('YourChatID', {}, 'Your Chat ID') }}</div>
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
            <q-card-section class="flex flex-center q-pt-none">
              <div class="qr-display-box">
                <qr-code
                  :text="`nostr:${myNpub}`"
                  border-width="3px"
                  border-color="#3b82f6"
                  :size="240"
                />
              </div>
            </q-card-section>
            <q-card-section class="q-pt-none text-center">
              <div class="npub-full-text">{{ myNpub }}</div>
              <q-btn flat dense icon="content_copy" :label="$t('Copy', {}, 'Copy')" color="primary" class="q-mt-sm" @click="copyNpub" />
            </q-card-section>
          </q-card>
        </q-dialog>

        <input
          ref="avatarInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style="display:none"
          @change="onAvatarSelected"
        />

        <q-menu ref="avatarMenu" touch-position no-parent-event class="text-bow" :class="getDarkModeClass(darkMode)">
          <q-list style="min-width: 160px">
            <q-item clickable v-close-popup @click="triggerAvatarUpload">
              <q-item-section avatar>
                <q-icon name="camera_alt" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ $t('ChangePhoto', {}, 'Change Photo') }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="confirmRemoveAvatar">
              <q-item-section avatar>
                <q-icon name="delete" size="20px" color="negative" />
              </q-item-section>
              <q-item-section>
                <span class="text-negative">{{ $t('RemovePhoto', {}, 'Remove Photo') }}</span>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>

        <!-- Avatar Actions -->
        <div v-if="pendingAvatar || avatarError" class="avatar-actions q-mt-sm">
          <template v-if="pendingAvatar">
            <q-btn
              flat
              dense
              rounded
              icon="clear"
              :label="$t('Cancel', {}, 'Cancel')"
              color="grey-6"
              class="avatar-action-btn"
              @click="cancelAvatar"
            />
            <q-btn
              flat
              dense
              rounded
              icon="check"
              :label="$t('Save', {}, 'Save')"
              color="positive"
              class="avatar-action-btn"
              :loading="publishingAvatar"
              :disable="!pendingAvatar"
              @click="publishAvatarAction"
            />
          </template>
          <div v-if="avatarError" class="avatar-error">{{ avatarError }}</div>
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
                    <span>{{ $t('FreshAddressHint') }}</span>
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

          <q-separator :color="darkMode ? 'white-10' : 'black-5'" />

          <!-- Show Active Status -->
          <div class="setting-row">
            <div class="setting-content">
              <div class="setting-label">{{ $t('ShowActiveStatus', {}, 'Show Active Status') }}</div>
              <div class="setting-description">
                {{ $t('ActiveStatusDescription', {}, 'Let others see when you are active. When this is off, you will also not see their active status.') }}
              </div>
            </div>
            <div class="setting-actions">
              <q-toggle
                :model-value="showActiveStatus"
                color="primary"
                @update:model-value="onToggleActiveStatus"
              />
            </div>
          </div>

        </div>

        <!-- Cache Management -->
        <div v-if="hasCache" class="danger-section q-mt-lg">
          <div class="section-label">
            {{ $t('ChatCache', {}, 'Chat Cache') }}
            <span class="cache-size-badge">{{ formattedCacheSize }}</span>
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

        <!-- Reset Chat Data -->
        <div class="danger-section q-mt-lg">
          <div class="section-label">
            {{ $t('ResetChat', {}, 'Reset Chat') }}
          </div>
          <div class="section-description">
            {{ $t('ResetChatDescription', {}, 'Clear all conversations and re-fetch them from the relay. Your contacts and profile are preserved.') }}
          </div>
          <q-btn
            :label="$t('ResetChat', {}, 'Reset Chat')"
            color="negative"
            outline
            rounded
            class="full-width"
            :loading="resettingChat"
            @click="confirmResetChat"
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
import { clearChatCache, hasChatCache, getChatCacheSize } from 'src/components/chat/MessageBubble.vue'
import { copyToClipboard } from 'quasar'
import { uploadPublicToBlossom } from 'src/wallet/nostr-media'

export default {
  name: 'ChatProfile',
  components: { HeaderNav },
  data () {
    return {
      showQrDialog: false,
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
      resettingChat: false,
      hasCache: false,
      cacheSizeBytes: 0,
      addressGeneratedFromWallet: false,
      generatingAddress: false,
      pendingAvatar: null,
      pendingAvatarBlob: null,
      publishingAvatar: false,
      removingAvatar: false,
      avatarError: '',
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
    myPrivKeyHex () {
      return this.$store.getters['nostrChat/myPrivKey']
    },
    displayNpub () {
      const npub = this.myNpub
      if (!npub) return ''
      return npub.slice(0, 12) + '...' + npub.slice(-8)
    },
    profileAddress () {
      return this.$store.getters['nostrChat/getProfile']?.bchAddress || null
    },
    profileDisplayName () {
      return this.$store.getters['nostrChat/getProfile']?.displayName || null
    },
    profileAvatar () {
      return this.$store.getters['nostrChat/getProfile']?.avatar || null
    },
    avatarDisplaySrc () {
      return this.pendingAvatar || this.profileAvatar
    },
    avatarStyle () {
      if (this.avatarDisplaySrc) {
        return { background: 'transparent' }
      }
      return { background: `linear-gradient(135deg, ${this.themeColor}, ${this.themeColor}dd)` }
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
    formattedCacheSize () {
      const bytes = this.cacheSizeBytes
      if (bytes < 1024) return `${Math.round(bytes)} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    },
    showActiveStatus () {
      return this.$store.getters['nostrChat/getShowActiveStatus']
    },
  },
  mounted () {
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true)
    this.checkCache()
  },
  beforeDestroy () {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true)
  },
  methods: {
    getDarkModeClass,
    onToggleActiveStatus (value) {
      this.$store.dispatch('nostrChat/setShowActiveStatus', value)
    },
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
    triggerAvatarUpload () {
      this.avatarError = ''
      this.$refs.avatarInput?.click()
    },
    onAvatarClick (event) {
      this.avatarError = ''
      if (this.pendingAvatar) return
      if (this.profileAvatar) {
        this.$refs.avatarMenu?.show(event)
        return
      }
      this.triggerAvatarUpload()
    },
    onDocumentPointerDown (e) {
      const menuEl = this.$refs.avatarMenu?.$el
      if (!menuEl) return
      const path = typeof e.composedPath === 'function' ? e.composedPath() : (e.path || [])
      if (path.indexOf(menuEl) !== -1) return
      if (menuEl.contains(e.target)) return
      this.$refs.avatarMenu?.hide()
    },
    async onAvatarSelected (event) {
      this.avatarError = ''
      const file = event.target.files?.[0]
      if (!file) return

      // Reset the input so the same file can be selected again
      event.target.value = ''

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        this.avatarError = this.$t('AvatarTypeError', {}, 'Please select a JPEG, PNG, GIF, or WebP image')
        return
      }

      // Validate file size: hard limit at 500KB (10x the 50KB expected max)
      const MAX_FILE_SIZE = 500 * 1024
      if (file.size > MAX_FILE_SIZE) {
        this.avatarError = this.$t('AvatarSizeError', {}, 'Image must be smaller than 500KB')
        return
      }

      try {
        const result = await this.processAvatar(file)
        this.pendingAvatar = result.dataUrl
        this.pendingAvatarBlob = result.blob
      } catch (err) {
        this.avatarError = err.message || this.$t('AvatarProcessError', {}, 'Failed to process image')
      }
    },
    processAvatar (file) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          // Crop to center square
          const size = Math.min(img.width, img.height)
          const sx = (img.width - size) / 2
          const sy = (img.height - size) / 2

          // Resize to 256x256
          const TARGET_SIZE = 256
          const canvas = document.createElement('canvas')
          canvas.width = TARGET_SIZE
          canvas.height = TARGET_SIZE
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, sx, sy, size, size, 0, 0, TARGET_SIZE, TARGET_SIZE)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          canvas.toBlob((blob) => {
            resolve({ dataUrl, blob })
          }, 'image/jpeg', 0.85)
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(file)
      })
    },
    cancelAvatar () {
      this.pendingAvatar = null
      this.pendingAvatarBlob = null
      this.avatarError = ''
    },
    async publishAvatarAction () {
      if (!this.pendingAvatar || !this.pendingAvatarBlob) return
      this.publishingAvatar = true
      this.avatarError = ''
      try {
        const privKeyHex = this.myPrivKeyHex
        const pubKeyHex = this.myPubKeyHex
        if (!privKeyHex || !pubKeyHex) {
          throw new Error(this.$t('NoNostrKey', {}, 'Nostr keys not available'))
        }

        const avatarBytes = new Uint8Array(await this.pendingAvatarBlob.arrayBuffer())
        const { url } = await uploadPublicToBlossom(
          avatarBytes,
          'image/jpeg',
          'https://blossom.paytaca.com',
          privKeyHex,
          pubKeyHex,
        )

        await this.$store.dispatch('nostrChat/publishAvatar', { avatarDataUrl: url })
        this.$q.notify({
          type: 'positive',
          message: this.$t('AvatarPublished', {}, 'Avatar published successfully'),
        })
        this.pendingAvatar = null
        this.pendingAvatarBlob = null
      } catch (err) {
        console.error('[Profile] Failed to publish avatar:', err)
        this.avatarError = err.message || this.$t('PublishFailed', {}, 'Failed to publish avatar')
      } finally {
        this.publishingAvatar = false
      }
    },
    confirmRemoveAvatar () {
      this.$q.dialog({
        title: this.$t('RemoveAvatar', {}, 'Remove Avatar'),
        message: this.$t('RemoveAvatarConfirm', {}, 'Remove your published avatar? Others will no longer see it.'),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Remove', {}, 'Remove'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        this.removingAvatar = true
        try {
          await this.$store.dispatch('nostrChat/removeAvatar')
          this.$q.notify({
            type: 'positive',
            message: this.$t('AvatarRemoved', {}, 'Avatar removed'),
          })
          this.pendingAvatarBlob = null
        } catch (err) {
          console.error('[Profile] Failed to remove avatar:', err)
          this.$q.notify({
            type: 'negative',
            message: err.message || this.$t('RemoveFailed', {}, 'Failed to remove avatar'),
          })
        } finally {
          this.removingAvatar = false
        }
      })
    },
    async checkCache () {
      try {
        this.hasCache = await hasChatCache()
        if (this.hasCache) {
          this.cacheSizeBytes = await getChatCacheSize()
        }
      } catch { this.hasCache = false }
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
            this.hasCache = false
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
    async confirmResetChat () {
      this.$q.dialog({
        title: this.$t('ResetChat', {}, 'Reset Chat'),
        message: this.$t('ResetChatConfirm', {}, 'Clear all conversations and re-fetch them from the relay? Your contacts and profile will be preserved.'),
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        cancel: { label: this.$t('Cancel', {}, 'Cancel'), flat: true, color: 'grey' },
        ok: { label: this.$t('Reset', {}, 'Reset'), color: 'negative', flat: true },
        persistent: true,
      }).onOk(async () => {
        this.resettingChat = true
        try {
          await this.$store.dispatch('nostrChat/resetAndRefetch')
          await this.checkCache()
          this.$q.notify({
            type: 'positive',
            message: this.$t('ChatResetSuccess', {}, 'Chat reset successfully. Conversations are being re-fetched.'),
          })
        } catch (err) {
          this.$q.notify({
            type: 'negative',
            message: err.message || this.$t('ChatResetFailed', {}, 'Failed to reset chat'),
          })
        } finally {
          this.resettingChat = false
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

/* Identity card */
.identity-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
}

.identity-avatar-wrapper {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
}

.identity-avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-overlay--always {
  opacity: 1;
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

.identity-qr-btn {
  flex-shrink: 0;
  color: #6b7280;
}

.identity-qr-btn.dark {
  color: #cbd5e1;
}

/* Chat ID dialog */
.qr-display-box {
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.npub-full-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #6b7280;
  word-break: break-all;
  line-height: 1.5;
  max-width: 240px;
  margin: 0 auto;
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

.setting-description {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
  line-height: 1.4;
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

/* Avatar Actions */
.avatar-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.avatar-action-btn {
  font-size: 12px;
}

.avatar-error {
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: #ef4444;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.cache-size-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
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

.dark .avatar-error {
  color: #f87171;
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

.dark .qr-display-box {
  background: #1e293b;
}

.dark .npub-full-text {
  color: #94a3b8;
}
</style>

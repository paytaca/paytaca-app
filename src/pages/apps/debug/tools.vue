<template>
  <div id="app-container" class="debug-page sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('Tools', {}, 'Tools')"
      backnavpath="/apps/debug"
      class="header-nav q-px-sm apps-header"
    />

    <div class="q-pa-md q-mt-sm">
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

      <!-- BCH Denomination Selector -->
      <div class="q-mb-md">
        <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="col">
                <div class="text-subtitle1 text-weight-medium text-bow" :class="getDarkModeClass(darkMode)">
                  {{ $t('SelectBCHDenomination') }}
                </div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
                  {{ $t('SelectBCHDenominationToolTip', {}, 'Choose how BCH amounts are displayed') }}
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
                <div class="text-subtitle1 text-weight-medium text-bow" :class="getDarkModeClass(darkMode)">
                  {{ $t('AutoGenerateAddress', {}, 'Auto generate address') }}
                </div>
                <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
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
          :label="$t('TestSound', {}, 'Test Sound')"
          icon="volume_up"
          @click="testSound"
          :loading="testingSound"
          class="full-width"
        />
      </div>

      <div class="q-mb-md">
        <div class="text-center">Check security test</div>
        <DragSlide text="Test" disable-absolute-bottom @swiped="onSwipe"/>
      </div>

      <!-- Address Key Viewer -->
      <div class="q-mb-md">
        <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('AddressKeyViewer', {}, 'Address Key Viewer') }}
            </div>
            <div class="text-caption q-mb-md" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
              {{ $t('AddressKeyViewerToolTip', {}, 'View public and private keys for wallet addresses') }}
            </div>
            
            <div class="q-mb-md">
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

            <div v-if="manualAddressInput && addressPublicKey && addressPrivateKey">
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
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Capacitor } from '@capacitor/core'
import DenominatorSelector from 'src/components/settings/DenominatorSelector'
import SecurityCheckDialog from "src/components/SecurityCheckDialog.vue"
import DragSlide from "src/components/drag-slide.vue"
import { wifToPubkey } from 'src/utils/crypto'
import { loadLibauthHdWallet } from 'src/wallet'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import axios from 'axios'
import crypto from 'crypto'

export default {
  name: 'DebugTools',
  components: {
    headerNav,
    DenominatorSelector,
    DragSlide
  },
  data () {
    return {
      testingSound: false,
      enableSLP: this.$store.getters['global/enableSLP'],
      autoGenerateAddress: this.$store.getters['global/autoGenerateAddress'],
      addressPublicKey: null,
      addressPrivateKey: null,
      showPrivateKey: false,
      manualAddressInput: '',
      loadingManualAddress: false,
      addressInfo: null
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

        const response = await axios.get(url)
        
        const addressFromApi = response.data?.address
        const addressPath = response.data?.address_path
        const watchtowerWalletDigest = response.data?.wallet_digest

        if (!addressPath) {
          throw new Error('Address path not found in watchtower response')
        }

        if (addressFromApi && addressFromApi !== address) {
          this.$q.notify({
            type: 'negative',
            message: this.$t('AddressMismatch', {}, 'Address mismatch from watchtower'),
            timeout: 3000
          })
          return
        }

        // Validate wallet digest - compare with current wallet's digest
        if (watchtowerWalletDigest) {
          // Get wallet hash from store
          const wallet = this.$store.getters['global/getWallet']('bch')
          const walletHash = wallet?.walletHash
          
          console.log('[Address Key Viewer] Wallet hash from store:', walletHash)
          console.log('[Address Key Viewer] Wallet digest from API:', watchtowerWalletDigest)
          
          if (!walletHash) {
            console.error('[Address Key Viewer] Wallet hash not found in store')
            this.$q.notify({
              type: 'negative',
              message: this.$t('WalletHashNotFound', {}, 'Could not retrieve wallet hash'),
              timeout: 3000
            })
            this.addressPublicKey = null
            this.addressPrivateKey = null
            this.addressInfo = null
            return
          }

          // Compute wallet digest (SHA-224 of wallet hash)
          // Hash wallet hash as hex input, output is hex
          const walletHashBuffer = Buffer.from(walletHash, 'hex')
          const walletDigest = crypto.createHash('sha224').update(walletHashBuffer).digest('hex')
          console.log('[Address Key Viewer] Computed wallet digest:', walletDigest)
          console.log('[Address Key Viewer] Comparison:', {
            computed: walletDigest.toLowerCase(),
            api: watchtowerWalletDigest.toLowerCase(),
            match: walletDigest.toLowerCase() === watchtowerWalletDigest.toLowerCase()
          })
          
          // Compare digests (case-insensitive)
          if (walletDigest.toLowerCase() !== watchtowerWalletDigest.toLowerCase()) {
            console.warn('[Address Key Viewer] Wallet digest mismatch - address does not belong to wallet')
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
          
          console.log('[Address Key Viewer] Wallet digest validation passed')
        } else {
          console.warn('[Address Key Viewer] No wallet_digest in API response - skipping validation')
        }

        const walletIndex = this.$store.getters['global/getWalletIndex']
        const libauthWallet = await loadLibauthHdWallet(walletIndex, isChipnet)

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

        const wif = libauthWallet.getPrivateKeyWifAt(addressPath)
        this.addressPrivateKey = wif
        this.addressPublicKey = wifToPubkey(wif)

        this.addressInfo = {
          address: response.data.address || address,
          token_address: response.data.token_address,
          address_path: addressPath,
          wallet_digest: response.data.wallet_digest,
          project_id: response.data.project_id
        }
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
      } catch (error) {
        console.error('Failed to copy:', error)
        this.$q.notify({
          type: 'negative',
          message: this.$t('FailedToCopy', {}, 'Failed to copy to clipboard'),
          timeout: 2000
        })
      }
    },
    onSwipe(reset = () => {}) {
      this.$q.dialog({
        component: SecurityCheckDialog,
      }).onOk(() => {
        this.$q.notify({ type: 'positive', message: 'Success!' })
      }).onCancel(() => {
        this.$q.notify({ message: 'Cancelled' })
      }).onDismiss(() => reset())
    },
    async testSound () {
      this.testingSound = true
      
      try {
        try {
          await NativeAudio.unload({
            assetId: 'send-success'
          })
        } catch (unloadError) {
          // Ignore errors if asset doesn't exist yet
        }

        let paths = []
        if (this.$q.platform.is.ios) {
          paths = [
            'assets/sounds/send-success.mp3',
            'send-success.mp3',
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
          if (!path || typeof path !== 'string' || path.trim() === '') {
            continue
          }
          
          try {
            const isUrl = path.startsWith('http') || path.startsWith('https') || 
                        path.startsWith('capacitor') || path.startsWith('file://')
            
            const preloadPromise = NativeAudio.preload({
              assetId: 'send-success',
              assetPath: path,
              audioChannelNum: 1,
              volume: 1.0,
              isUrl: isUrl
            })
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Preload timeout')), 5000)
            })
            
            await Promise.race([preloadPromise, timeoutPromise])
            
            preloaded = true
            break
          } catch (error) {
            lastError = error
          }
        }

        if (!preloaded) {
          const errorMsg = lastError?.message || 'Unknown error'
          throw new Error(`Failed to preload audio with any path. Last error: ${errorMsg}`)
        }

        await NativeAudio.play({
          assetId: 'send-success'
        })
        
        this.$q.notify({
          type: 'positive',
          message: this.$t('SoundPlayedSuccessfully', {}, 'Sound played successfully!'),
          timeout: 2000
        })
      } catch (error) {
        console.error('Sound test failed:', error)
        this.$q.notify({
          type: 'negative',
          message: this.$t('SoundTestFailed', {}, 'Sound test failed'),
          timeout: 3000
        })
      } finally {
        this.testingSound = false
      }
    }
  },
  async mounted () {
    // No initialization needed for address key viewer
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
</style>


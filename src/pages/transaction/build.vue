<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <headerNav
      :title="$t('BuildTransaction', {}, 'Build Transaction')"
      backnavpath="/"
      back-icon="keyboard_double_arrow_left"
      class="header-nav apps-header"
    />

    <div class="build-content q-px-md q-pt-md">
      <q-banner rounded class="q-mb-md readonly-banner" :class="getDarkModeClass(darkMode)">
        <q-icon name="visibility" color="grad" size="sm" class="q-mr-sm"></q-icon>
        {{ $t('ReadOnlyWalletNotice', {}, 'This is a read-only wallet. Instead of sending, an unsigned transaction (PSBT) is built which you can share with the wallet owner to sign and broadcast.') }}
      </q-banner>

      <div class="glass-panel q-mt-md" :class="getDarkModeClass(darkMode)">
        <div class="q-pa-md">
          <q-input
            :dark="darkMode"
            dense
            outlined
            v-model="recipient"
            :placeholder="$t('RecipientAddress', {}, 'Recipient address')"
            :error="Boolean(recipientError)"
            :error-message="recipientError"
          />
          <q-input
            :dark="darkMode"
            dense
            outlined
            v-model="amount"
            type="number"
            class="q-mt-md"
            :placeholder="$t('AmountBch', {}, 'Amount (BCH)')"
          />
        </div>
      </div>

      <q-btn
        no-caps
        rounded
        :label="$t('BuildUnsignedTransaction', {}, 'Build Unsigned Transaction')"
        class="q-mt-lg full-width primary-cta bg-grad"
        :disable="building || !canBuild"
        :loading="building"
        @click="buildTransaction"
      />
    </div>
  </div>
</template>

<script>
import { cashAddressToLockingBytecode, decodeCashAddress, CashAddressType, base64ToBin } from 'bitauth-libauth-v3'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Platform } from 'quasar'

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadReadOnlyWallet } from 'src/lib/readonly-wallet'
import headerNav from 'src/components/header-nav'
import SharePsbtOptionsDialog from 'src/components/sharing/SharePsbtOptionsDialog.vue'
import PsbtQrDialog from 'src/components/sharing/PsbtQrDialog.vue'

export default {
  name: 'BuildTransaction',
  components: {
    headerNav
  },
  data () {
    return {
      wallet: null,
      recipient: '',
      recipientError: '',
      amount: null,
      building: false,
      psbtBase64: ''
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    walletIndex () {
      return this.$store.getters['global/getWalletIndex']
    },
    canBuild () {
      return Boolean(this.recipient) && Number(this.amount) > 0 && !this.recipientError
    }
  },
  methods: {
    getDarkModeClass,
    validateAddress (address) {
      if (!address) return { valid: false, error: this.$t('RecipientAddressRequired', {}, 'Recipient address is required') }

      let lockingBytecode
      try {
        lockingBytecode = cashAddressToLockingBytecode(address)
      } catch {
        return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
      }
      if (typeof lockingBytecode === 'string') {
        return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
      }

      try {
        const decoded = decodeCashAddress(address)
        if (typeof decoded === 'string' || !decoded?.type) {
          return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
        }
        if (decoded.type === CashAddressType.p2pkhWithTokens || decoded.type === CashAddressType.p2shWithTokens) {
          return { valid: false, error: this.$t('TokenAddressNotAccepted', {}, 'Token addresses are not supported here') }
        }
      } catch {
        return { valid: false, error: this.$t('InvalidRecipientAddress', {}, 'Invalid recipient address') }
      }

      return { valid: true, error: '' }
    },
    async buildTransaction () {
      const validation = this.validateAddress(this.recipient)
      this.recipientError = validation.error
      if (!validation.valid || !this.wallet) return

      const amount = Number(this.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        this.$q.notify({
          type: 'error',
          message: this.$t('InvalidAmount', {}, 'Please enter a valid amount'),
          timeout: 5000
        })
        return
      }

      this.building = true
      try {
        const satoshis = BigInt(Math.round(amount * 1e8))
        this.psbtBase64 = await this.wallet.createProposal({
          outputs: [{ address: this.recipient.trim(), satoshis }],
          origin: this.$t('PaytacaAppOrigin', {}, 'paytaca-app'),
          purpose: this.$t('BuildTransactionPurpose', {}, 'Read-only wallet transaction')
        })
        this.openShareOptions()
      } catch (error) {
        console.error('[BuildTransaction] Error building transaction:', error)
        this.$q.notify({
          type: 'error',
          message: error?.message || this.$t('FailedToBuildTransaction', {}, 'Failed to build transaction'),
          timeout: 5000
        })
      } finally {
        this.building = false
      }
    },
    openShareOptions () {
      const vm = this
      this.$q.dialog({
        component: SharePsbtOptionsDialog,
        componentProps: {
          darkMode: this.darkMode,
          psbtBase64: this.psbtBase64
        }
      }).onOk(async (payload) => {
        if (payload?.action === 'display-qr') {
          this.openQrDialog()
        } else if (payload?.action === 'download') {
          await this.downloadPsbt()
        }
      }).onCancel(() => {
        // Dialog closed
        vm.psbtBase64 = ''
      })
    },
    openQrDialog () {
      this.$q.dialog({
        component: PsbtQrDialog,
        componentProps: {
          darkMode: this.darkMode,
          psbtBase64: this.psbtBase64
        }
      })
    },
    async downloadPsbt () {
      const defaultFilename = `readonly-tx.psbt`
      try {
        const filename = 'readonly-tx'
        const fullFilename = `${filename}.psbt`
        if (Platform.is.nativeMobile) {
          const result = await Filesystem.writeFile({
            path: fullFilename,
            data: this.psbtBase64,
            directory: Directory.Cache,
            encoding: 'base64'
          })
          return await Share.share({
            title: this.$t('DownloadOrShareFile', {}, 'Download or Share File'),
            url: result.uri
          })
        }
        const blob = new Blob([base64ToBin(this.psbtBase64)], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultFilename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)
      } catch (error) {
        if (error?.message?.includes('Share canceled')) return
        this.$q.notify({
          type: 'error',
          message: `Error: ${error.message || error}`,
          timeout: 5000
        })
      }
    }
  },
  async mounted () {
    const index = this.$store.getters['global/getWalletIndex']
    this.wallet = await loadReadOnlyWallet(index)
    if (!this.wallet) {
      this.$q.notify({
        type: 'negative',
        message: this.$t('NotReadOnlyWallet', {}, 'This wallet is not a read-only wallet'),
        timeout: 5000
      })
      this.$router.replace('/')
      return
    }
    const isChipnet = this.$store.getters['global/isChipnet']
    this.wallet.network = isChipnet ? 'chipnet' : 'mainnet'
  }
}
</script>

<style lang="scss" scoped>
.build-content {
  max-width: 480px;
  margin: 0 auto;
}

.readonly-banner {
  border-radius: 12px;

  &.dark {
    background: rgba(255, 255, 255, 0.06);
  }

  &.light {
    background: rgba(255, 255, 255, 0.35);
  }
}

.glass-panel {
  border-radius: 16px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  &.dark {
    background: rgba(39, 55, 70, 0.55);
    border-color: rgba(255, 255, 255, 0.12);
  }

  &.light {
    background: rgba(255, 255, 255, 0.55);
    border-color: rgba(0, 0, 0, 0.06);
  }
}
</style>
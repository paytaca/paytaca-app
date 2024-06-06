<template>
  <template v-if="isLoading">
    <div
      class="col pt-wallet q-mt-sm pt-card-2 text-center"
      :class="[getDarkModeClass(darkMode), fromWalletInfo ? 'pt-card' : 'pt-card-2']"
    >
      <p
        class="q-pt-sm"
        :class="[fromWalletInfo ? 'text-bow' : 'dim-text', getDarkModeClass(darkMode)]"
        style="text-align: center;"
      >
        {{ fromWalletInfo ? $t('LoadingShards') : $t('CreatingShards') }}...
      </p>
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
    </div>
  </template>

  <template v-else>
    <h5
      v-if="!fromWalletInfo"
      class="q-ma-none text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      {{ $t('ShardsBackupPhase') }}
    </h5>

    <template v-if="isDesktop">
      <p
        :class="[fromWalletInfo ? 'text-bow' : 'dim-text', getDarkModeClass(darkMode)]"
        style="margin-top: 10px;"
      >
        {{ fromWalletInfo ? $t('ShardsBackupPhaseDescription1') : $t('ShardsBackupPhaseDescription2') }}
        {{ $t('ShardsBackupPhaseDescription3') }}
      </p>

      <div class="q-mt-lg text-bow" :class="getDarkModeClass(darkMode)">
        <div
          class="q-pa-sm br-15 pt-card"
          :class="getDarkModeClass(darkMode)"
          style="border: 2px solid gray;"
        >
          <div class="text-center q-mb-sm">
            {{ $t('PersonalQRDescription1') }}
          </div>
          <div id="personal-qr" class="flex flex-center q-py-md col-qr-code">
            <p style="color: black; margin-bottom: 0;">{{ $t('FirstShard') }}</p>
            <p style="color: black">{{ $t('PersonalQRDescription2') }}</p>
            <qr-code :text="shards[1]" color="#253933" :size="200" error-level="H" />
          </div>
        </div>
        <div
          class="q-pa-sm q-mt-md br-15 pt-card"
          :class="getDarkModeClass(darkMode)"
          style="border: 2px solid gray;"
        >
          <div class="text-center q-mb-sm">
            {{ $t('ForSharingQRDescription1') }}
          </div>
          <div id="sharing-qr" class="flex flex-center q-py-md col-qr-code">
            <p style="color: black; margin-bottom: 0;">{{ $t('SecondShard') }}</p>
            <p style="color: black">{{ $t('ForSharingQRDescription2') }}</p>
            <qr-code :text="shards[2]" color="#253933" :size="200" error-level="H" />
          </div>
        </div>
        <div class="flex flex-center q-mt-md">
          <q-btn
            rounded
            :label="$t('DownloadQRCodeImages')"
            class="button"
            @click="takeScreenshot()"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div
        :class="[fromWalletInfo ? 'text-bow' : 'dim-text', getDarkModeClass(darkMode)]"
        style="margin-top: 10px;"
      >
        <p>
          {{ fromWalletInfo ? $t('ShardsBackupPhaseDescription1') : $t('ShardsBackupPhaseDescription2') }}
        </p>
        <p v-if="!fromWalletInfo">
          {{ $t('CreateMobileProcessDescription1') }}:<br/>
          1. {{ $t('CreateMobileProcessDescription2') }}<br/>
          2. {{ $t('CreateMobileProcessDescription3') }}<br/>
          3. {{ $t('CreateMobileProcessDescription4') }}
        </p>
      </div>

      <div class="q-mt-lg text-bow" :class="getDarkModeClass(darkMode)">
        <div
          class="q-pa-sm br-15 pt-card"
          :class="getDarkModeClass(darkMode)"
          style="border: 2px solid gray;"
        >
          <div class="text-center q-mb-sm">
            {{ $t('PersonalQRDescription1') }}
          </div>
          <div class="flex flex-center q-mt-md q-mb-sm">
            <q-btn
              rounded
              class="button"
              :label="$t('ShowFirstShard')"
              @click="openShardDialog(true)"
            />
          </div>
        </div>
        <div
          class="q-pa-sm q-mt-md br-15 pt-card"
          :class="getDarkModeClass(darkMode)"
          style="border: 2px solid gray;"
        >
          <div class="text-center q-mb-sm">
            {{ $t('ForSharingQRDescription1') }}
          </div>
          <div class="flex flex-center q-mt-md q-mb-sm">
            <q-btn
              rounded
              class="button"
              :label="$t('ShowSecondShard')"
              @click="openShardDialog(false)"
            />
          </div>
        </div>
      </div>

      <q-checkbox
        v-model="enableContinue"
        v-if="!fromWalletInfo"
        class="q-mt-md"
        :label="$t('ConfirmCheckboxText')"
        :disable="enableContinue"
      />
    </template>

    <q-btn
      v-if="!fromWalletInfo"
      rounded
      :disable="!enableContinue"
      :label="$t('Continue')"
      class="q-mt-lg full-width button"
      @click="$emit('proceed-to-next-step')"
    />
  </template>
</template>

<script>
import sss from 'shamirs-secret-sharing'
import html2canvas from 'html2canvas'

import { toHex } from 'hex-my-bytes'
import { isNotDefaultTheme, getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { saveShardToWatchtower } from 'src/wallet/shards'

import ProgressLoader from 'src/components/ProgressLoader'
import ShardScreenshotDialog from 'src/components/registration/ShardScreenshotDialog'

export default {
  name: 'ShardsProcess',

  props: {
    mnemonic: String,
    walletHash: String,
    fromWalletInfo: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'proceed-to-next-step'
  ],

  components: {
    ProgressLoader,
    // eslint-disable-next-line vue/no-unused-components
    ShardScreenshotDialog
  },

  data () {
    return {
      shards: [],
      isLoading: true,
      enableContinue: false
    }
  },

  async mounted () {
    const vm = this

    const secret = Buffer.from(vm.mnemonic)
    const shares = sss.split(secret, { shares: 3, threshold: 2 })
    vm.shards = shares.map(a => toHex(a))

    await saveShardToWatchtower(vm.shards)

    setTimeout(() => {
      vm.isLoading = false
    }, 1500)
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    isDesktop () {
      return this.$q.platform.is.desktop
    }
  },

  methods: {
    isNotDefaultTheme,
    getDarkModeClass,
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    displayNotif (message, color, icon) {
      this.$q.notify({ message, timeout: 800, color, icon })
    },
    takeScreenshot () {
      const saveToDesktop = (image, fileName, shouldDisplayNotif = false) => {
        try {
          const link = document.createElement('a')
          link.href = image
          link.download = fileName
          link.click()

          if (shouldDisplayNotif) {
            this.displayNotif('QR code images saved successfully.', 'blue-9', 'mdi-qrcode-plus')
          }
        } catch (error) {
          this.displayNotif('An error occurred while saving the QR code images.', 'red-9', 'mdi-qrcode-remove')
        }
      }

      const vm = this
      document.addEventListener('deviceready', () => {}, false)

      const personalQrElement = document.getElementById('personal-qr')
      html2canvas(personalQrElement).then((canvas) => {
        const image = canvas.toDataURL('image/png')
        const fileName = `qr-first-shard-${vm.walletHash.substring(0, 10)}.png`
        saveToDesktop(image, fileName)
      })

      const sharingQrElement = document.getElementById('sharing-qr')
      html2canvas(sharingQrElement).then((canvas) => {
        const image = canvas.toDataURL('image/png')
        const fileName = `qr-second-shard-${vm.walletHash.substring(0, 10)}.png`
        saveToDesktop(image, fileName, true)
      })

      if (!vm.fromWalletInfo) {
        vm.enableContinue = true
      }
    },
    openShardDialog (isFirstShard) {
      const vm = this

      vm.$q.dialog({
        component: ShardScreenshotDialog,
        componentProps: {
          shardText: vm.shards[isFirstShard ? 1 : 2],
          isFirstShard
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  .col-qr-code {
    margin: auto;
    text-align: center;
    width: 250px;
    border: 4px solid #ed5f59;
    background: white;
  }
</style>

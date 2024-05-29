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
          <p style="color: black; margin-bottom: 0;">First Shard</p>
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
          <p style="color: black; margin-bottom: 0;">Second Shard</p>
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

    <q-btn
      v-if="!fromWalletInfo"
      rounded
      :disable="disableContinue"
      :label="$t('Continue')"
      class="q-mt-lg full-width button"
      @click="$emit('proceed-to-next-step')"
    />
  </template>
</template>

<script>
import sss from 'shamirs-secret-sharing'
import html2canvas from 'html2canvas'

import { Camera } from '@capacitor/camera'
import { toHex } from 'hex-my-bytes'
import { isNotDefaultTheme, getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { saveShardToWatchtower } from 'src/wallet/shards'

import ProgressLoader from 'src/components/ProgressLoader'

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
    ProgressLoader
  },

  data () {
    return {
      shards: [],
      isLoading: true,
      disableContinue: true
    }
  },

  async mounted () {
    const vm = this

    // 1st shard is for watchtower to keep
    // 2nd is for user to save to device
    // 3rd is for user to share to someone or other device for storing

    const secret = Buffer.from(vm.mnemonic)
    const shares = sss.split(secret, { shares: 3, threshold: 2 })
    vm.shards = shares.map(a => toHex(a))

    await saveShardToWatchtower(vm.shards)

    setTimeout(() => {
      vm.isLoading = false
    }, 2000)
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
      const vm = this
      document.addEventListener('deviceready', () => {}, false)

      const personalQrElement = document.getElementById('personal-qr')
      html2canvas(personalQrElement).then((canvas) => {
        const image = canvas.toDataURL('image/png')
        const fileName = `qr-first-shard-${vm.walletHash.substring(0, 10)}.png`

        if (vm.$q.platform.is.mobile) {
          vm.saveToMobile(image, fileName)
        } else if (this.isDesktop) {
          vm.saveToDesktop(image, fileName)
        }
      })

      const sharingQrElement = document.getElementById('sharing-qr')
      html2canvas(sharingQrElement).then((canvas) => {
        const image = canvas.toDataURL('image/png')
        const fileName = `qr-second-shard-${vm.walletHash.substring(0, 10)}.png`

        if (vm.$q.platform.is.mobile) {
          vm.saveToMobile(image, fileName, true)
        } else if (this.isDesktop) {
          vm.saveToDesktop(image, fileName, true)
        }
      })

      if (!vm.fromWalletInfo) {
        vm.disableContinue = false
      }
    },
    async saveToMobile (image, fileName, shouldDisplayNotif = false) {
      if (this.$q.platform.is.android) {
        const filePath = `${cordova.file.externalRootDirectory}Pictures/${fileName}`
        // eslint-disable-next-line no-undef
        const fileTransfer = new FileTransfer()
        try {
          fileTransfer.download(image, filePath, () => {
            if (shouldDisplayNotif) {
              this.displayNotif('QR code images saved successfully.', 'blue-9', 'mdi-qrcode-plus')
            }
          }, (error) => {
            console.log(error)
            this.displayNotif('An error occurred while saving the QR code images.', 'red-9', 'mdi-qrcode-remove')
          })
        } catch (error) {
          console.log(error)
          this.displayNotif('An error occurred while saving the QR code images.', 'red-9', 'mdi-qrcode-remove')
        }
      } else if (this.$q.platform.is.ios) {
        try {
          await Camera.savePhoto({
            path: fileName,
            data: image,
            directory: 'photos'
          })
          this.displayNotif('QR code image saved successfully.', 'blue-9', 'mdi-qrcode-plus')
        } catch (error) {
          this.displayNotif('An error occurred while saving the QR code image.', 'red-9', 'mdi-qrcode-remove')
        }
      }
    },
    saveToDesktop (image, fileName, shouldDisplayNotif = false) {
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

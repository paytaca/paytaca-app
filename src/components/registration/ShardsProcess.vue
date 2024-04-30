<template>
  <template v-if="isLoading">
    <div
      class="col pt-wallet q-mt-sm pt-card-2 text-center"
      :class="getDarkModeClass(darkMode)"
    >
      <p class="dim-text q-pt-sm" style="text-align: center;">
        Creating shards...
      </p>
      <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
    </div>
  </template>

  <template v-else>
    <h5 class="q-ma-none text-bow" :class="getDarkModeClass(darkMode)">
      Shards Authentication Phase
    </h5>
    <p class="dim-text" style="margin-top: 10px;">
      Below are QR code images generated from the shards. You can screenshot them by yourself
      or use the button below to download them to your device.
    </p>

    <div class="q-mt-lg text-bow" :class="getDarkModeClass(darkMode)">
      <div
        class="q-pa-sm br-15 pt-card"
        :class="getDarkModeClass(darkMode)"
        style="border: 2px solid gray;"
      >
        <div class="text-center q-mb-sm">
          This QR code needs to be saved and stored securely in your device.
        </div>
        <div id="personal-qr" class="flex flex-center q-py-md col-qr-code">
          <p style="color: black">Save this QR code in your device</p>
          <qr-code :text="shards[1]" color="#253933" :size="200" error-level="H" />
        </div>
      </div>
      <div
        class="q-pa-sm q-mt-md br-15 pt-card"
        :class="getDarkModeClass(darkMode)"
        style="border: 2px solid gray;"
      >
        <div class="text-center q-mb-sm">
          This QR code needs to be shared to your friend. We highly advise that you share it
          immediately after saving instead of just storing it in your device.
        </div>
        <div id="sharing-qr" class="flex flex-center q-py-md col-qr-code">
          <p style="color: black">Share this QR code to a friend</p>
          <qr-code :text="shards[2]" color="#253933" :size="200" error-level="H" />
        </div>
      </div>
      <div class="flex flex-center q-mt-md">
        <q-btn
          rounded
          label="Download QR Code Images"
          class="button"
          @click="takeScreenshot()"
        />
      </div>
    </div>

    <q-btn
      rounded
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

import ProgressLoader from 'src/components/ProgressLoader'

export default {
  name: 'ShardsProcess',

  props: {
    mnemonic: String,
    walletHash: String
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
      isLoading: true
    }
  },

  mounted () {
    const vm = this

    // add loading for generating shards
    // after generation, save 1st shard to database; links should be hash of other 2 shards
    // save to db
    // 1st shard is for watchtower to keep
    // 2nd is for user to save to device
    // 3rd is for user to share to someone or other device for storing

    const secret = Buffer.from(vm.mnemonic)
    const shares = sss.split(secret, { shares: 3, threshold: 2 })
    vm.shards = shares.map(a => toHex(a))

    setTimeout(() => {
      vm.isLoading = false
    }, 3000)
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
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
        const fileName = `personal-qr-${vm.walletHash.substring(0, 10)}.png`

        if (vm.$q.platform.is.mobile) {
          vm.saveToMobile(image, fileName)
        } else if (vm.$q.platform.is.desktop) {
          vm.saveToDesktop(image, fileName)
        }
      })

      const sharingQrElement = document.getElementById('sharing-qr')
      html2canvas(sharingQrElement).then((canvas) => {
        const image = canvas.toDataURL('image/png')
        const fileName = `for-sharing-qr-${vm.walletHash.substring(0, 10)}.png`

        if (vm.$q.platform.is.mobile) {
          vm.saveToMobile(image, fileName, true)
        } else if (vm.$q.platform.is.desktop) {
          vm.saveToDesktop(image, fileName, true)
        }
      })
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

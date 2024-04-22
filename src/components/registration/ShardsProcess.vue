<template>
  <p>Process Preview here</p>

  <div>
    <div id="personal-qr" class="flex flex-center q-py-md br-15 col-qr-code">
      <p style="color: black">Keep this QR code</p>
      <qr-code :text="shards[1]" :size="200" />
    </div>
    <div id="sharing-qr" class="flex flex-center q-py-md br-15 col-qr-code">
      <p style="color: black">Share this QR code</p>
      <qr-code :text="shards[2]" :size="200" />
    </div>
    <div class="flex flex-center q-mt-md">
      <q-btn
        rounded
        label="Download QR Codes"
        class="button"
        @click="takeScreenshot()"
      />
    </div>
  </div>

  <q-btn
    rounded
    label="Continue"
    class="q-mt-lg full-width button"
    />
</template>

<script>
import sss from 'shamirs-secret-sharing'
import html2canvas from 'html2canvas'

import { Camera } from '@capacitor/camera'
import { toHex } from 'hex-my-bytes'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ShardsProcess',

  props: {
    mnemonic: String
  },

  data () {
    return {
      shards: []
    }
  },

  mounted () {
    const vm = this

    // add loading for generating shards
    // after generation, save 1st shard to database; links should be hash of other 2 shards

    const secret = Buffer.from(vm.mnemonic)
    const shares = sss.split(secret, { shares: 3, threshold: 2 })
    vm.shards = shares.map(a => toHex(a))

    // save to db
    // 1st shard is for watchtower to keep
    // 2nd is for user to save to device
    // 3rd is for user to share to someone or other device for storing

    // const recovered = sss.combine([vm.shards[0], vm.shards[1]])
    // console.log('recovered', recovered.toString())
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
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

      const qrElement = document.getElementById('personal-qr')
      html2canvas(qrElement).then((canvas) => {
        const image = canvas.toDataURL('image/png')
        const fileName = `personal-qr-${vm.shards[1].substring(0, 20)}.png`

        if (vm.$q.platform.is.mobile) {
          vm.saveToMobile(image, fileName)
        } else if (vm.$q.platform.is.desktop) {
          vm.saveToDesktop(image, fileName)
        }
      })
    },
    async saveToMobile (image, fileName) {
      if (this.$q.platform.is.android) {
        const filePath = `${cordova.file.externalRootDirectory}Pictures/${fileName}`
        // eslint-disable-next-line no-undef
        const fileTransfer = new FileTransfer()
        try {
          fileTransfer.download(image, filePath, () => {
            this.displayNotif('QR code image saved successfully.', 'blue-9', 'mdi-qrcode-plus')
          }, (error) => {
            console.log(error)
            this.displayNotif('An error occurred while saving the QR code image.', 'red-9', 'mdi-qrcode-remove')
          })
        } catch (error) {
          console.log(error)
          this.displayNotif('An error occurred while saving the QR code image.', 'red-9', 'mdi-qrcode-remove')
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
    saveToDesktop (image, fileName) {
      try {
        const link = document.createElement('a')
        link.href = image
        link.download = fileName
        link.click()
        this.displayNotif('QR code image saved successfully.', 'blue-9', 'mdi-qrcode-plus')
      } catch (error) {
        this.displayNotif('An error occurred while saving the QR code image.', 'red-9', 'mdi-qrcode-remove')
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

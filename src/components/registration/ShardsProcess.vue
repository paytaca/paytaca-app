<template>
  <p>Process Preview here</p>

  <!-- 1st process screenshot -->
  <template v-if="processStep === 0">
    <p>Screenshot the QR code of the first shard and store it somewhere safe.</p>
    <div id="personal-qr" class="flex flex-center q-py-md br-15 col-qr-code">
      <qr-code :text="shards[1]" :size="200" />
    </div>
    <div class="flex flex-center q-mt-md">
      <q-btn
        rounded
        label="Take screenshot of QR"
        class="button"
        @click="takeScreenshot()"
      />
    </div>
  </template>

  <!-- 2rd process pictured using another device (disable screenshot) -->
  <template v-else-if="processStep === 1">
    <p>Have a friend or another device take a picture of the QR code below and store it somewhere safe.</p>
    <p>Storing it in this device is not advisable for this step.</p>
    <div class="flex flex-center q-py-md br-15 col-qr-code">
      <qr-code :text="shards[2]" :size="200" />
    </div>
    <p class="text-center q-my-md">Share QR code to a friend</p>
    <div class="flex flex-center q-pb-sm row no-wrap q-gutter-x-md" style="overflow-x:auto;">
      <template v-for="shareLink, index in shareLinks" :key="index">
        <q-btn
          rounded
          padding="md"
          size="md"
          class="button"
          :icon="shareLink.icon"
          :href="shareLink.url"
          target="_blank"
        />
      </template>
    </div>
  </template>

  <q-btn
    rounded
    label="Continue"
    class="q-mt-lg full-width button"
    @click="advanceToNextStep()"
  />
  <q-btn
    flat
    padding="md"
    :label="$t('Back')"
    icon="arrow_back"
    class="full-width button button-text-primary"
    :class="getDarkModeClass(darkMode)"
    @click="processStep -= 1"
    v-if="processStep > 0"
  />
</template>

<script>
import sss from 'shamirs-secret-sharing'
import html2canvas from 'html2canvas'

import { Camera } from '@capacitor/camera'
// import { Filesystem, Directory } from '@capacitor/filesystem'
import { toHex } from 'hex-my-bytes'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ShardsProcess',

  props: {
    mnemonic: String
  },

  data () {
    return {
      shards: [],
      processStep: 0
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
    },
    shareLinks () {
      const data = {
        messenger: {
          icon: 'fab fa-facebook-messenger',
          url: '#'
        },
        telegram: {
          icon: 'telegram',
          url: '#'
        },
        whatsapp: {
          icon: 'fab fa-whatsapp',
          url: '#'
        },
        email: {
          icon: 'email',
          url: '#'
        }
      }

      return data
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
    advanceToNextStep () {
      const vm = this
      vm.processStep += 1

      if (vm.processStep === 2) {
        vm.processStep = 0
        // move to user preferences step
      }
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
      const { Plugins } = window.Capacitor
      Plugins.Screenshot.capture()
      if (this.$q.platform.is.android) {
        const filePath = `${cordova.file.externalRootDirectory}/Pictures/Paytaca/${fileName}`
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
        /*
        const base64Data = image.replace(/^data:image\/png;base64,/, '')

        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            // trying to save to Directory.Documents or Directory.ExternalStorage
            // causes saving to fail because of user permissions
            // https://github.com/ionic-team/capacitor-plugins/issues/1512
            // currently save to Directory.Cache to allow saved
            // images to persist even if the app is uninstalled
            directory: Directory.Cache
          })
          this.displayNotif('QR code image saved successfully.', 'blue-9', 'mdi-qrcode-plus')
        } catch (error) {
          this.displayNotif('An error occurred while saving the QR code image.', 'red-9', 'mdi-qrcode-remove')
        }
        */
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

<template>
  <p>Process Preview here</p>

  <!-- 1st process screenshot -->
  <template v-if="processStep === 0">
    <p>Screenshot the QR code of the first shard and store it somewhere safe.</p>
    <div id="personal-qr" class="flex flex-center q-py-md br-15 col-qr-code">
      <qr-code :text="shards[1]" :size="200" />
    </div>
    <q-btn
      rounded
      label="Take screenshot of QR"
      class="q-mt-lg button"
      @click="takeScreenshot()"
    />
  </template>

  <!-- 3rd process pictured using another device (disable screenshot) -->
  <template v-else-if="processStep === 1">
    <p>Have a friend or another device take a picture of the QR code below and store it somewhere safe.</p>
    <p>Taking a screenshot and storing it in this device is not advisable for this step.</p>
    <div class="flex flex-center q-py-md br-15 col-qr-code">
      <qr-code :text="shards[2]" :size="200" />
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
import { Filesystem, Directory } from '@capacitor/filesystem'
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
      if (this.processStep < 1) {
        this.processStep += 1
      } else {
        // move to user preferences step
      }

      if (this.processStep === 1) {
        this.disableScreenshot()
      }
    },
    disableScreenshot () {
      document.addEventListener('keyup', function (e) {
        if (e.key === 'PrintScreen') {
          e.preventDefault()
        }
      })

      document.addEventListener('keydown', function (e) {
        if (e.key === 'PrintScreen') {
          e.preventDefault()
        }
      })

      document.addEventListener('keypress', function (e) {
        if (e.key === 'PrintScreen') {
          e.preventDefault()
        }
      })
    },
    takeScreenshot () {
      const vm = this

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

          this.$q.notify({
            message: 'QR code image saved successfully.',
            timeout: 800,
            color: 'blue-9',
            icon: 'mdi-qrcode-plus'
          })
        } catch (error) {
          console.log('error here yey', error)
          this.$q.notify({
            message: 'An error occurred while saving the QR code image.',
            timeout: 800,
            color: 'red-9',
            icon: 'mdi-qrcode-remove'
          })
        }
      } else if (this.$q.platform.is.ios) {
        try {
          await Camera.savePhoto({
            path: fileName,
            data: image,
            directory: 'photos'
          })

          this.$q.notify({
            message: 'QR code image saved successfully.',
            timeout: 800,
            color: 'blue-9',
            icon: 'mdi-qrcode-plus'
          })
        } catch (error) {
          this.$q.notify({
            message: 'An error occurred while saving the QR code image.',
            timeout: 800,
            color: 'red-9',
            icon: 'mdi-qrcode-remove'
          })
        }
      }
    },
    saveToDesktop (image, fileName) {
      const link = document.createElement('a')
      link.href = image
      link.download = fileName
      link.click()
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
  .disable-screenshot {
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Old versions of Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
  }
</style>

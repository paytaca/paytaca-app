<template>
  <p>Process Preview here</p>

  <!-- 1st process screenshot -->
  <template v-if="processStep === 0">
    <p>Screenshot the QR code OR copy the code below and store it somewhere safe.</p>
    <div class="flex flex-center q-py-md br-15 col-qr-code">
      <qr-code :text="shards[0]" :size="200" />
    </div>
    <div
      class="q-py-sm q-px-md q-px-lg q-mt-md row items-center no-wrap rounded-borders disable-screenshot"
      style="border:1px solid grey; position:relative"
      v-ripple
      @click="copyToClipboard(shards[0])"
    >
      <div style="overflow-y: auto; white-space: nowrap;">{{ shards[0] }}</div>
    </div>
  </template>

  <!-- 2nd process Google login -->
  <template v-else-if="processStep === 1">
    Google login
  </template>

  <!-- 3rd process pictured using another device (disable screenshot) -->
  <template v-else-if="processStep === 2">
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

    const secret = Buffer.from(vm.mnemonic)
    const shares = sss.split(secret, { shares: 3, threshold: 2 })
    vm.shards = shares.map(a => toHex(a))
    // const recovered = sss.combine([shards[0], shards[1]])
    // console.log('recovered', recovered.toString())
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
      if (this.processStep < 2) {
        this.processStep += 1
      } else {
        // move to user preferences step
      }

      if (this.processStep === 2) {
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

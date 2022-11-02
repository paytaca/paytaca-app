<template>
  <div class="static-container">
    <div
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="q-pt-xl"
      :class="{ 'pt-dark': darkMode }"
    >
      <HeaderNav
        title="QR Code"
        backnavpath="/apps/gifts"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
      <div class="text-center" :class="{'text-white': darkMode}" style="margin-top: 80px;">
          <p style="font-size: 22px;">Amount:<br>{{ amountBCH }} BCH</p>
          <div class="flex flex-center" >
            <div class="flex flex-center col-qr-code" @click="copyToClipboard(qrCodeContents)">
              <qr-code :text="qrCodeContents" />
            </div>
            <div class="flex flex-center myStyle"></div>
          </div>
          <p style="font-size: 18px;">Scan to claim the gift</p>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'

export default {
  name: 'Gift-showQr',
  components: { HeaderNav },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      qrCodeContents: null,
      amountBCH: null
    }
  },
  methods: {
    mountThis () {
      const vm = this
      vm.qrCodeContents = 'jericho'
      vm.amountBCH = 0.001
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }

  },
  mounted () {
    this.mountThis()
  }
}

</script>

<template>
  <div class="col row justify-center">
    <q-skeleton style="border-radius: 12px;" v-if="loading" :height="(padding + 30 + size) + 'px'" :width="(padding + 30 + size) + 'px'" class="q-mb-sm"/>
    <template v-if="assetId === 'bch'">
      <img
        id="bch-logo"
        src="/icons/bitcoin-cash-circle.svg"
        :width="iconSize"
        :height="iconSize"
        :style="{'margin-top': (padding + (size / 2) - (iconSize / 2)) + 'px'}"
        alt="BCH logo" 
      />
    </template>
    <template v-else>
      <img
        v-if="icon && !loading"
        class="icon"
        :src="icon"
        :width="iconSize"
        :style="{'margin-top': (padding + (size / 2) - (iconSize / 2)) + 'px'}"
      />
    </template>
    <div id="qr"></div>
  </div>
</template>

<script>
var QRCode = require("qrcode-svg")

export default {
  props: {
    assetId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    icon: {
      type: String,
      default: null
    },
    iconSize: {
      type: Number,
      default: 50
    }
  },
  data () {
    return {
      loading: true,
      padding: 35
    }
  },
  mounted() {
    this.renderQRCode();
  },
  watch: {
    text: 'renderQRCode' // Watch for changes to `text` and re-render the QR code
  },
  methods: {
    renderQRCode() {
      const vm = this
      const container = document.getElementById("qr")

      if (container) {
        setTimeout(() => {
          const qrcode = new QRCode({
            content: vm.text,
            width: vm.size,
            height: vm.size,
            join: true,
            ecl: "M",
            padding: 0
          })
          
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(qrcode.svg(), "image/svg+xml");
          const svgElement = svgDoc.documentElement;

          container.innerHTML = ''; // Clear previous content
          container.appendChild(svgElement); // Append the SVG element
          vm.loading = false
        }, 700)
      }
    }
  }
}
</script>

<style>
.icon {
  position: absolute;
  background: white;
  border-radius: 50%;
  padding: 4px;
  z-index: 1000;
  user-select: none;
  -webkit-user-select: none;
}

#qr svg {
  display: block;
  width: 100%;
  height: auto;
  padding: 35px;
  background-color: white;
  border-radius: 12px;
  user-select: none;
  -webkit-user-select: none;
}
#bch-logo {
  position: absolute;
  background: white;
  border-radius: 50%;
  padding: 4px;
  user-select: none;
  -webkit-user-select: none;
}
</style>

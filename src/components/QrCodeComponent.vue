<template>
  <div class="col row justify-center qr">
    <q-skeleton style="border-radius: 12px;" v-if="loading" :height="(padding + 30 + size) + 'px'" :width="(padding + 30 + size) + 'px'" class="q-mb-sm"/>
    <template v-if="assetId === 'bch' && !icon">
      <img
        id="bch-logo"
        src="bitcoin-cash-circle.svg"
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
    <div :id="`qr-${qrId}`"></div>
  </div>
</template>

<script>
var QRCode = require("qrcode-svg")

export default {
  props: {
    qrId: {
      type: Number,
      default: 0
    },
    assetId: {
      type: String,
      default: '',
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
      default: 40
    },
    borderWidth: {
      type: String,
      default: '0px'
    },
    borderColor: {
      type: String,
      default: 'red'
    },
    generating: {
      type: Boolean,
      default: false
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
    generating(newVal) {
      if (newVal) {
        this.loading = true
        const container = document.getElementById(`qr-${this.qrId}`)
        if (container) {
          container.style.display = 'none'
        }
      } else {
        this.loading = false
        const container = document.getElementById(`qr-${this.qrId}`)
        if (container) {
          container.style.display = 'block'  // or 'flex' depending on your layout
        }
      }
    },
    text(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.renderQRCode()
      }
    }
  },
  methods: {
    renderQRCode() {
      const vm = this
      const container = document.getElementById(`qr-${vm.qrId}`)

      if (container) {
        setTimeout(() => {
          const qrcode = new QRCode({
            content: vm.text,
            width: vm.size,
            height: vm.size,
            swap: true,
            join: true,
            ecl: "Q",
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

.qr svg {
  display: block;
  width: 100%;
  height: auto;
  padding: 30px;
  background-color: white;
  border-radius: 10px;
  border-style: solid;
  border-width: v-bind(borderWidth);
  border-color: v-bind(borderColor);
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}
#bch-logo {
  position: absolute;
  background: white;
  border-radius: 50%;
  padding: 4px;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}
</style>

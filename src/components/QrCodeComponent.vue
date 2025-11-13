<template>
  <div class="col row justify-center qr">
    <div
      class="qr-wrap q-mb-sm"
      :style="{ width: wrapperSize + 'px', height: wrapperSize + 'px' }"
    >
      <div class="qr-layer qr-skeleton" v-show="loading">
        <q-skeleton style="border-radius: 12px;" :height="wrapperSize + 'px'" :width="wrapperSize + 'px'"/>
      </div>

      <div class="qr-layer">
        <template v-if="assetId === 'bch' && !icon && !loading">
          <img
            id="bch-logo"
            src="bitcoin-cash-circle.svg"
            :width="iconSize"
            :height="iconSize"
            :style="{ top: (padding + (size / 2) - (iconSize / 2)) + 'px' }"
            alt="BCH logo"
          />
        </template>
        <template v-else>
          <img
            v-if="icon && !loading"
            class="icon"
            :src="icon"
            :width="iconSize"
            :style="{ top: (padding + (size / 2) - (iconSize / 2)) + 'px' }"
          />
        </template>

        <div class="qr-canvas" :id="`qr-${qrId}`"></div>
      </div>
    </div>
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
  computed: {
    wrapperSize () {
      const divisor = this.$q.platform.is.mobile ? 1.3 : 1;
      return this.padding + 30 + this.size / divisor;
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
        // Do not hide the skeleton here; let renderQRCode finish and fade-in SVG then clear loading
        const container = document.getElementById(`qr-${this.qrId}`)
        if (container) container.style.display = 'block'
        // Call renderQRCode to handle the case where generating becomes false
        // This ensures loading is cleared even if text is empty
        this.renderQRCode()
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

      // Guard: Do not attempt to render with empty content
      const content = (vm.text ?? '').toString().trim()
      if (!content || !container) {
        // If generating is false and we have no content, clear loading state
        // This prevents the skeleton from staying visible indefinitely
        if (!vm.generating) {
          vm.loading = false
        }
        return
      }

      setTimeout(() => {
        try {
          const qrcode = new QRCode({
            content,
            width: vm.size,
            height: vm.size,
            swap: true,
            join: true,
            ecl: "Q",
            padding: 0
          })

          const parser = new DOMParser()
          const svgDoc = parser.parseFromString(qrcode.svg(), "image/svg+xml")
          const svgElement = svgDoc.documentElement

          // Prepare fade-in to avoid flicker
          svgElement.style.opacity = '0'
          svgElement.style.willChange = 'opacity'
          container.innerHTML = ''
          container.appendChild(svgElement)
          // Wait for next paint, then fade in
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              svgElement.style.transition = 'opacity 160ms ease'
              const onDone = () => {
                svgElement.removeEventListener('transitionend', onDone)
                vm.loading = false
              }
              // use transitionend to hide skeleton exactly when visible
              svgElement.addEventListener('transitionend', onDone)
              // fallback in case transitionend doesn't fire
              setTimeout(onDone, 220)
              svgElement.style.opacity = '1'
            })
          })
        } catch (err) {
          console.error('QR render error:', err)
        }
      }, 300)
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
  left: 50%;
  transform: translateX(-50%);
}

.qr-wrap {
  position: relative;
}
.qr-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-canvas {
  position: relative;
  z-index: 2;
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
  left: 50%;
  transform: translateX(-50%);
}
</style>

<template>
  <div class="col row justify-center">
    <div id="qr-code">
      <img
        v-if="icon"
        class="icon justify-center"
        :src="icon"
        :width="iconSize"
        :style="{'margin-top': ((size / 2) - (iconSize / 2)) + 'px', 'margin-left': -(iconSize / 2) + 'px'}"
      />
      <VueQRCodeComponent :text="text" :size="size" error-level="H"></VueQRCodeComponent>
    </div>
  </div>
</template>

<script>
import VueQRCodeComponent from 'vue-qrcode-component'

export default {
  components: {
    VueQRCodeComponent
  },
  props: {
    name: {
      type: String,
      default: 'bch-qr'
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
  }
}
</script>

<style>
  #qr-code {
    background-color: white;
    padding: 30px;
    border-radius: 10px;
    /* border: 4px solid #ed5f59; */
  }
  .icon {
    position: absolute;
    background: white;
    border-radius: 50%;
    padding: 4px;
    z-index: 1000;
  }
</style>
<!-- <template>
  <div class="col row justify-center">
    <q-skeleton v-if="loading" :height="size + 'px'" :width="size + 'px'" class="q-mb-sm"/>
    <img
      v-if="icon"
      class="icon"
      :src="icon"
      :width="iconSize"
      :style="{'margin-top': ((size / 2) - (iconSize / 2)) + 'px'}"
    />
    <div :id="name"></div>
  </div>
</template>

<script>
import * as qr from '@bitjson/qr-code'
qr.defineCustomElements(window)

export default {
  props: {
    name: {
      type: String,
      default: 'bch-qr'
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
    }
  },
  data () {
    return {
      loading: true
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
      const vm = this;
      const container = document.getElementById(vm.name);

      if (container) {
        container.innerHTML = ''; // Clear the container before rendering new QR code

        setTimeout(() => {
          container.innerHTML = `
            <div>
              <qr-code
                id="${vm.name + '-qr'}"
                squares="true"
                contents="${vm.text}"
                style="
                  width: 30vw;
                  min-width: ${vm.size }px;
                  min-height: ${vm.size }px;
                  background-color: #fff;
                  border-radius: 10px;
                  padding: 30px;
                  border: 4px solid #ed5f59;
                "
              >
              </qr-code>
            </div>
          `;
          vm.loading = false
        }, 50);
      }
    },
    animate(animation) {
      const container = document.getElementById(this.name);
      if (container) {
        document
          .getElementById(this.name + '-qr')
          .animateQRCode(animation);
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
}
</style> -->

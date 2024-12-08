<template>
  <div class="col row justify-center">
    <img v-if="icon" class="icon" :src="icon" :width="iconSize" :style="{'margin-top': ((size / 2) - (iconSize / 2)) + 'px'}" />
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
        default: 60
      }
  },
  mounted () {
      const vm = this
      document.getElementById(vm.name).addEventListener('codeRendered', () => {
          document.getElementById(this.name + '-qr').animateQRCode('FadeInCenterOut');
      });
      setTimeout(() => {
          document.querySelector('#' + vm.name).innerHTML = `
          <div>
              <qr-code
                  id="${vm.name + '-qr'}"
                  contents="${vm.text}"
                  style="
                    width: ${vm.size}px;
                    height: ${vm.size}px;
                    background-color: #fff;
                    border-radius: 10px;
                    border: 4px solid #ed5f59;
                  "
              >
              </qr-code>
          </div>
      `;
      }, 100);
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
</style>
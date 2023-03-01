<template>
  <div
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white' : 'text-black',]"
  >
    <div class="text-center justify-center text-h5" style="font-size:20px">
      Please send exactly <br><b>{{ shiftInfo.depositAmount}} {{ shiftInfo.depositCoin }}</b> to...
    </div>

    <div class="row q-pt-md">
      <div class="col qr-code-container">
        <div class="col col-qr-code q-pl-sm q-pr-sm q-pt-md">
          <div class="row text-center">
            <div class="col row justify-center q-pt-md" @click="copyToClipboard(shiftInfo.depositAddress)">
              <qr-code :text="shiftInfo.depositAddress" color="#253933" :size="200" error-level="H" class="q-mb-sm"></qr-code>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col" style="padding: 20px 40px 0px 40px; overflow-wrap: break-word;"  @click="copyToClipboard(shiftInfo.depositAddress)">
        <span class="qr-code-text text-weight-light text-center">
          <div style="letter-spacing: 1px" :class="darkMode ? 'text-white' : 'pp-text'">
            {{ shiftInfo.depositAddress }}
            <p style="font-size: 12px; margin-top: 7px;">{{ $t('ClickToCopyAddress') }}</p>
          </div>
        </span>
      </div>
    </div>
    <div class="text-center q-pt-md text-h4">
      Timer Here
    </div>
  </div>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      shiftInfo: {}
    }
  },
  props: {
    shiftData: Object
  },
  methods: {
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  },
  async mounted () {
    const vm = this
    console.log(this.shiftData)

    vm.shiftInfo = vm.shiftData
  }
}
</script>
<style lang="scss" scoped>
 .address-text {
    font-size: 18px;
    color: #000;
 }
 .qr-code-container {
    padding-left: 28px;
    padding-right: 28px;
  }
  .col-qr-code {
    margin-left: auto;
    margin-right: auto;
    text-align: center;
    width: 300px;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    padding: 25px 10px 32px 10px;
    background: white;
  }
  .qr-code-text {
    font-size: 18px;
    color: #000;
  }
  .text-subtitle1 {
  font-size: 14px;
}
.text-nowrap {
  white-space: nowrap;
}
.pp-text {
  color: #000 !important;
}
.pt-internet-required {
  text-align: center;
  width: 100%;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
</style>


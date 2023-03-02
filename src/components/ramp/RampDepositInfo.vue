<template>
  <div
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white' : 'text-black',]"
  >
    <div v-if="!shiftExpired">
      <div class="text-center justify-center text-h5" style="font-size:20px;">
        Please send exactly <br><b style="letter-spacing: 1px;">{{ shiftInfo.depositAmount}} {{ shiftInfo.depositCoin }}</b> to...
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
      <div class="text-center q-pt-md text-h2 text-blue-5">
        {{ countDown }}
      </div>
    </div>
    <div class="text-center" v-if="shiftExpired">
      <div class="q-pt-md text-h2 text-red-5 q-py-lg">
        Expired
      </div>
      <div class="q-pt-lg">
        <q-btn color="blue-9" label="Try Again" @click="$emit('retry')"></q-btn>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      shiftInfo: {},
      countDown: '',
      shiftExpired: false
    }
  },
  props: {
    shiftData: Object
  },
  emits: ['retry'],
  methods: {
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    countingDown () {
      const vm = this

      const expire = vm.shiftInfo.expiresAt
      const expireDate = new Date(expire).getTime()

      const x = setInterval(function () {
        const now = new Date().getTime()
        // find distance
        const distance = expireDate - now

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        let seconds = Math.floor((distance % (1000 * 60)) / 1000)
        if (seconds.toString().length < 2) {
          seconds = '0' + seconds
        }

        vm.countDown = minutes + ':' + seconds

        if (distance < 0) {
          clearInterval(x)
          vm.countDown = 'Expired'
          vm.shiftExpired = true
        }
      }, 1000)
    },
    tryAgain () {
      console.log('try again')
      this.$router.push({
        name: 'ramp'
      })
    }
  },
  async mounted () {
    const vm = this
    console.log(this.shiftData)

    vm.shiftInfo = vm.shiftData
    vm.countingDown()
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


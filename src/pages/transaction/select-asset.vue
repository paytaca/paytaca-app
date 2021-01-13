<template>
  <div>
    <div class="row">
        <div class="col q-mt-md q-pl-md text-center q-pr-md">
          <router-link to="/"><i class="icon-size-1 material-icons q-mt-sm icon-arrow-left">arrow_back</i></router-link>
          <p class="text-center select q-mt-sm text-token"><b>SELECT AN ASSET</b></p>
        </div>
    </div>
    <div class="row">
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none">
          <p class="slp_tokens q-mb-sm"><b>SELECT AN ASSET</b></p>
        </div>
    </div>
    <div to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
      <div class="col q-pl-sm q-pr-sm">
        <p class="q-ma-none text-token"><b>BCH</b></p>
        <p class="q-ma-none asset">Bch</p>
      </div>
    </div>
    <div to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
      <div class="col q-pl-sm q-pr-sm">
        <p class="q-ma-none text-token"><b>SPICE</b></p>
        <p class="q-ma-none asset">Spice</p>
      </div>
    </div>
    <div class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
      <div class="col q-pl-sm q-pr-sm">
        <p class="q-ma-none text-token"><b>SLP</b></p>
        <p class="q-ma-none asset">Slp</p>
      </div>
    </div>
    <div class="row">
      <div class="col q-pa-lg">
        <p class="error">{{ error }}</p>

        <p class="decode-result">Last result: <b>{{ result }}</b></p>
      </div>
    </div>

    <qrcode-stream camera="auto" @decode="onDecode" @init="onInit" />
  </div>
</template>

<script>
import { QrcodeStream } from 'vue-qrcode-reader'

export default {
  name: 'Select-token-page',
  components: { QrcodeStream },
  data () {
    return {
      result: '',
      error: ''
    }
  },
  methods: {
    onDecode (result) {
      this.result = result
    },
    async onInit (promise) {
      try {
        // promise.catch(console.error).then(this.resetValidationState)
        await promise
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          this.error = 'ERROR: you need to grant camera access permisson'
        } else if (error.name === 'NotFoundError') {
          this.error = 'ERROR: no camera on this device'
        } else if (error.name === 'NotSupportedError') {
          this.error = 'ERROR: secure context required (HTTPS, localhost)'
        } else if (error.name === 'NotReadableError') {
          this.error = 'ERROR: is the camera already in use?'
        } else if (error.name === 'OverconstrainedError') {
          this.error = 'ERROR: installed cameras are not suitable'
        } else if (error.name === 'StreamApiNotSupportedError') {
          this.error = 'ERROR: Stream API is not supported in this browser'
        }
      }
    }
  }
}
</script>

<style lang="scss">
  .error {
    font-weight: bold;
    color: red;
  }
  .asset {
    color: #B4BABA;
    position: absolute;
  }
  .icon-arrow-left {
    position: absolute;
    left: 20px;
    color: #3992EA;
  }
  .icon-size-1 {
    font-size: 26px;
  }
  .slp_tokens {
    color: #636767;
  }
  .token-link {
    color: #000;
    text-decoration: none;
  }
  .text-token {
    color: #444646;
  }
</style>

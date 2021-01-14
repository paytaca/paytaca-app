<template>
  <div>
    <div class="row">
        <div class="col q-mt-md q-pl-md text-center q-pr-md">
          <router-link to="/select-token"><i class="icon-size-1 material-icons q-mt-sm icon-arrow-left">arrow_back</i></router-link>
          <p class="text-center select q-mt-sm text-token"><b>SEND</b></p>
        </div>
    </div>
    <router-link to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div style="background-color: gray; padding: 3px 5px 4px 5px; border-radius: 4px"><q-icon class="color-light-gray icon-size" :name="fasQrcode" /></div>
      <div class="col q-pl-sm q-pr-sm token-name-container">
        <p class="q-ma-none text-token"><b>BCH</b></p>
      </div>
    </router-link>
    <router-link to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div style="background-color: gray; padding: 3px 5px 4px 5px; border-radius: 4px"><q-icon class="color-light-gray icon-size" :name="fasWallet" /></div>
      <div class="col q-pl-sm q-pr-sm token-name-container">
        <p class="q-ma-none text-token"><b>SPICE</b></p>
      </div>
    </router-link>
  </div>
</template>

<script>
import { fasQrcode, fasWallet } from '@quasar/extras/fontawesome-v5'

export default {
  name: 'Send-page',
  data () {
    return {
    }
  },
  created () {
    this.fasQrcode = fasQrcode
    this.fasWallet = fasWallet
  }
}
</script>

<style lang="scss">
  .color-light-gray {
    color: #444646;
  }
  .icon-size {
    font-size: 18px;
  }
  .token-name-container {
    padding-top: 2px;
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

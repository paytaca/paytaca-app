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
    <router-link to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
      <div class="col q-pl-sm q-pr-sm">
        <p class="q-ma-none text-token"><b>BCH</b></p>
        <p class="q-ma-none asset">Bch</p>
      </div>
    </router-link>
    <router-link to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
      <div class="col q-pl-sm q-pr-sm">
        <p class="q-ma-none text-token"><b>SPICE</b></p>
        <p class="q-ma-none asset">Spice</p>
      </div>
    </router-link>
    <router-link to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
      <div class="col q-pl-sm q-pr-sm">
        <p class="q-ma-none text-token"><b>SLP</b></p>
        <p class="q-ma-none asset">Slp</p>
      </div>
    </router-link>
  </div>
</template>

<script>

export default {
  name: 'Select-token-page',
  data () {
    return {
    }
  }
}
</script>

<style lang="scss">
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

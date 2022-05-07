<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="Asset Swap"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <div class="q-px-md" style="margin-top: 7%; text-align: center; font-size: 20px; padding: 30px;" :class="darkMode ? 'text-white' : 'text-black'">
      <p style="font-size: 24px;">Soon, you will be able to swap tokens!</p>
      <p>We will integrate SLP DEX for SLP tokens and SmartSwap DEX aggregator for SEP20 tokens.</p><br>
      <p>If you want to bridge BCH to SmartBCH or vice-versa, use the <router-link to="/apps/bridge">Bridge</router-link>.</p>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'

export default {
  name: 'AssetSwap',
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  }
}
</script>

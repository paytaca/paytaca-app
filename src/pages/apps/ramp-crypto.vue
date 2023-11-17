<template>
<div id="app-container" class="row" :class="{'pt-dark': darkMode}">
    <HeaderNav title="Crypto Ramp" backnavpath="/apps"/>
    <div v-if="!isloaded" class="row justify-center q-py-lg" style="margin-top: 50%">
      <ProgressLoader/>
    </div>
    <div v-else>
        <!-- CRYPTO Tab Content -->
        <RampShiftForm v-if="isAllowed"/>
        <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
            <div>Sorry. This feature is blocked in your country &#128533;</div>
        </div>
    </div>
</div>
</template>
<script>
import HeaderNav from 'src/components/header-nav.vue'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import RampShiftForm from 'src/components/ramp/crypto/RampShiftForm.vue'

export default {
  components: {
    HeaderNav,
    ProgressLoader,
    RampShiftForm
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isAllowed: true,
      isloaded: false
    }
  },
  async mounted () {
    const vm = this
    // check permission first
    const permission = await vm.$axios.get('https://sideshift.ai/api/v2/permissions').catch(function () { vm.error = true })
    if (!permission.data.createShift) {
      vm.isAllowed = false
    }
    vm.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
.pt-internet-required {
text-align: center;
width: 100%;
font-size: 24px;
padding: 30px;
color: gray;
}
</style>

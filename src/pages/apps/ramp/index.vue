<template>
  <div id="app-container" :class="{'pt-dark': darkMode}">
    <HeaderNav
      :title="`${selectedCurrency.toLocaleUpperCase()} Ramp`"
      backnavpath="/apps"
    />

    <div v-if="!appSelection">
      <!-- CRYPTO tab Content -->
      <div v-if="selectedCurrency === 'crypto'">
        <!-- Progress Loader -->
        <div v-if="!isloaded">
          <div class="row justify-center q-py-lg" style="margin-top: 50px">
            <ProgressLoader/>
          </div>
        </div>
        <div v-if="isloaded">
          <RampShiftForm v-if="isAllowed"/>
          <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
            <div>
              Sorry. This feature is blocked in your country &#128533;
            </div>
          </div>
        </div>
      </div>

      <!-- FIAT tab content here -->
      <div v-if="selectedCurrency === 'fiat'">
        <FiatRampIndex/>
      </div>
    </div>
  </div>

  <!-- App Select Dialog -->
  <appSelectionDialog
    v-if="appSelection"
    @back="$router.go(-1)"
    @submit="selectApp"
  />
</template>
<script>
// import { ref } from 'vue'
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import appSelectionDialog from 'src/components/ramp/appSelectionDialog.vue'
import RampShiftForm from '../../../components/ramp/RampShiftForm'
import FiatRampIndex from '../../../components/ramp/fiat/Index.vue'

export default {
  components: {
    HeaderNav,
    ProgressLoader,
    RampShiftForm,
    FiatRampIndex,
    appSelectionDialog
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: '',
      error: false,
      pageName: 'ramp-fiat-store',
      appSelection: true,
      isAllowed: true,
      isloaded: false
    }
  },
  methods: {
    selectApp (app) {
      const vm = this
      console.log(app)

      vm.selectedCurrency = app
      vm.pageName = 'ramp-' + app
      if (app === 'fiat') {
        vm.pageName += '-store'
      }
      console.log('pageName:', vm.pageName)
      this.$router.push({ name: vm.pageName })

      vm.appSelection = false
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

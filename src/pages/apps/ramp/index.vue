<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:100px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="Ramp"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <q-tabs
      active-color="brandblue"
      class="col-12 q-px-sm q-pb-md pp-fcolor q-mx-md"
      style="padding-bottom: 16px;"
      v-model="selectedCurrency"
      :style="{ 'margin-top': $q.platform.is.ios ? '10px' : '-35px'}"
    >
      <q-tab
        name="Fiat"
        :class="{'text-blue-5': darkMode}"
        disable
        label="fiat"
      >
        <q-popup-proxy>
          <q-banner :class="darkMode ? 'pt-dark text-white' : 'text-black'" class="q-pa-md br-15 text-center">
            Coming Soon
          </q-banner>
        </q-popup-proxy>
      </q-tab>
      <q-tab
        name="Crypto"
        :class="{'text-blue-5': darkMode}"
        label="crypto"
      />
    </q-tabs>

    <RampShiftForm/>

  </div>
</template>
<script>
import HeaderNav from '../../../components/header-nav'
import RampShiftForm from '../../../components/ramp/RampShiftForm'

export default {
  components: {
    HeaderNav,
    RampShiftForm
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedCurrency: 'Crypto'
    }
  }
}
</script>

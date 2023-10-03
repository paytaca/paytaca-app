<template>
  <div id="app-container" :class="getDarkModeClass()">
    <HeaderNav
      :title="$t('Ramp')"
      backnavpath="/apps"
      class="apps-header"
    />

    <q-tabs
      :active-color="isDefaultTheme ? 'rgba(0, 0, 0, 0.5)' : brandblue"
      :indicator-color="isDefaultTheme && 'transparent'"
      class="col-12 q-px-sm q-pb-md q-pt-lg pp-fcolor q-mx-md"
      style="padding-bottom: 16px;"
      v-model="selectedCurrency"
      :style="{ 'margin-top': $q.platform.is.ios ? '-10px' : '-35px'}"
    >
      <q-tab
        name="fiat"
        class="network-selection-tab"
        :class="{'text-blue-5': darkMode}"
        disable
        :label="$t('Fiat')"
      >
        <q-popup-proxy>
          <q-banner :class="darkMode ? 'pt-dark info-banner text-white' : 'text-black'" class="q-pa-md br-15 text-center">
            {{ $t('RampFiatNotice') }}
          </q-banner>
        </q-popup-proxy>
      </q-tab>
      <q-tab
        name="crypto"
        class="network-selection-tab"
        :class="{'text-blue-5': darkMode}"
        :label="$t('Crypto')"
      />
    </q-tabs>

    <!-- CRYPTO Tab -->
    <div v-if="selectedCurrency === 'crypto'">
      <RampShiftForm v-if="isAllowed"/>
      <div class="col q-mt-sm pt-internet-required" v-if="!isAllowed">
        <div>
          Sorry. This feature is blocked in your country &#128533;
        </div>
      </div>
    </div>

    <!-- Add FIAT tab content here -->

  </div>
</template>
<script>
import { ref } from 'vue'
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
      selectedCurrency: ref('crypto'),
      isAllowed: true,
      error: false
    }
  },
  computed: {
    isDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    getDarkModeClass (darkModeClass = 'dark', lightModeClass = 'light') {
      return this.darkMode ? darkModeClass : lightModeClass
    }
  },
  async mounted () {
    const vm = this
    // check permission first
    const permission = await vm.$axios.get('https://sideshift.ai/api/v2/permissions').catch(function () { vm.error = true })

    if (!permission.data.createShift) {
      vm.isAllowed = false
    }
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
</style>>

<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav title="Cash In"/>

    <div v-if="step === 1">
      <PaymentMethodOption @select-method="step++"/>
    </div>
    <div v-else-if="step === 2">
      <SelectAmount/>
    </div>
    <div v-else>
      continue
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import PaymentMethodOption from 'src/components/cash-in/PaymentMethodOption.vue'
import SelectAmount from 'src/components/cash-in/SelectAmount.vue'

export default {
  data () {
    return {
      selectedPaymentMethod: null,
      step: 1
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  components: {
    HeaderNav,
    PaymentMethodOption,
    SelectAmount
  },
  methods: {
    getDarkModeClass
  }
}
</script>


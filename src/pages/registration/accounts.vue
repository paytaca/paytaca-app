<template>
  <div id="app-container" class="light gradient-bg">
    <!-- On boarding -->
    <onboarding v-if="showOnboarding" @register="showOnboarding = false"/>
    <div v-else>
      <!-- Select Language -->
      <selectCountryLanguage v-if="step === 1" @done="step++"/>
      <!-- Login/Sign up -->
      <login v-if="step === 2"/>
    </div>
  </div>
</template>
<script>
import onboarding from 'src/components/ui-revamp/registration/onboarding.vue'
import selectCountryLanguage from 'src/components/ui-revamp/registration/select-country-language.vue'
import login from 'src/components/ui-revamp/registration/login.vue'

export default {
  data () {
    return {
      showOnboarding: false,
      step: 1,
    }
  },
  components: {
    onboarding,
    selectCountryLanguage,
    login
  },
  async mounted () {
    if (this.$store.getters['global/isVaultEmpty']) {
      this.showOnboarding = true
    }
  }
}
</script>
<style lang="scss" scoped>
.register-container {
  width: 100%;
  height: 100%;
  background-color: aqua;
}
</style>

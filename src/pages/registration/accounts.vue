<template>
  <div id="app-container" class="light" :class="gradientBg ? 'gradient-bg' : ''">
    <!-- On boarding -->
    <onboarding v-if="showOnboarding" @register="showOnboarding = false"/>
    <div v-else>
      <!-- Select Language -->
      <selectCountryLanguage v-if="step === 1" @done="step++"/>
      <!-- Login/Sign up -->
      <login v-if="step === 2" @proceed="proceedAccountLogin"/>
      <!-- Import Seed Phrase or Use shards -->
      <div v-if="step === 3">
        <div v-if="createAccount">
          Generating new wallet
        </div>
        <div v-else>
          <seedPhraseContainer v-if="loginType === 'seed-phrase'" @back="returnToLoginSelect()" :isImport="false"/>
          <div v-else class="text-dark">
            Login with shards
          </div>
        </div>        
      </div>

      <!-- Generate New Wallet : Step = 0 -->
    </div>
  </div>
</template>
<script>
import onboarding from 'src/components/ui-revamp/registration/onboarding.vue'
import selectCountryLanguage from 'src/components/ui-revamp/registration/select-country-language.vue'
import seedPhraseContainer from 'src/components/ui-revamp/registration/seed-phrase-container.vue'
import login from 'src/components/ui-revamp/registration/login.vue'

export default {
  data () {
    return {
      showOnboarding: false,
      loginType: '', // shards, seed-phrase
      step: 1,
      createAccount: false,
      gradientBg: true
    }
  },
  components: {
    onboarding,
    selectCountryLanguage,
    login,
    seedPhraseContainer
  },
  async mounted () {
    if (this.$store.getters['global/isVaultEmpty']) {
      this.showOnboarding = true
    }
  },
  methods: {
    proceedAccountLogin (info) {
      console.log('login: ', info)
      this.loginType = info.type
      this.createAccount = info.createAccount

      this.step++
      this.gradientBg = false
    },
    returnToLoginSelect () {
      this.gradientBg = true      
      this.step--
    }
  }
}
</script>
<style lang="scss" scoped>
</style>

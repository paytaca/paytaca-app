<template>
  <div id="app-container" class="light gradient-bg">
    <onboarding v-if="showOnboarding" @register="showOnboarding = false"/>
    <div v-else>Register Here</div>
  </div>
</template>
<script>
import onboarding from 'src/components/ui-revamp/registration/onboarding.vue'
export default {
  data () {
    return {
      showOnboarding: false
    }
  },
  components: {
    onboarding
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

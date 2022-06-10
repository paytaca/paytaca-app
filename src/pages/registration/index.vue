<template>
  <div id="registration-container">
    <div class="row q-pb-sm">
      <div class="col-12 pt-brand">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div>
      <form @submit="submitForm" v-if="show" v-cloak>
        <div class="row">
          <div class="pt-get-started q-pa-lg" :class="{'pt-dark': $store.getters['darkmode/getStatus']}">
            <h5 class="q-ma-none get-started-text" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">Get Started</h5>
            <p class="dim-text">We'll just need a few basic details</p>

            <div class="row">
              <div class="col q-mt-sm">
                <label class="get-started-text" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">Name</label>
                <q-input type="text" class="q-mt-xs bg-grey-3 br-40" dense rounded outlined />
              </div>
            </div>
            <div class="row">
              <div class="col q-mt-md">
                <label class="get-started-text" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">Email</label>
                <q-input type="text" class="q-mt-xs bg-grey-3 br-40" placeholder="Optional" dense rounded outlined />
              </div>
            </div>
            <div class="row">
              <div class="col q-my-md">
                <label class="get-started-text" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">Mobile Number</label>
                <q-input type="text" class="q-mt-xs bg-grey-3 br-40" placeholder="Optional" dense rounded outlined />
              </div>
            </div>
            <div class="row">
              <q-btn push class="full-width bg-blue-9 text-white q-mt-md" type="submit" label="Submit" rounded />
            </div>
          </div>
        </div>
      </form>
      <div class="row" v-else style="margin-top: 60px;">
        <div class="col" v-if="error">
          <div class="col q-mt-sm pt-internet-required text-white">
            Internet connection is required to proceed. &#128533;
          </div>
        </div>
        <div class="col transparent" v-else>
          <div class="col q-mt-sm text-center">
            <ProgressLoader color="white" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ProgressLoader from '../../components/ProgressLoader'

export default {
  name: 'registration-index',
  components: { ProgressLoader },
  data () {
    return {
      show: false,
      error: false
    }
  },
  methods: {
    submitForm (event) {
      event.preventDefault()
      this.$router.push('/accounts')
    }
  },
  async created () {
    this.$q.dark.set(false)
    const vm = this
    vm.$axios.get('https://watchtower.cash', { timeout: 30000 }).then(function (response) {
      if (response.status === 200) {
        vm.show = true
      }
    }).catch(function () {
      vm.error = true
    })
  }
}
</script>

<style lang="scss">
[v-cloak] {
  display: none;
}
.icon-container {
  width: 30px;
}
.pt-internet-required {
  text-align: center;
  font-size: 24px;
  padding: 30px;
  color: gray;
}
.get-started-text {
  color: #4C4F4F;
}
.dim-text {
  color: #8F8CB8;
}
</style>

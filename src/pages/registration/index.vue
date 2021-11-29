<template>
  <div id="registration-container">
    <div class="row q-pb-sm pt-brand-row">
      <div class="col-12 pt-brand">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p class="pt-brandname">Paytaca</p>
      </div>
    </div>
    <div>
      <form @submit="submitForm" v-if="show" v-cloak>
        <div class="row">
          <div class="pt-get-started q-pa-lg">
            <h5 class="q-ma-none get-started-text">Get Started</h5>
            <p class="dim-text">We'll just need a few basic details</p>

            <div class="row">
              <div class="col q-mt-sm">
                <label class="get-started-text">Name</label>
                <input type="text" class="pt-form-input q-mt-xs">
              </div>
            </div>
            <div class="row">
              <div class="col q-mt-md">
                <label class="get-started-text">Email</label>
                <input type="text" class="pt-form-input q-mt-xs pt-input" placeholder="Optional">
              </div>
            </div>
            <div class="row">
              <div class="col q-mt-md">
                <label class="get-started-text">Mobile Number</label>
                <input type="text" class="pt-form-input q-mt-xs pt-input" placeholder="Optional">
              </div>
            </div>
            <div class="row">
              <q-btn push class="full-width pt-submit-btn q-mt-md" type="submit" label="Submit" rounded />
            </div>
          </div>
        </div>
      </form>
      <div class="row" v-else style="background: #fff; margin-top: 60px;">
        <div class="col" v-if="error">
          <div class="col q-mt-sm pt-internet-required">
            Internet connection is required to proceed. &#128533;
          </div>
        </div>
        <div class="col" v-else>
          <div class="col q-mt-sm" style="text-align: center;">
            <loader></loader>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Loader from '../../components/loader'
import { NativeBiometric } from 'capacitor-native-biometric'

export default {
  name: 'registration-index',
  components: { Loader },
  data () {
    return {
      show: false,
      error: false
    }
  },
  methods: {
    submitForm (event) {
      event.preventDefault()
      this.$router.push('/registration/accounts')
    },
    fingerPrintAuth () {
      NativeBiometric.isAvailable()
        .then(result => {
          console.log('Biometric type: ', result.biometryType)
        })
        .catch(_err => {
          console.log('Error: ', _err)
        })
    }
  },
  async created () {
    NativeBiometric.isAvailable()
      .then(res => {
        console.log('Is available: ', res.isAvailable)
        this.fingerPrintAuth()
      })
      .catch(_err => {
        console.log('Error: ', _err)
      })

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
.pt-brand-row {
  height: 152px;
}
.icon-container {
  width: 30px;
}
.pt-internet-required {
  text-align: center;
  font-size: 24px;
  padding: 30px;
  color: gray;
  font-family: Arial, Helvetica, sans-serif;
}
.get-started-text {
  color: #4C4F4F;
}
.dim-text {
  color: #8F8CB8;
}
.pt-submit-btn {
  color: #fff;
  height: 40px;
  background-color: #2E73D2;
}
.submit-btn:focus {
  box-shadow: 0px 0px 2px 2px rgba(93, 173, 226, .8);
}
</style>

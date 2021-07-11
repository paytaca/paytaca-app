<template>
  <div id="registration-container">
    <div class="row">
      <div class="col" style="text-align: center; padding: 20px 0px 0px 0px;">
        <img src="~/assets/paytaca_logo.png" height="60">
        <p style="color: #EAEEFF; font-size: 28px;">Paytaca</p>
      </div>
    </div>
    <div>
      <form @submit="submitForm" v-if="show" v-cloak>
        <div class="row">
          <div class="get-started q-mt-sm q-pa-lg">
            <h5 class="q-ma-none get-started-text">Get Started</h5>
            <p class="dim-text">We'll just need a few basic details</p>

            <div class="row">
              <div class="col q-mt-sm">
                <label class="get-started-text">Name</label>
                <input type="text" class="form-input q-mt-xs">
              </div>
            </div>
            <div class="row">
              <div class="col q-mt-md">
                <label class="get-started-text">Email</label>
                <input type="text" class="form-input q-mt-xs" placeholder="Optional">
              </div>
            </div>
            <div class="row">
              <div class="col q-mt-md">
                <label class="get-started-text">Mobile Number</label>
                <input type="text" class="form-input q-mt-xs" placeholder="Optional">
              </div>
            </div>
            <div class="row">
              <button class="submit-btn q-mt-md" style="background: #3b7bf6; font-size: 18px;">Submit</button>
            </div>
          </div>
        </div>
      </form>
      <div class="row" v-else style="background: #fff; margin-top: 60px;">
        <div class="col" v-if="error">
          <div class="col q-mt-sm" style="text-align: center; font-size: 24px; padding: 30px; color: gray;">
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
    }
  },
  created () {
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
  #registration-container {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  }
  .brandname {
    color: #fff;
  }
  .get-started {
    width: 100%;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #F9F8FF;
    padding-top: 28px;
  }
  .icon-container {
    width: 30px;
  }
  .form-input {
    width: 100%;
    height: 38px;
    border-radius: 18px;
    border: 1px solid #008BF1;
    outline: 0;
    padding-left: 14px;
  }
  .form-input:focus {
    border-color: #89BFF4;
    box-shadow: 0px 0px 2px 2px rgba(137, 191, 244, .5);
  }
  .get-started-text {
    color: #4C4F4F;
  }
  .dim-text {
    color: #8F8CB8;
  }
  .submit-btn {
    background-color: #2E73D2;
    border: 1px solid #15568E;
    width: 100%;
    height: 40px;
    border-radius: 20px;
    color: #fff;
    outline: 0;
  }
  .submit-btn:focus {
    box-shadow: 0px 0px 2px 2px rgba(93, 173, 226, .8);
  }
</style>

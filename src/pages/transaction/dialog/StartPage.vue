<template>
  <div class="pt-start-page" :class="{'pt-dark': darkMode}">
      <div class="row q-pb-sm pt-brand-container">
          <div class="col-12 q-pt-md q-pb-sm pt-brand-body" :class="darkMode ? 'pt-dark' : 'bg-white'">
              <img src="~/assets/paytaca_logo.png" height="120">
              <br>
              <p class="text-h4" :class="darkMode ? 'text-white' : 'text-black'">Paytaca</p>
              <p :class="darkMode ? 'text-white' : 'text-black'">{{ $t('PaytacaMotto') }}</p>
              <br>
              <q-btn :label="$t('LogIn')" color="blue-9" rounded @click="logIn" />
          </div>
      </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    logIn () {
      this.$emit('logIn')
    }
  }
}
</script>

<style>
.pt-start-page {
  position: absolute !important;
  height: 100%;
  width: 100%;
  background: #fff;
  /* background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59); */
}
.pt-brand-container {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100%;
}
.pt-brand-body {
  padding-top: 20px;
  padding-bottom: 30px;
  text-align: center;
}
.pp-text {
  color: #000 !important;
}
</style>

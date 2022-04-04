<template>
  <div class="pt-start-page">
      <div class="row q-pb-sm pt-brand-container">
          <div class="col-12 q-pt-md q-pb-sm pt-brand-body bg-white">
              <img src="~/assets/paytaca_logo.png" height="120">
              <br>
              <p class="pt-brand-name text-h4">Paytaca</p>
              <p style="color: gray;">YOUR MONEY. YOUR CONTROL.</p>
              <br>
              <q-btn label="Log In" class="pp-text" @click="logIn" />
          </div>
      </div>
  </div>
</template>

<script>
export default {
  data () {
    return {}
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
  font-family: Arial, Helvetica, sans-serif;
}
.pt-brand-name {
  color: 000;
}
.pp-text {
  color: #000 !important;
}
</style>

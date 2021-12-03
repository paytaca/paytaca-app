<template>
    <q-dialog
    v-model="dialog"
    persistent
    :maximized="true"
    >
        <div class="pt-start-page">
            <div class="row q-pb-sm pt-brand-container">
                <div class="col-12 q-pt-md q-pb-sm pt-brand-body bg-white">
                    <img src="~/assets/paytaca_logo.png" height="130">
                    <p class="pt-brand-name text-h4">Paytaca</p>
                    <q-btn label="Log In" @click="logIn" />
                </div>
            </div>
        </div>
    </q-dialog>
</template>

<script>
export default {
  data () {
    return {
      dialog: true
    }
  },
  props: ['startPageStatus'],
  watch: {
    startPageStatus () {
      if (this.startPageStatus === 'hide') {
        this.dialog = false
        this.$emit('setStartPageStatus')
      }
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
  position: relative !important;
  height: 100%;
  width: 100%;
  background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
}
.pt-brand-container {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100%;
}
.pt-brand-body {
  text-align: center;
  font-family: Arial, Helvetica, sans-serif;
}
.pt-brand-name {
  color: #ef4f84;
}
</style>

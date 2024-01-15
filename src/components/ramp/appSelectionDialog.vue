<template>
  <q-dialog v-model="openDialog" v-on:before-hide="$emit('back')">
    <q-card
      class="br-15 q-pt-sm q-mx-md q-mx-none"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      :style="$q.platform.is.mobile ? 'min-width: 100%' : 'min-width: 30%'">
      <!-- <q-btn flat padding="md" icon="close" @click="$emit('back')"/> -->
      <div class="text-center bold-text lg-font-size q-my-md">Select Ramp App</div>
      <div class="row no-wrap justify-around items-baseline md-font-size q-pt-md q-mb-lg">
        <div class="col column items-center">
          <q-btn @click="selectApp('crypto')" class="q-mb-sm q-pa-md button-color" dense flat outline rounded size="2em" icon="currency_bitcoin"/>
          <span>Crypto</span>
        </div>
        <div class="col column items-center">
          <q-btn @click="selectApp('fiat')" class="q-mb-sm q-pa-md button-color" dense flat outline rounded size="2em" icon="attach_money"/>
          <span>Fiat</span>
        </div>
        <!-- <div class="col column items-center">
          <q-btn @click="selectApp('appeal')" class="q-mb-sm q-pa-md button-color" dense flat outline rounded size="2em" icon="gavel"/>
          <span class="text-capitalize">appeals</span>
        </div> -->
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      openDialog: true
    }
  },
  emits: ['back', 'submit'],
  methods: {
    selectApp (app) {
      this.openDialog = false
      this.$emit('submit', app)
    }
  }
}
</script>
<style lang="scss" scoped>
.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}
.lg-font-size {
  font-size: large;
}

.button-color {
  background: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  color: white
}
</style>

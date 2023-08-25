<template>
  <q-dialog persistent v-model="openDialog">
    <q-card
      class="br-15 q-pt-sm q-mx-md q-mx-none"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      style="min-width: 75%;"
    >
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
      <div class="text-center bold-text xm-font-size">
        Select Ramp App
      </div>
      <div class="row no-wrap justify-around items-baseline bold-text md-font-size q-pt-lg q-mb-lg">
        <div class="col column items-center">
          <q-btn @click="selectApp('fiat')" class="q-mb-sm" dense outline rounded size="2.5em" icon="o_attach_money" :color="darkMode ? 'blue-1' : 'blue-6'"/>
          <span>FIAT</span>
        </div>
        <div class="col column items-center">
          <q-btn @click="selectApp('crypto')" class="q-mb-sm" dense outline rounded size="2.5em" icon="o_currency_bitcoin" :color="darkMode ? 'blue-1' : 'blue-6'"/>
          <span>CRYPTO</span>
        </div>
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
      console.log(app)
      this.$emit('submit', app)
    }
  }
}
</script>

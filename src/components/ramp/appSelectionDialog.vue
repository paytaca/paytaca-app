<template>
  <q-dialog persistent v-model="openDialog">
    <q-card
      class="br-15 q-pt-sm q-mx-md q-mx-none"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      :style="$q.platform.is.mobile ? 'min-width: 100%' : 'min-width: 30%'"
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
      <div class="row no-wrap justify-around items-baseline md-font-size q-pt-lg q-mb-lg">
        <div v-for="(app, index) in apps" :key="index">
          <div class="col column items-center">
            <q-btn @click="selectApp(app.name)" class="q-mb-sm q-pa-md button-color" dense flat outline rounded size="2em" :icon="app.icon"/>
            <span class="text-capitalize">{{ app.name }}</span>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { loadP2PWalletInfo } from 'src/wallet/ramp'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      walletIndex: this.$store.getters['global/getWalletIndex'],
      arbiter: this.$store.getters['ramp/getArbiter'],
      openDialog: true,
      apps: [
        {
          name: 'fiat',
          icon: 'attach_money'
        },
        {
          name: 'crypto',
          icon: 'currency_bitcoin'
        }
      ]
    }
  },
  emits: ['back', 'submit'],
  async mounted () {
    const vm = this
    if (!vm.arbiter) {
      const walletInfo = vm.$store.getters['global/getWallet']('bch')
      const wallet = await loadP2PWalletInfo(walletInfo, this.walletIndex)
      await vm.$store.dispatch('ramp/fetchArbiter', wallet)
        .then(function () {
          vm.arbiter = vm.$store.getters['ramp/getArbiter']
        })
    }
    console.log('arbiter:', vm.arbiter)
    if (vm.arbiter) {
      vm.apps.push({
        name: 'appeal',
        icon: 'gavel'
      })
    }
  },
  methods: {
    selectApp (app) {
      this.$emit('submit', app)
    }
  }
}
</script>
<style lang="scss" scoped>
.button-color {
  background: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  color: white
}
</style>

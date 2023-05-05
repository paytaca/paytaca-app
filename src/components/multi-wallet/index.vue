<template>
  <q-dialog position="bottom" full-width>
    <q-card style="height: 525px;" class="br-15" :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-subtitle1 q-space q-mt-sm">List of Wallets</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <!-- <div>Title</div> -->
    </q-card>
  </q-dialog>
</template>
<script>
import { getMnemonic, testing } from '../../wallet'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  async mounted () {
    const vm = this
    console.log('Hello World')

    // const mnemonic = await getMnemonic()
    // console.log(mnemonic)
    // console.log(vm.$store.getters['global/getVault'])
    // testing(vm.$store.getters['global/getWalletIndex'])

    // console.log(vm.$store.getters['global/getWalletIndex'])

    // vm.$store.commit('global/clearVault')
  }
}
</script>

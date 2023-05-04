<template>
  <q-dialog seamless position="bottom" full-width>
    <q-card style="height: 500px;" class="br-15">
      <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      Hello World
    </q-card>
  </q-dialog>
</template>
<script>
import { getMnemonic, testing } from '../../wallet'

export default {
  async mounted () {
    const vm = this
    console.log('Hello World')

    // const mnemonic = await getMnemonic()
    // console.log(mnemonic)
    console.log(vm.$store.getters['global/getVault'])
    testing(vm.$store.getters['global/getWalletIndex'])

    // console.log(vm.$store.getters['global/getWalletIndex'])

    // vm.$store.commit('global/clearVault')
  }
}
</script>

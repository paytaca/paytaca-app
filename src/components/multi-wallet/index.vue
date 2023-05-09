<template>
  <q-dialog  ref="dialog" position="bottom" full-width>
    <q-card style="height: 525px;" class="br-15" :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg">
        <div class="text-h5 q-space q-mt-sm" style="font-size: 18px;">Wallets</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <div class="row no-wrap items-center justify-center q-px-md">
        <div class="text-h5 q-space q-mt-sm"></div>
        <div clickable class="q-pr-lg text-blue" style="margin-top: 10px;" @click="$router.push('/accounts')"><u>Create/Import Wallet</u></div>
      </div>
      <q-card-section class="q-pt-sm" v-if="isloading">
        <q-virtual-scroll :items="vault">
          <template v-slot="{ item: wallet, index }">
            <q-item clickable :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'" @click="switchWallet(index)">
              <q-item-section>
                <div>
                  {{ wallet.name }} {{ wallet.bch.lastAddress }}
                </div>
              </q-item-section>
            </q-item>
          </template>
        </q-virtual-scroll>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getMnemonic, testing } from '../../wallet'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      currentIndex: this.$store.getters['global/getWalletIndex'],
      vault: [],
      isloading: false
    }
  },
  methods: {
    processVaultName () {
      const vm = this
      let count = 1

      for (const item in vm.vault) {
        // console.log(vm.vault[item])
        const wallet = vm.vault[item]

        // console.log(wallet.name)
        if (wallet.name === '') {
          // vm.vault[item].name = 'Personal Wallet #' + count
          const name = 'Personal Wallet #' + count
          vm.$store.commit('global/updateWalletName', { index: item, name: name })
        }

        count++
      }
    },
    switchWallet (index) {
      console.log('switching wallet')

      this.$store.dispatch('global/switchWallet', index)
      this.$refs.dialog.hide()
    },
    hide () {
      this.$refs.dialog.hide()
    }
  },
  async mounted () {
    const vm = this
    vm.vault = vm.$store.getters['global/getVault']

    vm.processVaultName()
    vm.isloading = true

    console.log(vm.currentIndex)
    // const mnemonic = await getMnemonic(vm.$store.getters['global/getWalletIndex'])
    // console.log(mnemonic)
    // console.log(vm.$store.getters['global/getVault'])
    // testing(vm.$store.getters['global/getWalletIndex'])

    // console.log(vm.$store.getters['global/getWalletIndex'])

    // vm.$store.commit('global/clearVault')
  }
}
</script>

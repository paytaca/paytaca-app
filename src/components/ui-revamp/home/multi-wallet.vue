<template>
  <q-btn class="q-mr-sm" padding="0" size="sm" no-caps flat :loading="isloading">
    <q-icon name="keyboard_arrow_down" class="q-pr-sm"/>
    <span class="title-small">{{ walletName }}</span>&nbsp;

    <q-menu
      ref="walletSelect"
      class="wallet-select"      
    >
      <q-virtual-scroll
        style="max-height: 250px;"
        :items="vault"
        separator
        v-slot="{ item, index}"   
        :class="darkmode ? 'text-light' : 'text-dark'"     
      >
        <q-item clickable v-ripple class="body-small" v-close-popup @click="switchWallet(index)">
          {{ item.name }}
        </q-item>
      </q-virtual-scroll>
      <!-- <q-list style="max-height: 100px;">
        <q-item clickable v-for="wallet in vault">
          {{ wallet.name }}
        </q-item>
      </q-list> -->
    </q-menu>
  </q-btn>
</template>
<script>
import { isChipnet } from 'src/store/global/getters';


export default {
  data () {
    return {
      darkmode: this.$store.getters['darkmode/getStatus'],
      currentIndex: this.$store.getters['global/getWalletIndex'],
      isChipnet: this.$store.getters['global/isChipnet'],
      isloading: false,

      vault: []
    }
  },
  computed: {
    walletIndex () {
      return this.$store.getters['global/getWalletIndex']
    },
    walletName () {
      return this.$store.getters['global/getVault'][this.walletIndex].name
    }
  },
  async mounted () {
    const vm = this

    vm.$store.dispatch('assets/updateVaultBchBalances', { chipnet: vm.isChipnet })?.catch(console.error)

    // double checking if vault is empty
    await vm.$store.dispatch('global/saveExistingWallet')
    await vm.$store.dispatch('assets/saveExistingAsset', {
      index: vm.$store.getters['global/getWalletIndex'],
      walletHash: vm.$store.getters['global/getWallet']('bch')?.walletHash
    })
    await vm.processVaultName()
  },
  methods: {
    async processVaultName () {
      const vm = this
      vm.isloading = true

      // fallback method for processing default wallet names for empty
      // wallet names, so that they can be assigned with default names
      // without waiting for the wallet names from server
      vm.processDefaultVaultName()

      const tempVault = vm.$store.getters['global/getVault']
      await tempVault.forEach(async (wallet, index) => {
        let tempName = wallet.name
        if (wallet.name === '') { // from vuex store
          tempName = `Personal Wallet #${index + 1}`
        } else {
          const walletName = await vm.$store.dispatch(
            'global/syncWalletName',
            { walletIndex: index }
          ).catch(console.error) ?? ''

          if (walletName) tempName = walletName
          else tempName = `Personal Wallet #${index + 1}`
        }

        vm.$store.commit('global/updateWalletName', { index, name: tempName })
      })

      vm.arrangeVaultData()
      vm.isloading = false
    },
    processDefaultVaultName () {
      const vm = this
      const tempVault = vm.$store.getters['global/getVault']

      tempVault.forEach((wallet, index) => {
        if (wallet.name === '') {
          vm.$store.commit('global/updateWalletName', { index, name: `Personal Wallet #${index + 1}` })
        }
      })
    },
    arrangeVaultData () {
      const vm = this
      let tempVault = vm.$store.getters['global/getVault']
      tempVault = JSON.stringify(tempVault)
      tempVault = JSON.parse(tempVault)
      vm.vault = tempVault
      console.log('vault: ', vm.vault)
    },
    switchWallet (index) {
      const vm = this
      console.log('index: ', index)
      console.log('current-index: ', this.currentIndex)
      if (index === this.currentIndex) return

      // vm.hide()
      // const loadingDialog = this.$q.dialog({
      //   component: LoadingWalletDialog
      // })

      vm.$store.dispatch('global/switchWallet', index).then(function () {
        vm.$router.push('/')
        setTimeout(() => { location.reload() }, 500)
      })

      // loadingDialog.hide()
    },
  }
}
</script>
<style lang="scss" scoped>
.wallet-select {
  border-radius: 50%;
  padding: 5px 5px 5px;
  max-height: 100px;
}
</style>

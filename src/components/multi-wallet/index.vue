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
            <q-item class="q-pb-sm" clickable :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'" @click="selectedIndex = index">
              <q-item-section style="overflow-wrap: break-word;">
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap">
                  <span class="text-h5" style="font-size: 15px;">{{ wallet.name }} &nbsp;<q-icon :class="isActive(index)? 'active-color' : 'inactive-color'" size="13px" name="mdi-checkbox-blank-circle"/></span>
                  <span  class="text-nowrap q-ml-xs q-mt-sm">0 BCH</span>
                </div>
                <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap">
                  <span style="font-size: 12px; color: gray;">{{ arrangeAddressText(wallet.bch.lastAddress) }}</span>
                  <span style="font-size: 12px; color: gray;" class="text-nowrap q-ml-xs">0 USD</span>
                </div>
                <q-menu anchor="bottom right" self="top end" >
                  <q-list class="text-h5" :class="{'pt-dark-card': $store.getters['darkmode/getStatus']}" style="min-width: 150px; font-size: 15px;">
                    <q-item clickable v-close-popup>
                      <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']" @click="switchWallet(selectedIndex)">Switch Wallet</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup>
                      <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']" @click="openRenameDialog()">Rename</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup>
                      <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">close</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
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
import renameDialog from './renameDialog.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      currentIndex: this.$store.getters['global/getWalletIndex'],
      vault: [],
      isloading: false,
      secondDialog: false,
      selectedIndex: null
    }
  },
  components: {
    renameDialog
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
      if (index !== this.currentIndex) {
        console.log('switching wallet')

        this.$store.dispatch('global/switchWallet', index)
      } else {
        console.log('same wallet')
      }
      this.$refs.dialog.hide()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    arrangeAddressText (address) {
      return address.slice(0, 19) + '.....' + address.slice(40)
    },
    isActive (index) {
      if (index === this.currentIndex) {
        return true
      } else {
        return false
      }
    },
    openRenameDialog () {
      this.$q.dialog({
        component: renameDialog,
        componentProps: {
          index: this.selectedIndex
        }
      })
    }
  },
  async mounted () {
    console.log('Multi-Wallet')
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
<style lang="scss" scoped>
.inactive-color {
  color: #ed5e59;
}
.active-color {
  color: #8ec351
}
</style>

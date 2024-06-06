<template>
  <!-- TODO add truncate of name if name is too long -->
  <!-- either add ellipsis or wrap the text -->
  <q-btn-dropdown
    flat
    class="full-width"
    align="between"
    :label="walletName"
  >
    <MultiWallet />
  </q-btn-dropdown>
</template>

<script>
import MultiWallet from 'src/components/multi-wallet/index'

export default {
  name: 'MultiWalletDropdown',

  components: {
    MultiWallet
  },

  data () {
    return {
      walletName: ''
    }
  },

  mounted () {
    const vm = this

    const walletIndex = vm.$store.getters['global/getWalletIndex']
    const name = vm.$store.getters['global/getVault'][walletIndex].name
    vm.walletName = name !== '' ? name : `Personal Wallet #${walletIndex + 1}`
  }
}
</script>

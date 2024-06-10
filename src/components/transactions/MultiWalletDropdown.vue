<template>
  <!-- TODO add truncate of name if name is too long -->
  <!-- either add ellipsis or wrap the text -->
  <q-btn-dropdown
    flat
    class="full-width"
    align="between"
    :label="walletNameLabel"
    :auto-close="false"
  >
    <MultiWallet @update-wallet-name="onUpdateWalletName" />
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
      walletNameLabel: ''
    }
  },

  computed: {
    walletName () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      return this.$store.getters['global/getVault'][walletIndex].name
    }
  },

  methods: {
    onUpdateWalletName (name) {
      this.walletNameLabel = name
    }
  },

  mounted () {
    const vm = this

    const walletIndex = vm.$store.getters['global/getWalletIndex']
    const name = vm.walletName
    vm.walletNameLabel = name !== '' ? name : `Personal Wallet #${walletIndex + 1}`
  }
}
</script>

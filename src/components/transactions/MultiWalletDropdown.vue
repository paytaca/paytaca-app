<template>
  <q-btn-dropdown
    flat
    class="full-width"
    align="between"
    :auto-close="false"
    :style="{color: darkMode ? 'white' : 'black'}"
  >
    <template v-slot:label>
      <span
        class="text-bold text-h6 wallet-name-label"
        :class="!darkMode && isNotDefaultTheme(theme) ? 'text-black' : 'text-grad'"
      >
        {{ walletNameLabel }}
      </span>
    </template>

    <MultiWallet @update-wallet-name="onUpdateWalletName" />
  </q-btn-dropdown>
</template>

<script>
import MultiWallet from 'src/components/multi-wallet/index'
import { isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'MultiWalletDropdown',

  components: {
    MultiWallet
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    walletIndex() {
      return this.$store.getters['global/getWalletIndex']
    },
    walletName () {
      return this.$store.getters['global/getVault'][this.walletIndex].name
    },
    walletNameLabel() {
      if (this.walletName) return this.walletName
      const walletIndex = this.$store.getters['global/getWalletIndex']
      return `Personal Wallet #${walletIndex + 1}`
    }
  },

  methods: {
    isNotDefaultTheme,
    onUpdateWalletName (name) {
      this.walletNameLabel = name
    }
  },

  mounted() {
    this.$store.dispatch(
      'global/syncWalletName',
      { walletIndex: this.walletIndex }
    )
  }
}
</script>

<style scoped>
.wallet-name-label {
  overflow-wrap: break-word;
  text-wrap: wrap;
}
</style>

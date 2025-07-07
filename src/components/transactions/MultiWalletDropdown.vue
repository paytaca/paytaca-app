<template>
  <q-btn
    flat
    :class="isMobile ? 'col-10' : 'col-12'"
    align="left"
    @click="showMultiWalletDialog"
  >
    <template v-slot:default>
      <div class="row">
        <q-icon
          :name="arrowIcon"
          class="col-1 text-bow"
          :class="getDarkModeClass(darkMode)"
        />
        <span
          class="text-bold text-h6 wallet-name-label col-11"
          :class="!darkMode && isNotDefaultTheme(theme) ? 'text-black' : 'text-grad'"
        >
          {{ walletNameLabel }}
        </span>
      </div>
    </template>

  </q-btn>

  <MultiWallet
    ref="multi-wallet-parent"
    @dialog-hide="onDialogHide"
  />
</template>

<script>
import MultiWallet from 'src/components/multi-wallet/index'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'MultiWalletDropdown',

  components: {
    MultiWallet
  },

  data () {
    return {
      arrowIcon: 'arrow_drop_down',
      isShow: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    walletIndex () {
      return this.$store.getters['global/getWalletIndex']
    },
    walletName () {
      return this.$store.getters['global/getVault'][this.walletIndex]?.name
    },
    walletNameLabel () {
      if (this.walletName) return this.walletName
      const walletIndex = this.$store.getters['global/getWalletIndex']
      return `Personal Wallet #${walletIndex + 1}`
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    showMultiWalletDialog () {
      if (!this.isShow) {
        this.$refs['multi-wallet-parent'].$refs['multi-wallet'].show()
        this.arrowIcon = 'arrow_drop_up'
        this.isShow = true
      } else {
        this.$refs['multi-wallet-parent'].$refs['multi-wallet'].hide()
        this.isShow = false
        this.arrowIcon = 'arrow_drop_down'
      }
    },
    onDialogHide () {
      this.isShow = false
      this.arrowIcon = 'arrow_drop_down'
    }
  },

  // Commented out due to redundant api call done inside child component `MultiWallet`
  // mounted () {
  //   this.$store.dispatch(
  //     'global/syncWalletName',
  //     { walletIndex: this.walletIndex }
  //   )
  // }
}
</script>

<style scoped>
.wallet-name-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

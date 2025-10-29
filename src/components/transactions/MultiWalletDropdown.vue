<template>
  <q-btn
    flat
    ref="walletButton"
    :class="isMobile && !isChipnet ? 'col-10' : 'col-12'"
    align="left"
    @click="showMultiWalletDialog"
  >
    <template v-slot:default>
      <div class="row">
        <q-icon
          name="keyboard_double_arrow_right"
          class="col-1 text-bow"
          :class="getDarkModeClass(darkMode)"
        />
        <span
          class="text-bold text-h6 wallet-name-label col-11 text-grad"
          ref="walletLabel"
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'MultiWalletDropdown',

  components: {
    MultiWallet
  },

  data () {
    return {
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
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    }
  },

  methods: {
    getDarkModeClass,
    showMultiWalletDialog () {
      if (this.isShow) {
        this.$refs['multi-wallet-parent'].$refs['multi-wallet'].hide()
        this.isShow = true
      } else {
        this.$refs['multi-wallet-parent'].$refs['multi-wallet'].show()
        this.isShow = false
      }
    },
    onDialogHide () {
      this.isShow = false
    }
  },

  mounted () {
    const buttonEl = this.$refs.walletButton.$el
    const labelEl = this.$refs.walletLabel
    labelEl.style.maxWidth = `${Math.floor(buttonEl.clientWidth * 0.9)}px`
  }
}
</script>

<style scoped>
.wallet-name-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

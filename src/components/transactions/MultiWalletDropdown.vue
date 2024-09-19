<template>
  <!-- <q-btn-dropdown
    flat
    class="full-width"
    align="left"
    :auto-close="false"
    dropdown-icon="none"
    :style="{color: darkMode ? 'white' : 'black'}"
    @before-show="arrowIcon = 'arrow_drop_up'"
    @before-hide="arrowIcon = 'arrow_drop_down'"
  >
    <template v-slot:label>
      <q-icon :name="arrowIcon" />
      <span
        class="q-ml-sm text-bold text-h6 wallet-name-label"
        :class="!darkMode && isNotDefaultTheme(theme) ? 'text-black' : 'text-grad'"
      >
        {{ walletNameLabel }}
      </span>
    </template>

    <MultiWallet @update-wallet-name="onUpdateWalletName" />
  </q-btn-dropdown> -->
  <q-btn
    flat
    class="col-10"
    align="left"
    @click="showMultiWalletDialog"
  >
    <template v-slot:default>
      <div class="row">
        <q-icon :name="arrowIcon" class="col-1" />
        <span
          class="text-bold text-h6 wallet-name-label col-11"
          :class="!darkMode && isNotDefaultTheme(theme) ? 'text-black' : 'text-grad'"
        >
          {{ walletNameLabel }}
        </span>
      </div>
    </template>

  </q-btn>
  <q-btn
    flat
    class="col-2"
    align="right"
    icon="notifications"
  />

  <MultiWallet ref="multi-wallet-parent" @update-wallet-name="onUpdateWalletName" />
</template>

<script>
import MultiWallet from 'src/components/multi-wallet/index'
import { isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'MultiWalletDropdown',

  components: {
    MultiWallet
  },

  data () {
    return {
      walletNameLabel: '',
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
    walletName () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      return this.$store.getters['global/getVault'][walletIndex].name
    }
  },

  methods: {
    isNotDefaultTheme,
    onUpdateWalletName (name) {
      this.walletNameLabel = name
    },
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

<style scoped>
.wallet-name-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

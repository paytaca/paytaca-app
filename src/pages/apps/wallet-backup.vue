<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)" style="margin-top: 84px;">
    <header-nav :title="$t('WalletBackup')" class="apps-header" />

    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <div class="col-12 q-px-lg q-mt-lg">
        <p class="section-title">{{ $t('MnemonicBackupPhrase') }}</p>
        <q-list bordered separator class="list pt-card" :class="getDarkModeClass(darkMode)" style="padding: 5px 0;">
          <q-item clickable @click="toggleBackupTypeDialog('seedphrase')">
            <q-item-section class="text-bow" :class="getDarkModeClass(darkMode)">
              <q-item-label class="text-center">{{ $t('ClickToReveal') }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div class="col-12 q-px-lg q-mt-md">
        <p class="section-title">{{ $t('SeedPhraseShards') }}</p>
        <q-list bordered separator class="list pt-card" :class="getDarkModeClass(darkMode)" style="padding: 5px 0;">
          <q-item clickable @click="toggleBackupTypeDialog('shard')">
            <q-item-section class="text-bow" :class="getDarkModeClass(darkMode)">
              <q-item-label class="text-center">{{ $t('ClickToReveal') }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from 'src/components/header-nav'
import SeedPhraseDialog from 'src/components/wallet-info/SeedPhraseDialog'
import ShardsDialog from 'src/components/wallet-info/ShardsDialog'

import { getMnemonic } from 'src/wallet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'app-wallet-backup',

  components: {
    HeaderNav,
    // eslint-disable-next-line vue/no-unused-components
    SeedPhraseDialog,
    // eslint-disable-next-line vue/no-unused-components
    ShardsDialog
  },

  data () {
    return {
      mnemonic: ''
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    toggleBackupTypeDialog (backupType) {
      const vm = this

      if (backupType === 'seedphrase') {
        vm.$q.dialog({
          component: SeedPhraseDialog,
          componentProps: { mnemonic: vm.mnemonic }
        })
      } else if (backupType === 'shard') {
        vm.$q.dialog({
          component: ShardsDialog,
          componentProps: {
            mnemonic: vm.mnemonic,
            walletHash: vm.$store.getters['global/getWallet']('bch').walletHash
          }
        })
      }
    }
  },

  created () {
    const vm = this
    getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
      vm.mnemonic = mnemonic
    })
  }
}
</script>

<style scoped>
  .section-title {
    font-size: 18px;
    margin-left: 10px;
    color: #ed5f59;
    font-weight: 400;
  }
  .list {
    background-color: #fff;
    border-radius: 12px;
    z-index: 1 !important;
  }
</style>

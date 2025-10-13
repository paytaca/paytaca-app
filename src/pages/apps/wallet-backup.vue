<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('WalletBackup')" backnavpath="/apps" class="apps-header" />

    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <div class="col-12 q-px-lg q-mt-xl">
        <p class="section-title">{{ $t('MnemonicBackupPhrase') }}</p>
        <q-list bordered separator class="list pt-card" :class="getDarkModeClass(darkMode)" style="padding: 5px 0;">
          <q-item clickable @click="toggleBackupTypeDialog('seedphrase')">
            <q-item-section class="text-bow" :class="getDarkModeClass(darkMode)">
              <q-item-label class="list-text text-center">{{ $t('ClickToReveal') }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div class="col-12 q-px-lg q-mt-md">
        <p class="section-title">{{ $t('SeedPhraseShards') }}</p>
        <q-list bordered separator class="list pt-card" :class="getDarkModeClass(darkMode)" style="padding: 5px 0;">
          <q-item clickable @click="toggleBackupTypeDialog('shard')">
            <q-item-section class="text-bow" :class="getDarkModeClass(darkMode)">
              <q-item-label class="list-text text-center">{{ $t('ClickToReveal') }}</q-item-label>
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

<style lang="scss" scoped>
  .section-title {
    font-size: 18px;
    margin-left: 10px;
    color: #ed5f59;
    font-weight: 400;
  }
  .pt-card {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .list {
    .q-item {
      padding: 16px 20px;
      min-height: 64px;
      
      &:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      &.dark:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
    }

    :deep(.q-item__label--caption) {
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1.3;
      font-size: 13px;
    }
  }
  .list-text {
    font-weight: 400;
    font-size: 15px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
</style>

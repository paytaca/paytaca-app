<template>
    <div class="static-container">
      <div id="app-container" :class="getDarkModeClass(darkMode)">
        <HeaderNav
          :title="$t('Multisig Wallet')"
          backnavpath="/apps"
          class="q-px-sm apps-header gift-app-header"
        />
        <div class="row q-gutter-y-sm">
            <div class="col-xs-12 text-right q-px-sm q-gutter-x-sm">
                <q-btn
                  no-caps
                  icon="add"
                  color="primary"
                  :label="$t('Create Wallet')"
                  class="button"
                  :to="{ name: 'app-multisig-create-wallet'}"
                />
                <q-btn
                  no-caps
                  icon="qr_code_2"
                  color="primary"
                  :label="$t('QR Code')"
                  class="button"
                  :to="{ name: 'app-multisig-view-xpubkey-qrcode'}"
                />
            </div>
            <div class="col-xs-12 q-px-sm q-gutter-x-sm">
              {{ wallets }}
            </div>
        </div>
        <!-- display created wallets  -->
       </div>
      </div>
  </template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
const $store = useStore()
const { t: $t } = useI18n()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallets = computed(() => {
  return $store.getters['multisig/getWallets']
})

</script>

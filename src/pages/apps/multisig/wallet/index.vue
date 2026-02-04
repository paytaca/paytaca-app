<template>
    <div class="static-container">
      <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
        <HeaderNav
          :title="$t('MultisigWallet')"
          backnavpath="/apps"
          class="q-px-sm apps-header gift-app-header"
        />
        <div class="row q-gutter-y-sm">
            <div class="col-xs-12 text-right q-px-sm q-gutter-x-sm">
                <q-btn
                  no-caps
                  icon="add"
                  color="primary"
                  :label="$t('CreateWallet')"
                  class="button"
                  :to="{ name: 'app-multisig-wallet-create'}"
                />
                <q-btn
                  no-caps
                  icon="add"
                  color="primary"
                  :label="$t('DeleteAllWallets')"
                  class="button"
                  @click="deleteAllWallets"
                />
                <q-btn
                  no-caps
                  icon="qr_code_2"
                  color="primary"
                  :label="$t('QRCode')"
                  class="button"
                  :to="{ name: 'app-multisig-signer-qrcode'}"
                />
            </div>
            <div class="col-xs-12 q-px-sm q-gutter-x-sm">
              <q-list v-if="wallets" bordered>
                <q-item v-for="wallet, i in wallets" :key="i" clickable :to="{ name: 'app-multisig-wallet-view', params: { address: wallet.address } }">
                  <q-item-section>
                    <q-item-label>{{ wallet.template.name }}</q-item-label>
                    <q-item-label caption lines="2">
                      <span v-for="signer, ii in Object.values(wallet.signers)" :key="`signer-${ii}`">
                        {{ signer.name }}
                      </span>
                    </q-item-label>
                    <q-item-label>
                      {{ wallet.address }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side top>
                    <q-btn icon="delete" @click.stop="(e) => { e.preventDefault(); deleteWallet(wallet.address) }" color="secondary"></q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
        </div>
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

const deleteWallet = (address) => {
  $store.dispatch('multisig/deleteWallet', { address })
}

const deleteAllWallets = () => {
  $store.dispatch('multisig/deleteAllWallets')
}

</script>

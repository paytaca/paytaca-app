<template>
  <div class="static-container">
    <div id="app-container" class="sticky-header-container text-bow multisig-app" :class="getDarkModeClass(darkMode)">
      <HeaderNav
          :title="$t('MultisigWallets', {}, 'Multisig Wallets')"
          backnavpath="/apps"
          class="header-nav q-px-sm apps-header gift-app-header"
        >
      </HeaderNav>
      <div class="row justify-center">
        <div class="col-xs-12">
          <q-card id="bch-card" class="q-ma-md" style="border-radius: 15px; color:white">
            <div class="q-mt-md q-mx-md">
              <div class="flex items-center q-gutter-x-sm">
                <q-icon name="groups" size="sm"></q-icon>
                <div class="text-bold text-h6">{{ $t('PaytacaMultisigWallets', {}, 'Paytaca Multisig Wallets') }}</div>
              </div>
              <div class="flex justify-start items-center q-gutter-x-sm">
                  <span class="text-bold">{{$t('WalletCount')}}: {{ multisigWallets?.length || 0 }}</span>
                </div>  
            </div>
            <q-card-section class="row items-center justify-between">
              <div class="col-xs-12  text-subtitle2">
                <q-icon name="warning" color="warning" size="xs" class="q-mr-xs"></q-icon>
                {{ $t('MultisigWalletsBetaDisclaimerMessage') }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div v-if="multisigWallets && multisigWallets.length > 0" class="col-12 row justify-between">
          <q-btn flat dense no-caps class="col-4 tile shrink-0" @click="onCreateWalletClick">
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="add" class="col-12" color="primary" size="md"></q-icon>
                <div class="col-12 tile-label">{{ $t('CreateWallet') }}</div>
              </div>
            </template>
          </q-btn>
          <q-btn flat dense no-caps class="col-4 tile shrink-0" @click="onImportWalletClick">
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="mdi-file-import-outline" class="col-12" color="primary" size="md"></q-icon>
                <div class="col-12 tile-label">{{ $t('ImportWallet') }}</div>
              </div>
            </template>
          </q-btn>
          <q-btn flat dense no-caps class="col-4 tile shrink-0" @click="onDeleteAllWalletsClick" >
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="mdi-delete-sweep-outline" class="col-12" color="red" size="md"></q-icon>
                <div class="col-12 tile-label">{{ $t('DeleteAllWallets') }}</div>
              </div>
            </template>
          </q-btn>
        </div>
      </div>
      <div v-if="multisigWallets && multisigWallets.length > 0" class="row justify-center q-my-lg">
          <div class="col-xs-12 q-px-md">
            <q-list class="rounded-borders" :class="getDarkModeClass(darkMode)" separator>
              <q-item-label header class="text-h6">{{ $t('MyWallets') }}</q-item-label>
              <q-separator></q-separator>
              <q-item
                v-for="wallet, i in multisigWallets"
                :key="i"
                clickable
                v-ripple
                class="q-py-md"
                @click="router.push({ name: 'app-multisig-wallet-view', params: { wallethash: wallet.getWalletHash() } })"
              >
                <q-item-section avatar top>
                  <q-avatar color="primary" text-color="white" size="5rem" square class="br-15">
                    <q-icon name="wallet"></q-icon>
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>
                    <div class="ellipsis text-h6 text-bold">{{ wallet.name }}</div>
                  </q-item-label>
                  <q-item-label caption>
                    <div class="flex no-wrap items-center q-gutter-x-sm">
                      <q-icon name="mdi-pound-box"></q-icon><span>{{ shortenString(wallet.walletHash, 20) }}</span>
                    </div>
                  </q-item-label>
                  <q-item-label v-if="wallet.id" caption>
                    <div class="flex items-center q-gutter-x-sm">
                      <q-icon name="mdi-cloud-check"></q-icon><span>{{ wallet.id }}</span>
                    </div>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="chevron_right" color="primary"></q-icon>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
      </div>
      <div v-else class="row justify-center q-mt-lg">
          <div class="col-xs-12 q-px-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-card
                  flat
                  class="action-card cursor-pointer"
                  :class="getDarkModeClass(darkMode)"
                  @click="onCreateWalletClick"
                >
                  <q-card-section class="text-center q-pa-lg">
                    <q-avatar color="primary" text-color="white" size="56px" class="q-mb-md">
                      <q-icon name="add" size="32px"></q-icon>
                    </q-avatar>
                    <div class="text-h6 text-weight-bold q-mb-sm">{{ $t('CreateNewWallet') }}</div>
                    <div class="text-body2 text-bow-muted">{{ $t('CreateNewWalletDescription', {}, 'Setup a new multisig wallet') }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-sm-6">
                <q-card
                  flat
                  class="action-card cursor-pointer"
                  :class="getDarkModeClass(darkMode)"
                  @click="onImportWalletClick"
                >
                  <q-card-section class="text-center q-pa-lg">
                    <q-avatar color="primary" text-color="white" size="56px" class="q-mb-md">
                      <q-icon name="mdi-file-import-outline" size="32px"></q-icon>
                    </q-avatar>
                    <div class="text-h6 text-weight-bold q-mb-sm">{{ $t('ImportWallet') }}</div>
                    <div class="text-body2 text-bow-muted">{{ $t('ImportWalletDescripition', {}, 'Import a multisig wallet setup') }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
      </div>
      <q-file
        ref="walletFileElementRef"
        v-model="walletFileModel"
        :multiple="false"
        style="visibility: hidden"
        @update:model-value="onUpdateWalletFileModelValue">
      </q-file>
      <!-- display created wallets  -->
    </div>
  </div>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { MultisigWallet } from 'src/lib/multisig'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { useTieredLimitGate } from 'src/composables/useTieredLimitGate'
import { shortenString } from 'src/lib/multisig/utils'
const $store = useStore()
const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const { t: $t } = useI18n()
const {
  multisigWallets,
} = useMultisigHelpers()
const { ensureCanPerformAction } = useTieredLimitGate()

const walletFileElementRef = ref()
const walletFileModel = ref()
const walletInstance = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const onCreateWalletClick = async () => {
  const allowed = await ensureCanPerformAction('multisigWallets', { darkMode: darkMode.value })
  if (!allowed) return
  router.push({ name: 'app-multisig-wallet-create' })
}

const onImportWalletClick = async () => {
  const allowed = await ensureCanPerformAction('multisigWallets', { darkMode: darkMode.value })
  if (!allowed) return
  importWallet()
}

const onDeleteAllWalletsClick = async () => {
  $q.dialog({
    message: $t('AreYouSureDeleteAllWallets'),
    ok: { 
      label: $t('Yes'),
      color: 'primary',
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)}`,
    },
    cancel: { 
      label: $t('No'),
      color: 'default',
      outline: true,
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)} `,
    },
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1`,
  }).onOk(() => {
    $store.commit('multisig/deleteAllWallets')
  })
}

const importWallet = () => {
  router.push({ name: 'app-multisig-wallet-import' })
}

const onUpdateWalletFileModelValue = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      walletInstance.value = MultisigWallet.fromBase64(reader.result, {
        store: $store
      })
      walletInstance.value.save({ sync: false })
      // $store.dispatch('multisig/createWallet', walletInstance.value)
      router.push({
        name: 'app-multisig-wallet-view',
        params: { wallethash: walletInstance.value.getWalletHash() }
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}


// Check for importData in query params when component mounts
onMounted(async () => {
  const importData = route.query.importData
  if (importData) {
    // Handle multi-part QR codes if needed
    const part = route.query.part
    const total = route.query.total
    
    if (part && total && parseInt(total) > 1) {
      // Multi-part handling - you'd need to collect all parts
      console.log(`Multi-part QR: part ${part} of ${total}`)
      // For now, just import the single part
    }
    
    // Import the wallet from base64 data
    try {
      walletInstance.value = MultisigWallet.fromBase64(importData, {
        store: $store
      })
      walletInstance.value.save({ sync: false })
      router.push({
        name: 'app-multisig-wallet-view',
        params: { wallethash: walletInstance.value.getWalletHash() }
      })
    } catch (error) {
      console.error('Error importing wallet from QR:', error)
      $q.notify({
        message: $t('FailedToImportWalletFromQR'),
        color: 'red'
      })
    }
  }
})
</script>

<style lang="scss" scoped>
.action-card {
  border-radius: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &.light {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

</style>

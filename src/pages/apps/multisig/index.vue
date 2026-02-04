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
          <q-banner class="q-ma-lg rounded text-caption text-justify q-pa-md" :class="getDarkModeClass(darkMode)" style="word-break: auto-phrase; border-radius: 15px;">
            <q-icon name="warning" color="warning" size="sm" class="q-mr-sm"></q-icon>
            {{ $t('MultisigWalletsBetaDisclaimerMessage') }}
          </q-banner>
        </div>
      </div>
      <div v-if="multisigWallets && multisigWallets.length > 0" class="row justify-center q-mb-lg">
          <div class="col-xs-12 q-px-xs q-gutter-y-sm">
            <div v-if="multisigWallets" class="q-mb-sm">
              <div class="row justify-end q-gutter-x-sm q-mb-md">
                <q-btn color="primary" icon="add" @click="onCreateWalletClick" round dense outline></q-btn>
                <q-btn color="primary" icon="download" @click="onImportWalletClick" round dense outline></q-btn>
                <q-btn color="red" icon="mdi-delete-sweep-outline" @click="onDeleteAllWalletsClick" round dense outline></q-btn>
              </div>
            </div>
            <q-card
              v-for="wallet, i in multisigWallets"
              :key="i"
              flat
              class="q-mb-sm multisig-wallet-card"
              :class="`${getDarkModeClass(darkMode)} ${$q.screen.gt.xs ? 'q-mx-lg': ''}`"
              clickable
              @click="router.push({ name: 'app-multisig-wallet-view', params: { wallethash: wallet.getWalletHash() } })"
            >
              <q-card-section class="q-pa-md">
                <div class="flex items-center q-mb-sm">
                  <q-icon name="wallet" color="grad" size="md" class="q-mr-sm"></q-icon>
                  <div class="text-weight-bold text-h6">{{ wallet.name }}</div>
                </div>
                <div class="flex items-center q-ml-md text-caption">
                  <q-icon name="group" class="q-mr-sm" size="xs"></q-icon>
                  <div class="text-caption">
                    <span v-for="(signer, signerIndex) in wallet?.signers" :key="`signer-${i}-${signerIndex}`">
                      {{ signer.name }}<span v-if="signerIndex < wallet.signers.length - 1">, </span>
                    </span>
                  </div>
                </div>
                <div v-if="wallet.id" class="flex items-center q-ml-md text-caption">
                  <q-icon name="mdi-identifier" class="q-mr-sm" size="xs"></q-icon>
                  <div class="text-caption">
                    <span>
                      {{wallet.id}}
                    </span>
                  </div>
                </div>
                <div class="flex items-center q-ml-md text-caption">
                  <div>Wallet Hash: {{ shortenString(wallet.walletHash, 20) }}</div>
                </div>
              </q-card-section>
            </q-card>
          </div>
      </div>
      <div v-else class="row justify-center items-center q-mt-lg">
          <!-- <div class="col-10 text-center q-gutter-lg">
            <div class="text-h6 text-bow-muted">No Multisig Wallet Found</div>
            <div>
            <q-btn
              no-caps
              icon="mdi-wallet-plus-outline"
              :to="{ name: 'app-multisig-wallet-create'}"
              dense
              size="lg"
              label="Create Wallet"
              color="primary"
            />
            </div>
          <div>
            <q-btn
              no-caps
              icon="mdi-wallet-plus"
              dense
              size="lg"
              label="Import Wallet"
              @click="importWallet"
              color="primary"
            />
          </div>
          </div> -->
          <div class="col-xs-12 row justify-center q-gutter-y-xl">
            <div class="col-xs-12 text-center">
              <q-btn @click="onCreateWalletClick" color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
                <q-icon class="default-text-color" name="qr_code" />
              </q-btn>
              <div class="q-pt-xs text-h6 text-center text-capitalize" >{{ $t('CreateNewWallet') }}</div>
              <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('CreateNewWalletDescription', {}, `Setup a new multisig wallet`) }}</div>
            </div>
            <div class="col-xs-12 text-center">
              <q-btn color="primary" class="button-default" @click="onImportWalletClick" :class="darkMode ? 'dark' : 'light'" round>
                <q-icon class="default-text-color" name="download" />
              </q-btn>
              <div class="q-pt-xs text-h6 text-center text-capitalize" >{{ $t('ImportWallet') }}</div>
              <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('ImportWalletDescripition', {}, `Import a multisig wallet setup/config from different sources`) }}</div>
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
.multisig-wallet-card {
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 16px;
  box-shadow: none !important;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.7);
    border-color: rgba(0, 0, 0, 0.16);
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }
  
  &:active {
    background-color: rgba(255, 255, 255, 0.65);
    border-color: rgba(0, 0, 0, 0.14);
    
    &.dark {
      background-color: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.18);
    }
  }
}
</style>

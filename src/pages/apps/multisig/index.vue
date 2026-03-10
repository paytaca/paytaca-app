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
                  <span class="text-bold">Count: {{ multisigWallets?.length || 0 }}</span>
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
        <div class="col-xs-12 flex justify-between">
          <q-btn flat dense no-caps class="tile" @click="onCreateWalletClick">
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="add" class="col-12" color="primary" size="md"></q-icon>
                <div class="col-12 tile-label">{{ $t('Create') }}</div>
              </div>
            </template>
          </q-btn>
          <q-btn flat dense no-caps class="tile" @click="onImportWalletClick">
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="mdi-file-import-outline" class="col-12" color="primary" size="md"></q-icon>
                <div class="col-12 tile-label">{{ $t('Import') }}</div>
              </div>
            </template>
          </q-btn>
          <q-btn flat dense no-caps class="tile" @click="onDeleteAllWalletsClick" v-if="multisigWallets && multisigWallets.length > 0">
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="mdi-delete-sweep-outline" class="col-12" color="red" size="md"></q-icon>
                <div class="col-12 tile-label">{{ $t('DeleteAll') }}</div>
              </div>
            </template>
          </q-btn>
          <div v-else class="tile-placeholder"></div>
        </div>
      </div>
      <div v-if="multisigWallets && multisigWallets.length > 0" class="row justify-center q-my-lg">
          <div class="col-xs-12 q-px-md">
            <q-list class="rounded-borders" :class="getDarkModeClass(darkMode)" separator>
              <q-item-label header>{{ $t('WalletList') }}</q-item-label>
              <q-separator></q-separator>
              <q-item
                v-for="wallet, i in multisigWallets"
                :key="i"
                clickable
                v-ripple
                class="q-py-md"
                @click="router.push({ name: 'app-multisig-wallet-view', params: { wallethash: wallet.getWalletHash() } })"
              >
                <q-item-section>
                  <q-item-label class="flex items-center q-gutter-x-md text-weight-bold">
                    <q-avatar color="primary" text-color="white" size="md">
                      <q-icon name="wallet"></q-icon>
                    </q-avatar>
                    <div class="ellipsis text-h6 text-bold">{{ wallet.name }}</div>
                  </q-item-label>
                  <q-item-label caption class="flex items-center q-gutter-x-sm q-my-xs text-bow-muted" v-if="wallet.id">
                    <div>ID:</div><q-icon name="mdi-cloud-check" size="xs" class="q-mr-xs"></q-icon> <div>{{ wallet.id }}</div>
                  </q-item-label>
                  <q-item-label caption class="text-bow-muted">
                    Hash: {{ shortenString(wallet.walletHash, 20) }}
                  </q-item-label>
                  <q-item-label caption>
                    <div class="flex items-center q-my-xs q-gutter-x-xs">
                      <div>Signers:</div>
                      <q-icon name="group" size="xs" class="text-bow-muted"></q-icon>
                      <q-chip
                        v-for="(signer, signerIndex) in wallet?.signers?.slice(0, 3)"
                        :key="`signer-${i}-${signerIndex}`"
                        dense
                        size="sm"
                        class="q-ma-none"
                      >
                        {{ signer.name }}
                      </q-chip>
                      <span v-if="wallet?.signers?.length > 3" class="text-bow-muted">
                        +{{ wallet.signers.length - 3 }} more
                      </span>
                    </div>
                  </q-item-label>
                  
                  <q-item-label caption class="flex items-center q-gutter-x-sm q-my-xs">
                    <div>Required Signatures: </div>
                    <q-badge color="primary">{{ wallet.m }} of {{ wallet.signers?.length }}</q-badge>
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-btn icon="mdi-open-in-app" rounded outline no-caps>Open</q-btn>
                </q-item-section>
              </q-item>
            </q-list>
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
                <q-icon class="default-text-color" name="mdi-file-import-outline" />
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
.tile-placeholder {
  width: 80px;
}
</style>

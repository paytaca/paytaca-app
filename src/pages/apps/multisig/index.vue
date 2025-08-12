<template>
  <div class="static-container">
    <div id="app-container" :class="getDarkModeClass(darkMode)" class="text-bow">
      <HeaderNav
        :title="$t('Multisig Wallets')"
        backnavpath="/apps"
        class="q-px-sm apps-header gift-app-header"
      >
    </HeaderNav>
      <div v-if="multisigWallets && multisigWallets.length > 0" class="row justify-center">
          <div class="col-xs-12 q-px-xs q-gutter-y-sm">
            <q-list v-if="multisigWallets" separator :class="getDarkModeClass(darkMode)">
              <q-item>
                <q-item-section></q-item-section>
                <q-item-section side top>
                  <q-btn
                    no-caps
                    icon="more_vert"
                    flat
                    dense
                    size="md"
                    @click="openMainActionsDialog"
                  />
                </q-item-section>
              </q-item>
              <q-separator inset />
              <q-item
                v-for="wallet, i in multisigWallets"
                :key="i"
                :to="{ name: 'app-multisig-wallet-view', params: { wallethash: wallet.getWalletHash() } }"
                class="q-py-md"
                clickable
                >
                <q-item-section>
                  <q-item-label class="text-weight-bold flex items-center">
                    <q-icon name="mdi-wallet-outline" color="grad" class="q-mr-sm"></q-icon><span>{{ wallet.name }}</span>
                  </q-item-label>
                  <q-item-label caption class="text-subtitle1">
                    {{ shortenAddressForDisplay(wallet.getDepositAddress(0).address) }}
                  </q-item-label>
                  <q-item-label caption lines="2" class="text-subtitle1">
                    <div class="flex items-center">
                      <q-icon name="group" class="q-mr-sm"></q-icon>
                      <span v-for="signer,i in wallet.signers" :key="`signer-${signerEntityKey}`" class="q-mr-xs">
                        {{signer.name}} {{ i < wallet.signers.length - 1? ',' : ''}}
                      </span>
                    </div>
                  </q-item-label>
                </q-item-section>
                <!--q-item-section side top>
                  <q-btn
                    icon="close"
                    @click.stop="(e) => { e.preventDefault(); deleteWallet(wallet.address) }"
                    flat
                    dense
                  >
                  </q-btn>
                </q-item-section-->
              </q-item>
            </q-list>
          </div>
      </div>
      <div v-else class="row justify-center items-center" style="height: 80vh">
        <div class="col-10 text-center q-gutter-lg">
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
        /></div></div>
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { shortenString, importMultisigWallet, getMultisigCashAddress, MultisigWallet } from 'src/lib/multisig'
import HeaderNav from 'components/header-nav'
import ImportWalletDialog from 'components/multisig/ImportWalletDialog.vue'
import MainActionsDialog from 'components/multisig/MainActionsDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
const $store = useStore()
const $q = useQuasar()
const router = useRouter()
const { t: $t } = useI18n()
const {
  multisigWallets,
  cashAddressNetworkPrefix
} = useMultisigHelpers()

const walletFileElementRef = ref()
const walletFileModel = ref()
const walletInstance = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

// const wallets = computed(() => {
//   return MultisigWallet.createInstanceFromObjects($store.getters['multisig/getWallets'])
// })

const importWallet = () => {
  $q.dialog({
    component: ImportWalletDialog,
    componentProps: {
      darkMode: darkMode.value,
      onImportFromFile: () => walletFileElementRef.value.pickFiles(),
      onImportFromServer: async () => {
        router.push({ name: 'app-multisig-wallets-synced' })
      }
    }
  })
}

const openMainActionsDialog = () => {
  $q.dialog({
    component: MainActionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      onCreateWallet: () => {
        router.push({ name: 'app-multisig-wallet-create' })
      },
      onImportWallet: async () => {
        importWallet()
      }
    }
  })
}

const onUpdateWalletFileModelValue = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      walletInstance.value = MultisigWallet.importFromBase64(reader.result)
      // const defaultAddress = getMultisigCashAddress({
      //   lockingData: walletInstance.value.lockingData,
      //   template: walletInstance.value.template,
      //   cashAddressNetworkPrefix: cashAddressNetworkPrefix.value
      // })

      walletInstance.value.save({ sync: true })
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
</script>

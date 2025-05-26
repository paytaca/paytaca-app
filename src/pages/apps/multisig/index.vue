<template>
  <div class="static-container">
    <div id="app-container" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('Multisig Wallets')"
        backnavpath="/apps"
        class="q-px-sm apps-header gift-app-header"
      >
      <!-- <template v-slot:top-right-menu>
        <div class="flex items-center justify-end" >
          <q-btn icon="settings" :to="{ name: 'app-multisig-settings'}" flat style="margin-left: -10px; margin-top: -5px;" size="lg" dense></q-btn>
        </div>
      </template> -->
    </HeaderNav>
      <div v-if="multisigWallets && multisigWallets.length > 0" class="row justify-center">
          <div class="col-xs-12 q-px-xs q-gutter-y-sm">
            <q-list v-if="multisigWallets" separator class="text-bow" :class="getDarkModeClass(darkMode)">
              <q-item>
                <q-item-section></q-item-section>
                <q-item-section side top>
                  <q-btn
                    no-caps
                    icon="mdi-wallet-plus"
                    :to="{ name: 'app-multisig-wallet-create'}"
                    flat
                    dense
                    size="md"
                  />
                </q-item-section>
              </q-item>
              <q-separator inset />
              <q-item
                v-for="wallet, i in multisigWallets"
                :key="i"
                :to="{ name: 'app-multisig-wallet-view', params: { address: wallet.address } }"
                class="q-py-md"
                clickable
                >
                <q-item-section>
                  <q-item-label class="text-h6 text-weight-bold flex items-center">
                    <q-icon name="mdi-wallet-outline" color="grad" class="q-mr-sm"></q-icon><span>{{ wallet.template.name }}</span>
                  </q-item-label>
                  <q-item-label caption class="text-subtitle1">
                    {{ shortenString(wallet.address, 18) }}
                  </q-item-label>
                  <q-item-label caption lines="2" class="text-subtitle1">
                    <span v-for="signerEntityKey in Object.keys(wallet.template.entities)" :key="`signer-${signerEntityKey}`" class="q-mr-sm">
                      {{ signerEntityKey}}: {{ wallet.template.entities[signerEntityKey].name }},
                    </span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    icon="close"
                    @click.stop="(e) => { e.preventDefault(); deleteWallet(wallet.address) }"
                    flat
                    dense
                  >
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
      </div>
      <div v-else class="row justify-center items-center" style="height: 80vh">
        <div class="col-10 text-center q-gutter-lg">
         <div class="text-h6">No Multisig Wallet Found</div>
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
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { Pst, shortenString, MultisigWallet, importMultisigWallet, getMultisigCashAddress } from 'src/lib/multisig'
import HeaderNav from 'components/header-nav'
import ImportWalletDialog from 'components/multisig/ImportWalletDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadLibauthHdWallet } from 'src/wallet'
import { useMultisigHelpers, localWallets } from 'src/composables/multisig/helpers'
const $store = useStore()
const $q = useQuasar()
const router = useRouter()
const { t: $t } = useI18n()
const {
  multisigWallets,
  cashAddressNetworkPrefix,
  saveMultisigWallet
} = useMultisigHelpers()

const pstFileElementRef = ref()
const pstFile = ref()
const pstFromFile = ref()
const pstFromStore = ref()

const walletFileElementRef = ref()
const walletFileModel = ref()
const walletInstance = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

// const wallets = computed(() => {
//   return MultisigWallet.createInstanceFromObjects($store.getters['multisig/getWallets'])
// })

const deleteWallet = (address) => {
  $store.dispatch('multisig/deleteWallet', { address })
}

const deleteAllWallets = () => {
  $store.dispatch('multisig/deleteAllWallets')
}

const loadPstFile = () => {
  console.log('PSTFILE REF', pstFileElementRef.value)
  pstFileElementRef.value.pickFiles()
}

const updatePstFile = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      pstFromFile.value = Pst.createInstanceFromBase64(reader.result)
      const pstObjectFromStore = $store.getters['multisig/getPstById']({ id: pstFromFile.value.id })
      if (pstObjectFromStore) {
        // TODO: ask before combine? redirect to pst compare page
        // TODO: combine with multiple pst files
        pstFromStore.value = Pst.createInstanceFromObject(pstObjectFromStore)
        pstFromStore.value.combine({ psts: [pstFromFile.value] })
        pstFromStore.value.save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
        return router.push({
          name: 'app-multisig-wallet-pst-view',
          params: { address: pstFromStore.value.address, id: pstFromStore.value.id }
        })
      }
      pstFromFile.value.save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
      router.push({
        name: 'app-multisig-wallet-pst-view',
        params: { address: pstFromFile.value.address, id: pstFromFile.value.id }
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}

const importWallet = () => {
  
  $q.dialog({
    component: ImportWalletDialog,
    componentProps: {
      darkMode: darkMode.value,
      onImportFromFile: () => walletFileElementRef.value.pickFiles(),
      onImportFromServer: () => console.log('Importing from server')
    }
  })
 // walletFileElementRef.value.pickFiles()
}

const onUpdateWalletFileModelValue = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      walletInstance.value = importMultisigWallet(reader.result)
      const defaultAddress = getMultisigCashAddress({
        lockingData: walletInstance.value.lockingData,
        template: walletInstance.value.template,
        cashAddressNetworkPrefix: cashAddressNetworkPrefix.value
      })
      saveMultisigWallet(walletInstance.value)
      router.push({
        name: 'app-multisig-wallet-view',
        params: { address: defaultAddress }
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}

onMounted(async () => {
  // $store.getters['global/getWallet']('bch') = Loads the currently selected wallet from the homepage
  const tempVault = $store.getters['global/getVault']
  console.log('🚀 ~ onMounted ~ tempVault:', tempVault)
  // con:st currentWallet = $store.getters['global/getWallet']('bch')
  // console.log('CURRENT WALLET', currentWallet)
  // const wx = await loadLibauthHdWallet()
  // console.log('🚀 ~ onMounted ~ wx:', wx)
  // const w1 = await loadLibauthHdWallet(0)
  // console.log('🚀 ~ onMounted ~ w1:', w1)
  // const w2 = await loadLibauthHdWallet(1)
  // console.log('🚀 ~ onMounted ~ w2:', w2)
  // const w3 = await loadLibauthHdWallet(2)
  // console.log('🚀 ~ onMounted ~ w3:', w3)
  // console.log('wallets', multisigWallets.value)
})

</script>

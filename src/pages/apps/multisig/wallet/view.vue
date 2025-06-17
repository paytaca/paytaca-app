<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('Wallet Details')"
      backnavpath="/apps/multisig"
      class="apps-header"
    />
    <div class="row justify-center">
      <div class="col-xs-12 q-px-xs">
        <template v-if="wallet">
          <div>
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label class="text-bold">{{ wallet.template.name }}
                  <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                  </q-item-label>
                </q-item-section>
                <q-item-section top side>
                  <q-btn icon="more_vert" @click="openWalletActionsDialog" style="margin-right: -5px" flat dense round></q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Id</q-item-label>
                </q-item-section>
                <q-item-section side>
                 <q-item-label class="flex flex-wrap items-center">
                   <span>{{ shortenString(`${wallet.id}`, 20)}}</span>
                   <q-icon class="q-ml-xs" size="xs" :name="isMultisigWalletSynced(wallet)? 'cloud': 'smartphone'"/> 
                 </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Address - {{ wallet.lockingData?.hdKeys?.addressIndex}}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label >
                    {{ shortenString(route.params.address, 32) }} <CopyButton :text="route.params.address"/>
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                 <q-item-label>Balance</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ balance || 0 }} BCH</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Required Signatures</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ getRequiredSignatures(wallet.template) }} of {{ Object.keys(wallet.template.entities).length }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item v-for="signerEntityKey in Object.keys(wallet.template.entities)" :key="`app-multisig-view-signer-${signerEntityKey}`">
                <q-item-section>
                  <q-item-label class="text-capitalize text-bold" style="font-variant-numeric: proportional-nums">{{signerEntityKey}}. {{ wallet.template.entities[signerEntityKey].name }}</q-item-label>
                  <q-item-label caption >{{ shortenString(wallet.lockingData.hdKeys.hdPublicKeys[signerEntityKey], 20) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption><CopyButton :text="wallet.lockingData.hdKeys.hdPublicKeys[signerEntityKey]"/></q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item
                :clickable="transactions?.length > 0"
                :to="{name: 'app-multisig-wallet-transactions', params: { address: route.params.address}}">
                <q-item-section>
                  <q-item-label style="position:relative">Tx Proposals</q-item-label>
                </q-item-section>
                <q-item-section side>
                     <q-badge color="red" >{{ transactions?.length || 0 }}</q-badge>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
            </q-list>
          </div>
          <div class="flex flex-wrap justify-around q-mt-lg"> 
           <q-btn flat dense no-caps @click="openShareWalletActionsDialog" class="tile" v-close-popup>
            <template v-slot:default>
             <div class="row justify-around">
              <q-icon name="mdi-share-all" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Share Wallet</div>
             </div>
            </template>
           </q-btn>
           <q-btn flat dense no-caps @click="loadTransactionProposal" class="tile" v-close-popup>
             <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="mdi-file-export" class="col-12" color="primary"></q-icon>
                <div class="col-12 tile-label">Import Tx</div>
              </div>
             </template>
           </q-btn>
           <q-btn flat dense no-caps @click="openWalletActionsDialog" class="tile" v-close-popup>
             <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="more_vert" class="col-12" color="primary"></q-icon>
                <div class="col-12 tile-label">More Options</div>
              </div>
             </template>
           </q-btn>
          </div>

        </template>
      </div>
      <q-file
        ref="transactionFileElementRef"
        v-model="transactionFileModel"
        :multiple="false"
        style="visibility: hidden"
        @update:model-value="onUpdateTransactionFile">
      </q-file>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  getRequiredSignatures,
  exportMultisigWallet,
  importPst,
  getLockingBytecode,
  isMultisigWalletSynced,
  generateFilename,
  getWalletHash
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'components/CopyButton.vue'
import Watchtower from 'src/lib/watchtower'
import WalletActionsDialog from 'components/multisig/WalletActionsDialog.vue'
import WalletReceiveDialog from 'components/multisig/WalletReceiveDialog.vue'
import SyncWalletDialog from 'components/multisig/SyncWalletDialog.vue'
import UploadWalletDialog from 'components/multisig/UploadWalletDialog.vue'
import ShareWalletActionsDialog from 'components/multisig/ShareWalletActionsDialog.vue'
import { CashAddressNetworkPrefix, hashTransaction, binToHex } from 'bitauth-libauth-v3'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getMultisigWalletBchBalance, getSignerXPrv, multisigWallets } = useMultisigHelpers()
const balance = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const transactionFileElementRef = ref()
const transactionFileModel = ref()
const transactionInstance = ref()

const wallet = computed(() => {
  return multisigWallets.value?.find((wallet) => {
    return wallet.address === route.params.address
  })
})

const transactions = computed(() => {
  return $store.getters['multisig/getTransactionsByWalletAddress']({ address: route.params.address })
})

const deleteWallet = async (address) => {
  await $store.dispatch('multisig/deleteWallet', { multisigWallet: wallet.value })
  router.push({ name: 'app-multisig' })
}

const exportWallet = () => {
  const data = exportMultisigWallet(wallet.value)
  const blob = new Blob([data], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = generateFilename(wallet.value)
  document.body.appendChild(a)
  a.click()
}

const loadTransactionProposal = () => {
  console.log('transactionFileModel REF', transactionFileElementRef.value)
  transactionFileElementRef.value.pickFiles()
}

const onUpdateTransactionFile = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      transactionInstance.value = importPst({ pst: reader.result })
      const transactionFromStore = $store.getters['multisig/getTransactionByHash']({ hash: hashTransaction(transactionInstance.value.transaction)})
      $store.dispatch('multisig/saveTransaction', transactionInstance.value)
      $store.dispatch('multisig/uploadTransaction', { multisigWallet: wallet.value, multisigTransaction: transactionInstance.value })
      const index = transactions.value?.length - 1
      router.push({
        name: 'app-multisig-wallet-transaction-view',
        params: { address: transactionInstance.value.address, index }
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}

const uploadWallet = () => {
  $q.dialog({
    component: UploadWalletDialog,
    componentProps: {
      multisigWallet: wallet.value,
      darkMode: darkMode.value }
  }).onOk(async() => {
        await $store.dispatch('multisig/uploadWallet', { multisigWallet: wallet.value, address: route.params.address })
  })
}

const openShareWalletActionsDialog = () => {
  $q.dialog({
    component: ShareWalletActionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      onUploadWallet: () => {
        uploadWallet()
      },
      onExportWallet: () => { 
        exportWallet()
      }
    }
  })
}

const openWalletActionsDialog = () => {
  $q.dialog({
    component: WalletActionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      txProposals: transactions?.value,
      onUploadWallet: () => {
        uploadWallet()
      },
      onExportWallet: () => { 
        exportWallet()
      },
      onDeleteWallet: () => {
	$q.dialog({
          message: 'Are you sure you want to delete wallet?',
          ok: { label: 'Yes' },
          cancel: { label: 'No' },
          class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
        }).onOk(() => {
           deleteWallet(route.params.address)
        }).onCancel(() => {
          openWalletActionsDialog()
        })
      },
      onImportTx: () => {
        loadTransactionProposal()
      },
      onViewTxProposals: () => {
        router.push({ name: 'app-multisig-wallet-transactions', params: { address: route.params.address } })
      },
      onCreateTxProposal: () => {
        router.push({ name: 'app-multisig-wallet-transaction-create', params: { address: route.params.address }})
      },
      onReceive: () => { 
        const addressPrefix = $store.getters['global/isChipnet'] ? CashAddressNetworkPrefix.testnet: CashAddressNetworkPrefix.mainnet
	$q.dialog({
          component: WalletReceiveDialog,
          componentProps: {
            darkMode: darkMode.value,
            multisigWallet: wallet.value,
            cashAddressNetworkPrefix: addressPrefix
          }
        }).onOk(() => {
           openWalletActionsDialog()
        })
      }
    }
  })
}

onMounted(async () => {
  try {
    balance.value = await getMultisigWalletBchBalance(
      decodeURIComponent(route.params.address)
    )
    await $store.dispatch('multisig/fetchTransactions', wallet.value )
  } catch (error) {}
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>i

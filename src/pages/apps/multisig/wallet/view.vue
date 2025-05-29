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
                  <q-btn icon="more_vert" @click="openWalletActionsDialog" flat dense>
                 </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
               <q-item-section>
                <q-item-label>Synced</q-item-label> 
               </q-item-section>
               <q-item-section side>
                 <q-item-label class="flex flex-wrap q-gutter-x-sm items-center">
                  <q-chip style="background: inherit; color: inherit" class="q-gutter-sm">
                   <span class="q-mr-sm">{{ !wallet.id ? 'No': 'Yes' }}</span>
                   <!--q-icon v-if="wallet.id" size="xs" :name="wallet.id? 'cloud': 'smartphone'" /--> 
                  </q-chip> 
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
import { shortenString, getRequiredSignatures,  exportMultisigWallet, importPst } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'components/CopyButton.vue'
import Watchtower from 'src/lib/watchtower'
import WalletActionsDialog from 'components/multisig/WalletActionsDialog.vue'
import WalletReceiveDialog from 'components/multisig/WalletReceiveDialog.vue'
import SyncWalletDialog from 'components/multisig/SyncWalletDialog.vue'
import { CashAddressNetworkPrefix, hashTransaction } from 'bitauth-libauth-v3'

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
   if (route.params?.address) {
     return $store.getters['multisig/getTransactionsByWalletAddress']({
       address: route.params.address
     })
   }
  return []
})

const deleteWallet = async (address) => {
  await $store.dispatch('multisig/deleteWallet', { address })
  router.push({ name: 'app-multisig' })
}

const exportWallet = () => {
  const data = exportMultisigWallet(wallet.value)
  const blob = new Blob([data], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${wallet.value.template.name || `${wallet.value.requiredSignatures}-of-${Object.keys(wallet.value.template.entities)}`}.pmwif`
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
    console.log('🚀 ~ onUpdateTransactionFile ~ reader:', reader.result)
    reader.onload = () => {
      transactionInstance.value = importPst({ pst: reader.result })
      const transactionFromStore = $store.getters['multisig/getTransactionByHash']({ hash: hashTransaction(transactionInstance.value.transaction)})
      console.log('tx from store', transactionFromStore)
      // const pstObjectFromStore = $store.getters['multisig/getPstById']({ id: transactionInstance.value.id })
      console.log('🚀 ~ onUpdateTransactionFile ~ transactionInstance:', transactionInstance.value)
      // if (pstObjectFromStore) {
      //   // TODO: ask before combine? redirect to pst compare page
      //   // TODO: combine with multiple pst files
      //   transactionFromStore.value = MultisigTransaction.createInstanceFromObject(pstObjectFromStore)
      //   transactionFromStore.value.combine({ psts: [transactionInstance.value] })
      //   transactionFromStore.value.save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
      //   return router.push({
      //     name: 'app-multisig-wallet-pst-view',
      //     params: { address: transactionFromStore.value.metadata.walletAddress, id: transactionFromStore.value.id }
      //   })
      // }
      $store.dispatch('multisig/saveTransaction', transactionInstance.value)
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

const syncWallet = () => {
  $q.dialog({
    component: SyncWalletDialog,
    componentProps: {
      multisigWallet: wallet.value,
      darkMode: darkMode.value }
  }).onOk(async() => {
        await $store.dispatch('multisig/syncWallet', { multisigWallet: wallet.value, address: route.params.address })
  })
}

const openWalletActionsDialog = () => {
  $q.dialog({
    component: WalletActionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      txProposals: transactions?.value,
      onSyncWallet: () => {
        syncWallet()
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
        router.push({ name: 'app-multisig-wallet-transactions', params: {address: route.params.address} })
      },
      onSend: () => {
        console.log('Open Send Tx Dialog')
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
  } catch (error) {}
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>i

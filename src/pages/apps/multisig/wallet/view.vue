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
    <div class="row q-mt-lg justify-center">
      <div class="col-xs-12 q-px-sm q-gutter-y-md">
        <template v-if="wallet">
          <div>
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label class="text-h6">{{ wallet.template.name }}
                  <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <!-- <q-item-label caption>5 min ago</q-item-label> -->
                  <q-btn icon="settings" color="grad">
                   <q-menu fit anchor="bottom right" self="top right" class="pt-card" :class="getDarkModeClass(darkMode)">
                      <q-item clickable @click="syncWalletAcrossDevices" v-close-popup>
                        <q-item-section>Share Online</q-item-section>
                      </q-item>
                      <q-item clickable>
                      <q-item-section>New incognito tab</q-item-section>
                      </q-item>
                    </q-menu>
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Address</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label >
                    {{ shortenString(route.params.address, 20) }} <CopyButton :text="route.params.address"/>
                  </q-item-label>
                  <!-- <q-icon name="bch" color="green" /> -->
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Balance</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ balance || 0 }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Required Signatures</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ wallet.requiredSignatures }} of {{ Object.keys(wallet.template.entities).length }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item-label header>Signers</q-item-label>
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
                  <q-item-label>Tx Proposals</q-item-label>
                  <!-- <div class="flex justify-end">
                    <q-btn label="Import" icon="mdi-file-import-outline" flat dense no-caps @click="loadTransactionProposal">
                    </q-btn>
                  </div> -->
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ transactions?.length || 0 }}</q-item-label>
                </q-item-section>
              </q-item>
              <div class="flex justify-end q-mr-md">
                <q-btn
                  size="sm"
                  label="Import Tx From File" icon="mdi-file-import-outline" flat dense no-caps @click="loadTransactionProposal">
                </q-btn>
              </div>
              <!-- <q-item>
                <q-item-section side top>
                  <div class="flex justify-end">
                    <q-btn label="Import" icon="mdi-file-import-outline" flat dense no-caps @click="loadTransactionProposal">
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item> -->
              <!-- <q-item
                :clickable="psts?.length"
                :to="{name: 'app-multisig-wallet-psts', params: { address: route.params.address }}">
                <q-item-section>
                  <q-item-label>Partially Signed Transactions</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ psts?.length || 0 }}</q-item-label>
                </q-item-section>
              </q-item> -->
              <q-separator spaced inset />
              <q-item>
                <q-item-section >
                  <div class="row justify-around q-gutter-sm">
                    <q-btn size="sm" color="primary" dense no-caps :to="{ name: 'app-multisig-wallet-receive', address: route.params.address }" class="col">
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-qrcode" class="col-12"></q-icon>
                      <div class="col-12">QR</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn size="sm" dense no-caps @click="$emit('Send')" color="primary" class="col">
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-plus" class="col-12"></q-icon>
                      <div class="col-12">Tx</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn size="sm" dense no-caps @click="exportWallet" color="primary" class="col">
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="mdi-file-export-outline" class="col-12"></q-icon>
                      <div class="col-12">Export</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn size="sm" dense no-caps @click="deleteWallet" class="col">
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="apps" class="col-12"></q-icon>
                      <div class="col-12">...</div>
                    </div>
                  </template>
                </q-btn>
                  </div>
                </q-item-section>
              </q-item>
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
import { MultisigTransaction, shortenString, MultisigWallet, exportMultisigWallet } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import CopyButton from 'components/CopyButton.vue'
import Watchtower from 'src/lib/watchtower'
import WalletActionsDialog from 'components/multisig/WalletActionsDialog.vue'
import SyncWalletDialog from 'components/multisig/SyncWalletDialog.vue'
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

// const psts = computed(() => {
//   if (!wallet.value?.address) return []
//   const _psts = $store.getters['multisig/getPsts']
//   return _psts.map((p) => {
//     const instance = new MultisigTransaction(p)
//     return instance
//   }).filter((p) => {
//     return p.address === wallet.value.address
//   })
// })

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
      transactionInstance.value = MultisigTransaction.importPST({ pst: reader.result })
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

const syncWalletAcrossDevices = () => {
  $q.dialog({
    component: SyncWalletDialog,
    componentProps: {
      multisigWallet: wallet.value,
      darkMode: getDarkModeClass(darkMode.value),
      onOk: async () => {
        await $store.dispatch('multisig/saveWallet', { multisigWallet: wallet.value, syncAcrossDevices: true })
      }
    }
  })
}

const openWalletActionsDialog = () => {
  $q.dialog({
    component: WalletActionsDialog,
    componentProps: {
      darkMode: getDarkModeClass(darkMode.value),
      onDelete: () => { console.log('deleting beach') },
      onImport: () => { console.log('deleting beach') },
      onExport: () => { console.log('deleting beach') }
    }
  })
}

onMounted(async () => {
  try {
    balance.value = await getMultisigWalletBchBalance(
      decodeURIComponent(route.params.address)
    )
    if (wallet.value) {
      await wallet.value.loadSignerXprivateKeys(getSignerXPrv)
    }
  } catch (error) {}
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>i

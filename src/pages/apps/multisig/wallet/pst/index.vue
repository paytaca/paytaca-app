<template>
<div class="static-container">
  <div id="app-container" class="multisig-app" :class="getDarkModeClass(darkMode)">
    <HeaderNav :title="$t('TxProposals')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.wallethash}`}`" class="header-nav" />
    <div class="row items-center justify-center full-height">
        <div v-if="proposals?.length > 0" class="col-xs-12 q-px-sm">
          <div class="row justify-end q-gutter-x-sm q-mb-md">
            <q-btn color="red" icon="clear_all" @click="clearAll" rounded outline>
              {{ $t('ClearAll') }}
            </q-btn>
          </div>
        </div>
        <div v-if="proposals?.length === 0" class="col-xs-12 text-center text-body1 q-mt-lg">
          <q-banner class="q-ma-lg rounded" :class="getDarkModeClass(darkMode)">
            <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>{{ $t('NoTxProposalsFound') }}
          </q-banner>
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
              <q-icon class="default-text-color"  name="mdi-file-import" @click="importProposals"/>
            </q-btn>
            <div class="q-pt-xs text-h6 text-center text-capitalize">{{ $t('Import') }}</div>
          </div>
        </div>
        <q-list v-if="proposals?.length > 0 || loadingProposals" separator class="col-xs-12" :class="getDarkModeClass(darkMode)">
            <q-item-label header>
              {{$t("TransactionProposals")}} <q-icon name="mdi-file-document-multiple-outline"></q-icon>
            </q-item-label>
            <q-separator></q-separator>
            <q-item 
              v-for="p, i in proposals" 
              :key="i" 
              :class="getDarkModeClass(darkMode)"
              clickable
              @click="router.push({ 
                name: 'app-multisig-wallet-pst-view', 
                params: { 
                  wallethash: route.params.wallethash, 
                  unsignedtransactionhash: p?.unsignedTransactionHash 
                }
              })"
              >
              <q-item-section avatar>
                <q-icon name="mdi-file-document-outline" color="primary" size="4rem"></q-icon>
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <div class="ellipsis text-bold">Purpose: {{ p.purpose || 'N/A'}}</div>
                </q-item-label>
                <q-item-label caption>
                  <div>Unsigned Hash: {{ shortenString(p.unsignedTransactionHash, 20) }}</div>
                </q-item-label>
                <q-item-label caption>
                  <div>Origin: {{ p.origin || 'N/A' }}</div>
                </q-item-label>
                <q-item-label v-if="p.id" caption class="flex items-center q-gutter-x-xs">
                  <q-icon name="mdi-cloud-outline"></q-icon>
                  <div>ID: {{ p.id }}</div>
                </q-item-label>
                <q-item-label v-if="p.coordinatorInfo" caption class="flex items-center q-gutter-x-xs">
                  <q-icon name="mdi-cloud-outline"></q-icon>
                  <div>Coordinator: {{ p.coordinatorInfo?.name }} </div>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                  <q-icon name="chevron_right" color="primary"></q-icon>
              </q-item-section>
            </q-item>
            <q-inner-loading :showing="loadingProposals">
              <q-spinner size="50px" color="primary" />
            </q-inner-loading>
        </q-list>

    </div>
  </div>
  
</div>
</template>

<script setup>

import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'components/header-nav'
import { MultisigWallet, Pst, shortenString } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'

const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { 
  multisigNetworkProvider,
  multisigCoordinationServer
} = useMultisigHelpers() 

const loadingProposals = ref(false)

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  const walletObject = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (walletObject) {
    return MultisigWallet.fromObject(walletObject, {
        store: $store,
        provider: multisigNetworkProvider,
        coordinationServer: multisigCoordinationServer
    })
  }
  return walletObject
})

// const proposalsData = ref([])

// // Computed property is now pure - just returns the ref value
// const proposals = computed(() => proposalsData.value)

const proposals = ref([])
// Watch dependencies and compute proposals, handling errors in the watcher
// watch(
//   () => [route.params.wallethash, wallet.value, $store.getters['multisig/getPsbtsByWalletHash'](route.params.wallethash)],
//   () => {
//     try {
//       const psbts = $store.getters['multisig/getPsbtsByWalletHash'](route.params.wallethash)
//       proposalsData.value = psbts?.map(psbtBase64 => {
//         const pst = Pst.fromPsbt(psbtBase64)
//         pst.setWallet(wallet.value)
//         // pst.setCoordinationServer(wallet.value.options.coordinationServer)
//         // (async () => {
          
//         //   await pst.sync()
//         //   await pst.fetchCoordinatorInfo()
//         // })()
//         return pst
//       }) || []

//     } catch (error) {
//       console.log('Errors', error)
//       proposalsData.value = []
//       $q.dialog({
//         title: 'Error loading transaction proposals!',
//         message: error.message,
//         class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
//       })
//     }
//   },
//   { immediate: true }
// )

const importProposals = () => {
  router.push({ 
    name: 'app-multisig-wallet-pst-import',
    params: {
      wallethash: route.params.wallethash,
      unsignedtransactionhash: 'unknown'
    },
    query: {
      description: $t('ImportProposalsInfoText', {}, 'You can import a transaction proposal in different ways'),
    }
  })
}

const loadProposals = async () => {
  loadingProposals.value = true
  try {
    proposals.value = []
    const psbts = $store.getters['multisig/getPsbtsByWalletHash'](route.params.wallethash)
    for (const psbt of psbts) {
      try {
        const proposal = Pst.fromPsbt(psbt)
        proposal.setWallet(wallet.value)  
        proposal.setCoordinationServer(wallet.value.options.coordinationServer)
        await proposal.sync()
        await proposal.fetchCoordinatorInfo()
        proposals.value.push(proposal)
      } catch (error) {
        // ignore malformed proposals
        continue 
      }
    }
  } catch (error) {
    proposals.value = []
    $q.dialog({
      title: 'Error loading transaction proposals!',
      message: error.message,
      class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
    })
  } finally {
    loadingProposals.value = false
  }
}

const clearAll = () => {
  $q.dialog({
    title: $t('ClearingAllTxProposals'),
    message: $t('ClearingAllTxProposalsConfirmationMessage'),
    // 'Are you sure you want to clear all transaction proposals? This action cannot be undone.',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
    ok: {
      label: 'Yes',
      color: 'primary',
      rounded: true
    },
    cancel: {
      label: 'No',
      color: 'primary',
      rounded: true,
      outline: true
    }
  }).onOk(async () => {
    for (const pst of proposals.value) {
      pst.setStore($store)
      await pst.delete({sync: false})
    }
    await loadProposals()
  })
}

onMounted(async () => {
  await loadProposals()
})

</script>

<style scoped>
.light {
  color: #141414;
}

.pst-wallet-card {
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

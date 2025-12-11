<template>
<div class="static-container">
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav :title="$t('Tx Proposals')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.wallethash}`}`" class="header-nav" />
    <div class="row items-center justify-center full-height">
        <div v-if="psts?.length > 0" class="col-xs-12 q-px-sm">
          <div class="row justify-end q-gutter-x-sm q-mb-md">
            <q-btn color="primary" icon="upload" @click="importPsbt" rounded outline>
              Import
            </q-btn>
          </div>
        </div>
        <div v-if="psts?.length === 0" class="col-xs-12 text-center text-body1 q-mt-lg">
          No tx proposals found.
          <q-btn color="primary" icon="upload" @click="importPsbt" dense rounded>
            Import
          </q-btn>
        </div>
        <div v-if="psts?.length > 0" class="col-xs-12 q-px-sm">
          <q-card
              v-for="pst, i in psts"
              :key="i"
              flat
              class="q-mb-sm pst-wallet-card"
              :class="getDarkModeClass(darkMode)"
              clickable
              @click="router.push({ name: 'app-multisig-wallet-pst-view', params: { wallethash: route.params.wallethash, unsignedtransactionhash: pst?.unsignedTransactionHash } })"
            >
              <q-card-section class="q-pa-md">
                <div class="flex items-center q-mb-sm">
                  <q-icon name="info" color="grad" size="md" class="q-mr-sm"></q-icon>
                  <div class="text-weight-bold text-h6">
                    <span>Purpose: {{ pst.purpose }}</span>
                  </div>
                </div>
                <div class="flex items-center">
                  <div class="text-body2">
                    Origin: {{ pst.origin }}
                  </div>
                </div>
                <div class="flex items-center">
                  <div class="text-body2">
                    Signing Progress: {{ pst.getSigningProgress()?.signingProgress }}
                  </div>
                </div>
              </q-card-section>
            </q-card>
        </div>
    </div>
  </div>
  
</div>
</template>

<script setup>

import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'components/header-nav'
import { MultisigWallet, Pst } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { 
  multisigNetworkProvider,
  multisigCoordinationServer
} = useMultisigHelpers() 

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

const psts = computed(() => {
  const psbts = $store.getters['multisig/getPsbtsByWalletHash'](route.params.wallethash)
  return psbts?.map(psbtBase64 => {
    const pst = Pst.fromPsbt(psbtBase64)
    pst.setWallet(wallet.value)
    return pst
  })
})

const importPsbt = () => {
  router.push({ 
    name: 'app-multisig-wallet-pst-import',
    params: {
      wallethash: route.params.wallethash,
      unsignedtransactionhash: 'unknown'
    },
    query: {
      description: 'You can import an unsigned or partially signed transaction proposal by scanning a QR code or loading from file.',
    }
  })
}

onMounted(() => {
    // if (psts.value.length === 1) {
    //   router.push({ name: 'app-multisig-wallet-pst-view', params: { wallethash: route.params.wallethash, unsignedtransactionhash: psts.value[0].unsignedTransactionHash } })
    // }
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

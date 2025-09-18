<template>
<div class="static-container">
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <HeaderNav :title="$t('Proposals')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.wallethash}`}`" class="header-nav" />
    <div class="row q-gutter-y-sm">
        <div v-if="psts?.length === 0" class="col-xs-12">
            <q-list>
                <q-item>
                    <q-item-section class="rounded-borders">
                    
                        <!-- <q-card class="pt-card q-pa-md" :class="getDarkModeClass(darkMode)" flat> -->
                            No proposals found.
                        <!-- </q-card> -->
                    </q-item-section>
                </q-item>
                <q-item>
                    <q-item-section>
                        <q-btn icon="mdi-file-import" color="primary" @click="importTransactionProposal" no-caps>Import From File</q-btn>
                    </q-item-section>
                </q-item>
             </q-list>
        </div>
        <div v-else class="col-xs-12">
          <q-list>
            <q-item
              v-for="pst, i in psts"
              :key="i" clickable
              :to="{ name: 'app-multisig-wallet-pst-view', params: { wallethash: route.params.wallethash, unsignedtransactionhash: pst.unsignedTransactionHash } }"
              class="q-py-md"
            >
              <q-item-section>
                <q-item-label class="text-weight-bold flex items-center">
                  <span>{{i + 1}}. {{ pst.purpose }}</span>
                </q-item-label>
                <q-item-label caption>
                  Origin: {{ pst.origin }}
                </q-item-label>
                <q-item-label caption>
                  <!-- Current Signatures: {{ pst.getSignatureCount() }} / {{ pst.getRequiredSignatures() }} -->
                </q-item-label>
              </q-item-section>
              <q-item-section side top>
                <q-btn
                  icon="close"
                  flat
                  >
                </q-btn>
              </q-item-section>
            </q-item>
            <q-separator inset />
          </q-list>
        </div>
    </div>
    <!-- display created wallets  -->
  </div>
  <q-file
    ref="pstFileElementRef"
    v-model="pstFileModel"
    :multiple="false"
    style="visibility: hidden"
    @update:model-value="onUpdateTransactionFile">
    </q-file>
</div>
</template>

<script setup>

import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'components/header-nav'
import { Pst } from 'src/lib/multisig'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()

const pstFileElementRef = ref()
const pstFileModel = ref()  

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const psts = computed(() => {
  const pstObjects =  $store.getters['multisig/getPstsByWalletHash'](route.params.wallethash)?.filter(p => !p.broadcastResult).map(p => Pst.fromObject(p))
  if (pstObjects) {
    return pstObjects.map(p => {
      return Pst.fromObject(p, {
        store: $store
      })
    })
  }
  return []
})

const importTransactionProposal = () => {
  pstFileElementRef.value.pickFiles()
}

const onUpdateTransactionFile = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      const pstExportedData = reader.result
      const pstInstance = Pst.import(pstExportedData, { store: $store })
      pstInstance.save()
      router.push({ 
        name: 'app-multisig-wallet-pst-view', 
        params: { unsignedtransactionhash: pstInstance.unsignedTransactionHash }
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}

onMounted(() => {
    if (psts.value.length === 1) {
      router.push({ name: 'app-multisig-wallet-pst-view', params: { wallethash: route.params.wallethash, unsignedtransactionhash: psts.value[0].unsignedTransactionHash } })
    }
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>

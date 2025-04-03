<template>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Partially Signed Txs')"
              :backnavpath="`/apps/multisig/wallet/${route.params.address}`"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
              <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">{{ wallet.address }}</div>
              <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md"><q-btn @click="deleteAllPsts" label="Delete All Psts"></q-btn></div>
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                  <template v-if="psts && psts.length > 0">
                    <div class="q-pa-md">
                      <q-list>
                        <q-item
                          v-for="pst in psts"
                          :key="pst.id"
                          :clickable="psts?.length"
                          :to="{name: 'app-multisig-wallet-pst-view', params: { address: route.params.address, id: pst.id }}">
                          <q-item-section>
                            <q-item-label>Spending BCH: {{ pst.totalBchValue }}</q-item-label>
                            <q-item-label># of Recipients: {{ pst.numberOfRecipients }}</q-item-label>
                            <q-item-label># of Signatures: {{ Object.keys(pst.signatures).length }}</q-item-label>
                            <q-item-label># of Required Signatures: {{ pst.m }}</q-item-label>
                            <div>Signers</div>
                            <div class="flex">
                              <q-chip
                                v-for="signerInfo, i in Object.entries(pst.signersInfo||{})" :key="`${signerInfo[0]}${i}`"
                                :icon="hasSignature(signerInfo[1], pst)? 'task': 'edit_document'"
                                class="q-mr-md"
                              >
                              {{ signerInfo[1].name }}
                              </q-chip>
                            </div>
                          </q-item-section>
                          <q-item-section side top>
                            <q-item-label><q-btn label="Sign"></q-btn></q-item-label>
                            <q-item-label caption>caption here</q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </div>
                  </template>
                </div>
            </div>
          </div>
        </div>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst } from 'src/lib/multisig'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const psts = computed(() => {
  if (!wallet.value?.address) return []
  const _psts = $store.getters['multisig/getPsts']
  return _psts.map((p) => {
    const instance = new Pst(structuredClone(p))
    return instance
  }).filter((p) => {
    return p.address === wallet.value.address
  })
})

const hasSignature = computed(() => {
  return (signerInfoValue, pst) => {
    const keyId = Object.keys(signerInfoValue.variables)[0]
    return Object.keys(pst.signatures).find((signatureKey) => {
      return signatureKey.startsWith(keyId)
    })
  }
})

const deleteAllPsts = () => {
  $store.dispatch('multisig/deleteAllPsts')
}

onMounted(() => {
  console.log('🚀 ~ psts ~ psts:', psts)
})
// TODO: SHOW DIALOG IF WALLET NOT FOUND, NAV BACK ON DIALOG CLOSE
</script>

<style scoped>
.light {
  color: #141414;
}
</style>

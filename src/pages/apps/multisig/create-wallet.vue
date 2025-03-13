<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Create Multisig Wallet')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                    <div class="row q-gutter-y-md justify-between" >
                        <div class="col-6 q-pr-sm">
                            <q-select
                                :popup-content-class="darkMode ? '': 'text-black'"
                                v-model="m" :options="mOptionsComputed" :label="$t('Number of signers')"
                                outlined
                            />
                        </div>
                        <div class="col-6 q-pl-sm">
                            <q-select
                                :popup-content-class="darkMode ? '': 'text-black'"
                                v-model="n" :options="nOptionsComputed" :label="$t('Max signers')"
                                outlined
                            />
                        </div>
                        <div class="col-6 q-pl-sm">
                            <q-input v-model="template.name" label="Wallet Label"></q-input>
                        </div>
                        <div class="col-12 text-center">
                            <span class="text-italic text-bow">
                              {{ m }} of {{ n }} multisig wallet
                            </span>
                        </div>
                    </div>
                    <div v-if="cosigners" class="row">
                      <div class="col-12 q-px-m">
                        <q-form
                          @submit="onSubmit"
                          @reset="onResetClicked"
                          class="q-gutter-md"
                          >
                          <template v-for="i, index in Array(m)" :key="`cosigner-${index}`">
                            <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                              <q-card-section>Signer {{ index + 1 }}</q-card-section>
                              <q-card-section class="q-pa-md q-gutter-y-sm">
                                <q-input
                                  v-model="cosigners[index + 1].xPubKey"
                                  :label="`Paste Cosigner ${index + 1}'s xPubKey`"
                                  style="color:black"
                                  outlined
                                  :disable="index === 0"
                                >
                                </q-input>
                                <q-input
                                  v-if="cosigners[index + 1].xPubKey"
                                  v-model="cosigners[index + 1].derivationPath"
                                  :key="`derivation-path-${index}`"
                                  :label="`Derivation Path`"
                                  style="color:black"
                                  outlined
                                ></q-input>
                              </q-card-section>
                            </q-card>
                          </template>
                          <div>
                              <q-btn v-if="cosigners?.length === m" :to="{ path: 'draft' }" label="Preview" type="button" color="primary" flat class="q-ml-sm" />
                              <q-btn @click.stop="onResetClicked" label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
                              <q-btn @click.stop="onCreateClicked" label="Create" type="button" color="primary"/>
                          </div>
                        </q-form>
                      </div>
                    </div>
                </div>
            </div>
            <!-- display created wallets  -->
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, ref, onMounted, watch } from 'vue'
import { CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { createTemplate, createWallet } from 'src/lib/multisig'

const $store = useStore()
const { t: $t } = useI18n()
const m = ref()
const n = ref()
const mOptions = ref()
const nOptions = ref()
const cosigners = ref()
const template = ref()

const mOptionsComputed = computed(() => {
  return mOptions.value
})

const nOptionsComputed = computed(() => {
  return nOptions.value
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const cashAddressNetworkPrefix = computed(() => {
  return $store.getters['global/isChipnet']
    ? CashAddressNetworkPrefix.testnet
    : CashAddressNetworkPrefix.mainnet
})

const initCosigners = () => {
  cosigners.value = {}
  for (let i = 0; i < 20; i++) {
    cosigners.value[i + 1] = { xPubKey: '', derivationPath: 'm/44\'/145\'/0\'' }
    // cosigners.value[i + 1] = { xPubKey: '', derivationPath: 'm/48\'/145\'/0\'/0\'' }
  }
}

const onResetClicked = () => {
  initCosigners()
  m.value = 2
  n.value = 3
}

const onCreateClicked = () => {
  if (!m.value || cosigners.value?.length !== m.value) {
    return
  }
  const { address, lockingBytecode } = createWallet({
    m: m.value,
    n: n.value,
    xPubKeys: cosigners.value.map(item => item.xPubKey),
    cashAddressNetworkPrefix: cashAddressNetworkPrefix.value,
    template: template.value
  })
  $store.dispatch['global/commitTemplateDraft']({ address, lockingBytecode, template: template.value })
}

watch(() => m.value, (valueOfM) => {
  if (n.value < valueOfM) {
    n.value = valueOfM + 1
  }
})

onMounted(() => {
  m.value = 2
  n.value = 3
  mOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  nOptions.value = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  initCosigners()
  const { xPubKey, derivationPath } = $store.getters['global/getWallet']('bch')
  cosigners.value[1] = {
    xPubKey,
    derivationPath: derivationPath + '/0/0'
  }
  template.value = createTemplate({ name: '', m: m.value, n: n.value })
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>

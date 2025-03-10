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
                          @reset="onReset"
                          class="q-gutter-md"
                          >
                          <template v-for="i, index in Array(m)" :key="`cosigner-${index}`">
                            <q-card >
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
                              <q-btn label="Create" type="submit" color="primary"/>
                              <q-btn label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
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
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { derivePubKeyFromXPubKey } from 'src/lib/multisig-wallet'

const $store = useStore()
const { t: $t } = useI18n()
const m = ref()
const n = ref()
const mOptions = ref()
const nOptions = ref()
const cosigners = ref()

const mOptionsComputed = computed(() => {
  return mOptions.value
})

const nOptionsComputed = computed(() => {
  return nOptions.value
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const initCosigners = () => {
  cosigners.value = {}
  for (let i = 0; i < 20; i++) {
    // cosigners.value[i + 1] = { xPubKey: '', derivationPath: 'm/44\'/145\'/0\'/0/0' }
    cosigners.value[i + 1] = { xPubKey: '', derivationPath: 'm/48\'/145\'/0\'/0\'' }
  }
}

const onReset = () => {
  initCosigners()
  m.value = 2
  n.value = 3
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
  console.log('DERIVE', derivePubKeyFromXPubKey(xPubKey))
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>

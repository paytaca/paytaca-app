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
                    <div class="row q-gutter-y-md justify-between items-center" >
                        <div class="col-5 ">
                            <q-select
                                :popup-content-class="darkMode ? '': 'text-black'"
                                v-model="m" :options="mOptionsComputed" :label="$t('Required signers')"
                                outlined
                            />
                        </div>
                        <div class="col-2 q-px-sm flex items-center justify-center">
                          <h5>of</h5>
                        </div>
                        <div class="col-5 ">
                            <q-select
                                :popup-content-class="darkMode ? '': 'text-black'"
                                v-model="n" :options="nOptionsComputed" :label="$t('Max signers')"
                                outlined
                            />
                        </div>
                        <div v-if="template?.name" class="col-12 ">
                            <q-input v-model="template.name" label="Wallet Label" outlined></q-input>
                        </div>
                        <div class="col-12 text-center">
                            <span class="text-h6 text-italic text-bow">
                              Signers
                            </span>
                        </div>
                    </div>
                    <div v-if="Object.keys(signers || {}).length > 0" class="row">
                      <div class="col-12 q-px-m">
                        <q-form
                          @submit="onSubmit"
                          @reset="onResetClicked"
                          class="q-gutter-md"
                          >
                          <template v-for="i, index in Array(n)" :key="`cosigner-${index}`">
                            <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                              <q-card-section>{{ index === 0 ? '( You )': '' }} Signer {{ index + 1 }} </q-card-section>
                              <q-card-section class="q-pa-md q-gutter-y-sm">
                                <q-input
                                  v-model="signers[index + 1].signerName"
                                  :label="index + 1 === 1? 'Enter your name': 'Cosigner\'s name'"
                                  style="color:black"
                                  outlined
                                ></q-input>
                                <q-input
                                  v-model="signers[index + 1].xPubKey"
                                  :label="`Paste signers ${index + 1}'s xPubKey`"
                                  style="color:black"
                                  outlined
                                  :disable="index === 0"
                                >
                                </q-input>
                                <!-- <q-input
                                  v-if="signers[index + 1].xPubKey"
                                  v-model="signers[index + 1].derivationPath"
                                  :key="`derivation-path-${index}`"
                                  :label="`Derivation Path`"
                                  style="color:black"
                                  outlined
                                ></q-input> -->
                              </q-card-section>
                            </q-card>
                          </template>
                          <div>
                              <q-btn
                                v-if="Object.keys(signers || {}).length === n"
                                @click.stop="onPreviewClicked"
                                label="Preview" type="button" color="primary" flat class="q-ml-sm" />
                              <q-btn
                                @click.stop="onResetClicked"
                                label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
                              <q-btn
                                @click="onCreateClicked"
                                label="Create" type="button" color="primary"
                                :disabled="Object.keys(signers || {}).length !== n"
                              />
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
import { computed, ref, watch, onBeforeMount } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { createTemplate, createWallet } from 'src/lib/multisig'

const $store = useStore()
const router = useRouter()
const { t: $t } = useI18n()
const mOptions = ref()
const nOptions = ref()

/**
 * Wallet
 */
const m = ref()
const n = ref()
/**
 * <signer #>: { xPubKey: string, derivationPath: string, signerName?: string }
 */
const signers = ref()
const template = ref()
const cashaddress = ref()
const lockingBytecode = ref()

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

const initSigners = ({ n }) => {
  const signers = {}
  for (let i = 0; i < n; i++) {
    const signerIndex = i + 1
    signers[signerIndex] = { xPubKey: '', derivationPath: 'm/44\'/145\'/0\'', signerName: `Signer ${signerIndex}` }
    // signers.value[i + 1] = { xPubKey: '', derivationPath: 'm/48\'/145\'/0\'/0\'' }
  }
  const { xPubKey, derivationPath } = $store.getters['global/getWallet']('bch')
  signers[1] = {
    ...signers[1],
    signerName: 'Signer 1',
    xPubKey,
    derivationPath: derivationPath
  }
  return signers
}

const newTemplate = ({ name, m, n, signers }) => {
  return createTemplate({ name, m, n, signers })
}

const initWallet = () => {
  const walletDraft = $store.getters['multisig/getWalletDraft']
  if (walletDraft) {
    try {
      signers.value = JSON.parse(JSON.stringify(walletDraft.signers))
      template.value = JSON.parse(JSON.stringify(walletDraft.template))
      m.value = walletDraft.m || 2
      n.value = walletDraft.n || 3
      cashaddress.value = walletDraft.cashaddress
      lockingBytecode.value = walletDraft.lockingBytecode
      return
    } catch (error) { }
  }
  m.value = 2
  n.value = 3
  signers.value = initSigners({ n: n.value })
  template.value = newTemplate({ name: '', m: m.value, n: n.value, signers: signers.value })
}

const onPreviewClicked = () => {
  console.log('saving to draft')
  $store.dispatch('multisig/saveWalletDraft', {
    m: m.value,
    n: n.value,
    template: template.value,
    signers: signers.value
  })
  router.push({ name: 'app-multisig-view-wallet-draft' })
}

const onResetClicked = () => {
  $store.dispatch('multisig/deleteWalletDraft')
  initWallet()
}

const onCreateClicked = () => {
  if (!m.value || Object.keys(signers.value || {}).length !== n.value) {
    return
  }
  const multisigWallet = createWallet({
    signers: signers.value,
    cashAddressNetworkPrefix: cashAddressNetworkPrefix.value,
    template: template.value
  })
  $store.dispatch('multisig/commitWalletDraft', {
    m: m.value,
    n: n.value,
    template: template.value,
    signers: multisigWallet.signers,
    cashaddress: multisigWallet.cashaddress,
    lockingBytecode: multisigWallet.lockingBytecode
  })
  router.push({ name: 'app-multisig-view-wallet', params: { cashaddress: multisigWallet.cashaddress } })
}

watch(() => m.value, (newM) => {
  if (n.value < newM) {
    n.value = newM + 1
  }
  if (newM) {
    const newCosigners = initSigners({ n: newM })
    signers.value = { ...newCosigners, ...signers.value }
    template.value = newTemplate({ name: template.value?.name || '', m: newM, n: n.value })
  }
})

watch(() => n.value, (newN) => {
  if (newN && newN < m.value) {
    n.value = m.value
  }
  if (newN) {
    const newCosigners = initSigners({ n: newN })
    signers.value = { ...newCosigners, ...signers.value }
    template.value = newTemplate({ name: template.value?.name || '', m: m.value, n: newN })
  }
})

onBeforeRouteLeave(() => {
  $store.dispatch('multisig/saveWalletDraft', {
    m: m.value, n: n.value, signers: signers.value, template: template.value
  })
})

onBeforeMount(() => {
  mOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  nOptions.value = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  initWallet()
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>

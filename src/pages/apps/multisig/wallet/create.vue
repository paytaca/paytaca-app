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
                    <div v-if="wallet" class="row q-gutter-y-md justify-between items-center" >
                        <div class="col-5 ">
                            <q-select
                                :popup-content-class="darkMode ? '': 'text-black'"
                                v-model="wallet.m" :options="mOptionsComputed" :label="$t('Required signers')"
                                outlined
                            />
                        </div>
                        <div class="col-2 q-px-sm flex items-center justify-center">
                          <h5>of</h5>
                        </div>
                        <div class="col-5 ">
                            <q-select
                                :popup-content-class="darkMode ? '': 'text-black'"
                                v-model="wallet.n" :options="nOptionsComputed" :label="$t('Max signers')"
                                outlined
                            />
                        </div>
                        <div class="col-12 ">
                            <q-input v-model="wallet.name" label="Wallet Label" outlined></q-input>
                        </div>
                        <div class="col-12 text-center">
                            <span class="text-h6 text-italic text-bow">
                              Signers
                            </span>
                        </div>
                    </div>
                    <div v-if="Object.keys(wallet.signers || {}).length > 0" class="row">
                      <div class="col-12 q-px-m">
                        <q-form
                          @submit="onSubmit"
                          @reset="onResetClicked"
                          class="q-gutter-md"
                          >
                          <template v-for="i, index in Array(wallet.n)" :key="`cosigner-${index}`">
                            <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                              <q-card-section>{{ index === 0 ? '( You )': '' }} Signer {{ index + 1 }} </q-card-section>
                              <q-card-section class="q-pa-md q-gutter-y-sm">
                                <q-input
                                  v-model="wallet.signers[index + 1].signerName"
                                  :label="index + 1 === 1? 'Enter your name': 'Cosigner\'s name'"
                                  style="color:black"
                                  outlined
                                ></q-input>
                                <q-input
                                  v-model="wallet.signers[index + 1].xPubKey"
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
                                @click.stop="onResetClicked"
                                label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
                              <q-btn
                                @click="onCreateClicked"
                                label="Create" type="button" color="primary"
                                :disabled="Object.keys(wallet.signers || {}).length !== wallet.n"
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
import { useRouter } from 'vue-router'
import { CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet } from 'src/lib/multisig'

const $store = useStore()
const router = useRouter()
const { t: $t } = useI18n()
const mOptions = ref()
const nOptions = ref()
const wallet = ref()

const mOptionsComputed = computed(() => {
  return mOptions.value
})

const nOptionsComputed = computed(() => {
  return nOptions.value
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const network = computed(() => {
  return $store.getters['global/isChipnet']
    ? CashAddressNetworkPrefix.testnet
    : CashAddressNetworkPrefix.mainnet
})

/**
 * <signer #>: { xPubKey: string, derivationPath: string, signerName?: string }
 */
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

const initNewWallet = () => {
  wallet.value = new MultisigWallet({
    signers: initSigners({ n: 3 }),
    network: network.value,
    m: 2,
    n: 3,
    name: ''
  })
  console.log('NEW WALLET', wallet.value)
}

const onResetClicked = () => {
  initNewWallet()
}

const onCreateClicked = async () => {
  wallet.value.createTemplate()
  console.log('create wallet', wallet.value)
  await $store.dispatch('multisig/saveWallet', wallet.value)
  router.push({ name: 'app-multisig-wallet-view', params: { address: wallet.value.address } })
}

watch(() => wallet.value?.m, (newM) => {
  if (wallet.value && wallet.value.n < newM) {
    wallet.value.n = newM + 1
  }
  if (newM) {
    const newCosigners = initSigners({ n: newM })
    wallet.value.signers = { ...newCosigners, ...wallet.value.signers }
  }
})

watch(() => wallet.value?.n, (newN) => {
  if (newN && newN < wallet.value.m) {
    wallet.value.n = wallet.value.m
  }
  if (newN) {
    const newCosigners = initSigners({ n: newN })
    wallet.value.signers = { ...newCosigners, ...wallet.value.signers }
  }
})

onBeforeMount(() => {
  mOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  nOptions.value = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  initNewWallet()
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>

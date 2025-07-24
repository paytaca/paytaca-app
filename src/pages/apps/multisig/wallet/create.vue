<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Create Wallet')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row justify-center">
                <div class="col-xs-12 text-right q-px-sm q-gutter-y-sm">
                  <q-stepper
                    v-if="multisigWallet"
                    v-model="step"
                    ref="stepper"
                    animated
                    flat
                    active-color="warning"
                    inactive-color="grey"
                    done-color="green"
                    class="pt-card text-bow"
                    :class="getDarkModeClass(darkMode)"
                    style="background-color: inherit !important"
                    vertical
                  >
                    <q-step
                      :name="1"
                      title="Basic Config"
                      icon="settings"
                      :done="multisigWallet.name"
                      :error="!multisigWallet.name"
                    >
                      <div class="q-gutter-y-md">
                        <q-input v-model="multisigWallet.name" label="Enter wallet name" outlined dense></q-input>
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="multisigWallet.m" :options="mOptionsComputed" :label="$t('Required number of signers')"
                          outlined dense
                        />
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="multisigWallet.n" :options="nOptionsComputed" :label="$t('Total number of signers')"
                          outlined dense
                        />
                      </div>
                      <q-stepper-navigation>
                        <q-btn :disable="!multisigWallet.name" @click="$refs.stepper.next()" color="primary" label="Continue" />
                      </q-stepper-navigation>
                    </q-step>
                    <q-step
                      v-for="(signer, signerIndex) in multisigWallet?.signers"
                      :key="1 + signerIndex"
                      :name="1 + Number(signerIndex + 1)"
                      :title="`Signer ${signerIndex + 1}`"
                      :done="step > 2 + Number(signerIndex + 1)"
                      icon="mdi-account-signerIndex"
                    >
                    <div class="q-gutter-y-md">
                      <q-input
                        :label="`Signer ${signerIndex + 1}'s name`"
                        v-model="multisigWallet.signers[signerIndex].name"
                        outlined dense
                        >
                      </q-input>
                      <q-input
                        label="Paste signer's xpub"
                        v-model="multisigWallet.signers[signerIndex].xpub"
                        outlined
                        dense
                        clearable
                        @update:model-value="() => onUpdateXpubValue({ signer, signerIndex })"
                        >
                      </q-input>
                      <q-btn
                        @click="() => openLocalWalletsSelectionDialog({ signer, signerIndex })"
                        :color="darkMode? 'warning': 'primary'"
                        dense outline no-caps icon="mdi-form-select">
                        Pick xpub from this wallet
                      </q-btn>
                    </div>
                    <q-stepper-navigation>
                        <q-btn :disable="!multisigWallet.signers[signerIndex].xpub || !multisigWallet.signers[signerIndex].name" @click="$refs.stepper.next()" color="primary" label="Continue" />
                        <q-btn flat @click="$refs.stepper.previous()" color="primary" label="Back" class="q-ml-sm" />
                      </q-stepper-navigation>
                    </q-step>
                    <q-step
                      :name="multisigWallet.n + 2"
                      title="Finish"
                      done-icon="done_all"
                    >
                      <q-list bordered separator class="text-left">
                        <q-item-label header>Wallet Specs</q-item-label>
                        <q-item>
                          <q-item-section>
                            Wallet Name
                          </q-item-section>
                          <q-item-section side>
                            {{ multisigWallet.name }}
                          </q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>
                            Required Signatures
                          </q-item-section>
                          <q-item-section side>
                            {{ multisigWallet.m }} of {{ multisigWallet.n }}
                          </q-item-section>
                        </q-item>
                        <q-item-label header>Signers</q-item-label>
                        <q-item
                          v-for="signer, signerIndex in multisigWallet.signers"
                          :key="`read-${signerIndex}`"
                          >
                          <q-item-section>
                            <q-item-label>{{ signer.name }}</q-item-label>
                            <q-item-label caption lines="2">
                              {{ shortenString(signer.xpub || '', 25) }}
                            </q-item-label>
                          </q-item-section>
                          <q-item-section side top>
                            <q-item-label caption class="text-italic">Signer {{ signerIndex + 1 }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                      <q-stepper-navigation>
                        <q-btn @click="()=> onCreateClicked()" color="primary" label="Save" />
                        <q-btn flat color="primary" @click="$refs.stepper.previous()" label="Back" class="q-ml-sm" />
                      </q-stepper-navigation>
                    </q-step>
                  </q-stepper>
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
import { computed, ref, watch, onBeforeMount, onMounted, toValue, unref, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { createTemplate, getMultisigCashAddress, shortenString, generateTempId, derivePublicKeys, getLockingData, getDepositAddress, getWalletUUID } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import LocalWalletsSelectionDialog from 'components/multisig/LocalWalletsSelectionDialog.vue'

const $store = useStore()
const $q = useQuasar()
const router = useRouter()
const { t: $t } = useI18n()
const { cashAddressNetworkPrefix } = useMultisigHelpers()
const mOptions = ref()
const nOptions = ref()
/**
 * @type {import('vue').Ref<MultisigWallet>}
 */
const multisigWallet = ref()

const step = ref(5)

const mOptionsComputed = computed(() => {
  return mOptions.value
})

const nOptionsComputed = computed(() => {
  return nOptions.value
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const onUpdateXpubValue = ({ signer, signerIndex }) => {
  if (!signer.xpub) {
    signer.xprv = ''
  }
  multisigWallet.value.signers[signerIndex] = signer
}

const openLocalWalletsSelectionDialog = ({ signer, signerIndex }) => {
  $q.dialog({
    component: LocalWalletsSelectionDialog,
    componentProps: {
      signerIndex: signerIndex,
      signerName: signer.name
    }

  }).onOk((selectedWallet) => {
    console.log('🚀 ~ openLocalWalletsSelectionDialog ~ selectedWallet:', selectedWallet)
    multisigWallet.value.signers[signerIndex].xpub = selectedWallet.wallet.bch.xPubKey
  })
}
/**
 * <signer #>: { xpub: string, derivationPath: string, name?: string }
 */
const initSigners = ({ n }) => {
  
  // if(n > multisigWallet.value.signers.length) { // 2 of 3, new n = 4 n > 3, push
  //   for(let i = multisigWallet.value.signers.length; i < n ; i++ ) {
  //     multisigWallet.value.signers.push({
  //       name: '',
  //       xpub: ''
  //     })
  //   }
  // } 
  // if (n < multisigWallet.value.signers.length) {
  //   while(multisigWallet.value.signers.length !== n) {
  //     multisigWallet.value.signers.pop()
  //   }
  // }
}

const onResetClicked = () => {
  multisigWallet.value = {
    name: `My 2-of-3 multisig wallet`,
    m: 2,
    signers: []
  }
}

const onCreateClicked = async () => {


  const wallet = await $store.dispatch('multisig/createWallet', toRaw(multisigWallet.value))
  
  router.push({
    name: 'app-multisig-wallet-view',
    params: {
      // id: wallet.id,
      // address: getDepositAddress({
      //   multisigWallet: toRaw( multisigWallet.value),
      //   addressIndex: 0,
      //   cashAddressNetworkPrefix: cashAddressNetworkPrefix.value
      // })
      uuid: getWalletUUID(wallet)
    }
  })
}

watch(() => multisigWallet.value?.m, (newM) => {
  if (multisigWallet.value && multisigWallet.value.n < newM) {
    multisigWallet.value.n = newM + 1
  }
  
})

watch(() => multisigWallet.value?.n, (newN, oldN) => {
  if (newN !== oldN) {
    initSigners({ n: newN })
  }
})

onBeforeMount(() => {
  mOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  nOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
})

onMounted(() => {
  const tempVault = $store.getters['global/getVault']
  // console.log('TEMPVAULT', tempVault)
  multisigWallet.value = {
    name: `My 2-of-3 multisig wallet`,
    m: 2,
    n: 3,
    signers: [
      {
        name: 'Ron',
        xpub: 'xpub6ChaFrC7FJCKs4HTyKS17ywUSuN5FgWf3VRX6eLezi7Zrh4XwBY5RD87v1bJTAf3Vf71bfMAWCMEd1G3mQdNMiFhYVmRj3Gg1m7ReSR5KHk'
      },
      {
        name: 'Alice',
        xpub: 'xpub6D6VvR6s1TtD1ovMShqpEXPeRAT7qUxRkYzAXi7WF1LpMr4xN9Ahh8FYrfh3zKEKQUUPvjc9p8syMpctuVuc586PXooQGMjzX5ZK3HrDhuG'
      },
      {
        name: 'Bob',
        xpub: 'xpub6CZTCrufor8D291ufL5ECFMcuFYDReMS6b5pfMjL3qjfPSoUMfeMP6FqsvfXbywcwQDD88sriRZDrbKbauStkBuEV5igshUHRMhq5BLrXRp'
      }
    ]
  }
})

</script>

<!-- <style scoped>
::v-deep(.q-stepper__header) {
  flex-wrap: wrap; /* 👈 Allow wrapping */
  gap: 1rem;
  justify-content: flex-start; /* Or center if you prefer */
}

::v-deep(.q-stepper__tab) {
  flex: 0 1 auto;
  min-width: 120px;
  padding: 6px 10px;
  font-size: 14px;
  text-align: center;
}

::v-deep(.q-stepper__title) {
  font-size: 13px;
  white-space: normal; /* Allow text wrapping if needed */
}
.light {
  color: #141414;
}
</style> -->

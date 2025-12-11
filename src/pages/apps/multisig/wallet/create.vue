<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Setup Wallet')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row justify-center">
                <div class="col-xs-12 text-right q-px-sm q-gutter-y-sm">
                  <q-stepper
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
                      :done="name"
                      :error="!name"
                    >
                      <div class="q-gutter-y-md">
                        <q-input v-model="name" label="Enter wallet name" outlined dense></q-input>
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="m" :options="mOptionsComputed" :label="$t('Required number of signers')"
                          outlined dense
                        />
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="n" :options="nOptionsComputed" :label="$t('Total number of signers')"
                          outlined dense
                        />
                      </div>
                      <q-stepper-navigation>
                        <q-btn :disable="!name" @click="$refs.stepper.next()" color="primary" label="Continue" />
                      </q-stepper-navigation>
                    </q-step>
                    <q-step

                      v-for="signer, i in signers"
                      :key="2 + i"
                      :name="2 + Number(i)"
                      :title="`Signer ${1 + i}`"
                      :done="step > 2 + Number(i)"
                      icon="mdi-account-signerIndex"
                    >
                    <div class="q-gutter-y-md">
                      <q-input
                        :label="`Signer ${1 + i}'s name`"
                        v-model="signer.name"
                        outlined dense
                        >
                      </q-input>
                      <q-input
                        label="Paste signer's xpub"
                        v-model="signer.xpub"
                        outlined
                        dense
                        clearable
                        >
                        <template v-slot:append>
                          <q-btn
                            @click="() => openLocalWalletsSelectionDialog({ signer, signerIndex: i })"
                            dense flat no-caps icon="mdi-form-select">
                          </q-btn>
                        </template>
                      </q-input>
                      <q-input v-model="signer.masterFingerprint" label="Enter Master Fingerprint" outlined dense required></q-input>
                    </div>
                    <q-stepper-navigation>
                        <q-btn :disable="!signer.xpub || !signer.name" @click="$refs.stepper.next()" color="primary" label="Continue" />
                        <q-btn flat @click="$refs.stepper.previous()" color="primary" label="Back" class="q-ml-sm" />
                      </q-stepper-navigation>
                    </q-step>
                    <q-step
                      :name="n + 2"
                      title="Finish"
                      done-icon="done_all"
                    >
                      <q-list separator class="text-left">
                        <q-item-label header>Wallet Specs</q-item-label>
                        <q-item>
                          <q-item-section>
                            Wallet Name
                          </q-item-section>
                          <q-item-section side>
                            {{ name }}
                          </q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>
                            Required Signatures
                          </q-item-section>
                          <q-item-section side>
                            {{ m }} of {{ n }}
                          </q-item-section>
                        </q-item>
                        <q-item-label header>Signers</q-item-label>
                        <q-item
                          v-for="signer, ii in signers"
                          :key="`read-${ii}`"
                          >
                          <q-item-section>
                            <q-item-label>{{ signer.name }}</q-item-label>
                            <q-item-label caption lines="2">
                              {{ shortenString(signer.xpub || '', 25) }}
                            </q-item-label>
                          </q-item-section>
                          <q-item-section side top>
                            <q-item-label caption class="text-italic">Signer {{ ii }}</q-item-label>
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
import { computed, ref, watch, onBeforeMount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { shortenString, MultisigWallet, getMasterFingerprint } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import LocalWalletsSelectionDialog from 'components/multisig/LocalWalletsSelectionDialog.vue'
import { WatchtowerCoordinationServer, WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { createXprvFromXpubResolver } from 'src/utils/multisig-utils'
import { loadWallet } from 'src/wallet'
import { binToHex } from 'bitauth-libauth-v3'

const $store = useStore()
const $q = useQuasar()
const router = useRouter()
const { t: $t } = useI18n()
const { 
  multisigCoordinationServer, 
  multisigNetworkProvider, 
  resolveXprvOfXpub,
  getSignerWalletFromVault
} = useMultisigHelpers()
const mOptions = ref()
const nOptions = ref()
const wallet = ref()
const step = ref(1)

const name = ref('')
const m = ref(0)
const n = ref(0)
const signers = ref([])

const mOptionsComputed = computed(() => {
  return mOptions.value
})

const nOptionsComputed = computed(() => {
  return nOptions.value
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})


const openLocalWalletsSelectionDialog = ({ signer, signerIndex }) => {
  $q.dialog({
    component: LocalWalletsSelectionDialog,
    componentProps: {
      signerIndex: signerIndex,
      signerName: signer.name
    }

  }).onOk(async (selectedWallet) => {
    signers.value[signerIndex].xpub = selectedWallet.wallet.bch.xPubKey
    const localWallet = getSignerWalletFromVault({ xpub: selectedWallet.wallet.bch.xPubKey })
    const { mnemonic } = await loadWallet('BCH', localWallet.vaultIndex)
    signers.value[signerIndex].masterFingerprint = binToHex(getMasterFingerprint(mnemonic))
  })
}

const initializeSigners = (n) => {
  
  if (!signers.value) {
    signers.value = []
  }

  if (signers.value.length > n) {
    while(signers.value.length !== n) {
      signers.value.pop()
    }
  }

  if (signers.value.length < n) {
    while(signers.value.length !== n) {
      signers.value.push({
        name: '',
        xpub: '',
        masterFingerprint: ''
      })
    }
  }
}

const onResetClicked = () => {
  m.value = 2
  n.value = 3
  name.value = `My ${m.value} of ${n.value} wallet`
  initializeSigners(n.value)
}

const onCreateClicked = async () => {

  const spec = {
    name: name.value,
    m: m.value,
    signers: signers.value
  }
  
  const options = {
    store: $store,
    provider: multisigNetworkProvider,
    coordinationServer: multisigCoordinationServer,
    resolveXprvOfXpub
  }

  const mOfn = new MultisigWallet(spec, options)

  await mOfn.create()
  
  router.push({
    name: 'app-multisig-wallet-view',
    params: {
      wallethash: mOfn.getWalletHash()
    }
  })
}

watch(() => m.value, (newM) => {
  if (n.value < newM) {
    n.value = newM + 1
  }
})

watch(() => n.value, (newN, oldN) => {
  if (newN !== oldN) {
    if (m.value > newN ) {
      m.value = (newN - 1) <= 2 ? 2 : newN - 1
    }
    initializeSigners(newN)
  }
})


onBeforeMount(() => {
  mOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  nOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
})

onMounted(() => {
  onResetClicked()
})

</script>

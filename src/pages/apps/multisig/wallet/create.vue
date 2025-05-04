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
                    v-if="wallet"
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
                      :done="wallet.name"
                      :error="!wallet.name"
                    >
                      <div class="q-gutter-y-md">
                        <q-input v-model="wallet.name" label="Enter wallet name" outlined dense></q-input>
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="wallet.m" :options="mOptionsComputed" :label="$t('Required number of signers')"
                          outlined dense
                        />
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="wallet.n" :options="nOptionsComputed" :label="$t('Total number of signers')"
                          outlined dense
                        />
                      </div>
                      <q-stepper-navigation>
                        <q-btn :disable="!wallet.name" @click="$refs.stepper.next()" color="primary" label="Continue" />
                      </q-stepper-navigation>
                    </q-step>
                    <q-step
                      v-for="(signer, signerIndex) in wallet?.signers"
                      :key="1 + signerIndex"
                      :name="1 + Number(signerIndex)"
                      :title="`Signer ${signerIndex}`"
                      :done="step > 2 + Number(signerIndex)"
                      icon="mdi-account-signerIndex"
                    >
                    <div class="q-gutter-y-md">
                      <q-input
                        :label="`Signer ${signerIndex}'s name`"
                        v-model="wallet.signers[signerIndex].name"
                        outlined dense
                        >
                      </q-input>
                      <q-input
                        label="Paste signer's xpub"
                        v-model="wallet.signers[signerIndex].xpub"
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
                        <q-btn :disable="!wallet.signers[signerIndex].xpub || !wallet.signers[signerIndex].name" @click="$refs.stepper.next()" color="primary" label="Continue" />
                        <q-btn flat @click="$refs.stepper.previous()" color="primary" label="Back" class="q-ml-sm" />
                      </q-stepper-navigation>
                    </q-step>
                    <q-step
                      :name="wallet.n + 2"
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
                            {{ wallet.name }}
                          </q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section>
                            Required Signatures
                          </q-item-section>
                          <q-item-section side>
                            {{ wallet.m }} of {{ wallet.n }}
                          </q-item-section>
                        </q-item>
                        <q-item-label header>Signers</q-item-label>
                        <q-item
                          v-for="signer, signerIndex in wallet.signers"
                          :key="`read-${signerIndex}`"
                          >
                          <q-item-section>
                            <q-item-label>{{ signer.name }}</q-item-label>
                            <q-item-label caption lines="2">
                              {{ shortenString(signer.xpub || '', 25) }}
                            </q-item-label>
                          </q-item-section>
                          <q-item-section side top>
                            <q-item-label caption class="text-italic">Signer {{ signerIndex }}</q-item-label>
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
import { MultisigWallet, shortenString } from 'src/lib/multisig'
import { useMultisigHelpers, cashAddressNetworkPrefix } from 'src/composables/multisig/helpers'
import Watchtower from 'src/lib/watchtower'
import LocalWalletsSelectionDialog from 'components/multisig/LocalWalletsSelectionDialog.vue'

const $store = useStore()
const $q = useQuasar()
const router = useRouter()
const { t: $t } = useI18n()
const { saveMultisigWallet } = useMultisigHelpers()
const mOptions = ref()
const nOptions = ref()
const wallet = ref()
const step = ref(1)

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
  wallet.value.signers[signerIndex] = signer
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
    wallet.value.signers[signerIndex].xpub = selectedWallet.wallet.bch.xPubKey
  })
}
/**
 * <signer #>: { xpub: string, derivationPath: string, name?: string }
 */
const initSigners = ({ n }) => {
  const signers = {}
  for (let i = 0; i < n; i++) {
    const signerIndex = i + 1
    const signer = Object.keys(wallet.value.signers).find((signerEntityIndex) => {
      return signerEntityIndex === signerIndex
    })
    const defaultSigner = {
      xpub: '',
      xprv: '',
      name: ''
    }
    signers[signerIndex] = signer || defaultSigner
  }
  wallet.value.signers = signers
  return signers
}

const initNewWallet = () => {
  wallet.value = {
    signers: {},
    m: 2,
    n: 3,
    name: `My ${2}-of-${3} multisig wallet`
  }
  initSigners({ n: 3 })
  console.log('NEW WALLET', wallet.value)
}

const onResetClicked = () => {
  initNewWallet()
}

const onCreateClicked = async () => {
  console.log('create wallet', wallet.value)
  const multisigWallet = new MultisigWallet(wallet.value)
  const multisigWalletAddress = multisigWallet.getAddress({
    addressIndex: 0, cashAddressNetworkPrefix
  })
  await saveMultisigWallet(wallet.value)
  router.push({
    name: 'app-multisig-wallet-view',
    params: { address: multisigWalletAddress }
  })
}

watch(() => wallet.value?.m, (newM) => {
  if (wallet.value && wallet.value.n < newM) {
    wallet.value.n = newM + 1
  }
  initSigners({ n: wallet.value.n })
})

watch(() => wallet.value?.n, (newN) => {
  initSigners({ n: newN })
})

onBeforeMount(() => {
  mOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  nOptions.value = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  initNewWallet()
})

onMounted(() => {
  const tempVault = $store.getters['global/getVault']
  console.log('TEMPVAULT', tempVault)
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

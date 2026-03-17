<template>
  <q-layout>
    <QrScanner v-model="showQrScanner" @decode="onXPubQrDecoded" />
    <q-dialog v-model="showFinishDialog" full-width full-height>
      <q-card class="pt-card text-bow br-15 text-body1" :class="getDarkModeClass(darkMode)" style="display: flex; flex-direction: column;">
        <q-card-section class="q-pa-md" style="flex: 1; overflow-y: auto;">
          <q-card id="bch-card" class="q-mb-md" style="border-radius: 15px; color:white">
            <div class="flex justify-between items-center q-ma-md">
              <div class="flex items-center q-gutter-x-sm">
                <q-icon name="wallet" size="sm" />
                <span class="text-bold text-h5">{{ name }}</span>
              </div>
            </div>
            <q-card-section class="row items-center justify-between">
              <div class="flex justify-start items-center q-gutter-x-sm">
                <q-icon name="img:bitcoin-cash-circle.svg" size="md" />
                <span class="text-subtitle1">{{ $t('MultisigWallet') }}</span>
              </div>
            </q-card-section>
          </q-card>

          <q-list class="text-bow text-left" :class="getDarkModeClass(darkMode)">
            <q-item>
              <q-item-section>
                <q-item-label class="text-subtitle2">{{ $t('RequiredSignatures') }}</q-item-label>
                <q-item-label caption>{{ m }} of {{ n }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator spaced inset />
            <q-item>
              <q-item-section>
                <q-item-label class="text-subtitle2 q-mb-md">{{ $t('Signers') }}</q-item-label>
                <div class="flex flex-wrap items-center q-gutter-xs">
                  <q-chip
                    v-for="signer, ii in signers"
                    :key="`finish-signer-${ii}`"
                    style="height:fit-content"
                    flat
                    dense
                    class="q-px-md"
                  >
                    <q-avatar>
                      <q-icon v-if="canSignOnDevice(signer.xpub)" name="mdi-account-key" size="sm" style="color:#D4AF37" />
                      <q-icon v-else name="person" size="sm" />
                    </q-avatar>
                    <div class="flex flex-column">
                      <div class="ellipsis" style="max-width:8em">
                        {{ signer.name || `${$t('Signer')} ${ii + 1}` }}
                      </div>
                    </div>
                  </q-chip>
                </div>
              </q-item-section>
            </q-item>
            <q-separator spaced inset />
            <q-item v-if="signersWithXprv.length > 0">
              <q-item-section>
                <q-item-label caption lines="2">
                  {{ $t('CanSignAs', {}, 'You can sign on this device as') }} <span class="text-bold">{{ signersWithXprv.map(s => s.name).join(` ${$t('or')} `) }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md" style="flex-shrink: 0; position: sticky; bottom: 0; background: inherit;">
          <q-btn flat @click="onFinishDialogCancel" color="primary" :label="$t('Cancel')" class="q-mr-sm" />
          <q-btn @click="onCreateClicked" color="primary" :label="$t('Save')" rounded />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" class="sticky-header-container multisig-app" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('SetupWallet')"
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
                    class="text-bow"
                    :class="getDarkModeClass(darkMode)"
                    style="background-color: inherit !important"
                    vertical
                  >
                    <q-step
                      :name="1"
                      :title="$t('BasicConfig')"
                      icon="settings"
                      :done="!!name"
                      :error="!name"
                    >
                      <div class="q-gutter-y-md">
                        <q-input v-model="name" :label="$t('EnterWalletName')" clearable filled></q-input>
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="m" :options="mOptionsComputed" :label="$t('Required number of signers')"
                          filled
                        />
                        <q-select
                          :popup-content-class="darkMode ? '': 'text-black'"
                          v-model="n" :options="nOptionsComputed" :label="$t('Total number of signers')"
                          filled
                        />
                      </div>
                      <q-stepper-navigation>
                        <q-btn :disable="!name" @click="$refs.stepper.next()" color="primary" :label="$t('Continue')" rounded/>
                      </q-stepper-navigation>
                    </q-step>
                    <q-step

                      v-for="signer, i in signers"
                      :key="2 + i"
                      :name="2 + Number(i)"
                      :title="`${$t('Signer')} ${1 + i}`"
                      :done="step > 2 + Number(i)"
                      icon="mdi-account-signerIndex"
                    >
                    <div class="q-gutter-y-md">
                      <q-input
                        :label="`${$t('SignerNamePlaceholder', {index: 1 + i }, `Signer ${1 + i}'s name`)}`"
                        v-model="signer.name"
                        filled
                        hide-bottom-space
                        :rules="[val => !val || isNameUnique(val, i) || $t('SignerNameMustBeUnique', {}, 'Signer name must be unique')]"
                      />
                      <q-input
                        :label="$t('PasteSignerXpub')"
                        v-model="signer.xpub"
                        filled
                        clearable
                        hide-bottom-space
                        :rules="[
                          val => !val || (val.startsWith('xpub') || val.startsWith('tpub')) || $t('InvalidXpubFormat'),
                          val => !val || isXpubUnique(val, i) || $t('XpubMustBeUnique', {}, 'xpub must be unique')
                        ]"
                      >
                        <template v-slot:append>
                          <div class="flex q-gutter-xm-sm">
                            <q-btn
                              @click="() => openLocalWalletsSelectionDialog({ signer, signerIndex: i })"
                              icon="mdi-form-select"
                              round
                            />
                            <q-btn
                              @click="() => scanXPub(i)"
                              round icon="mdi-qrcode-scan"
                            />  
                          </div>
                        </template>
                      </q-input>
                      <q-input 
                        v-model="signer.masterFingerprint" 
                        :label="$t('EnterMasterFingerprint')" 
                        filled 
                        :rules="[
                          val => !val || val.length === 8 || $t('MasterFingerprintMustBe8Chars'),
                          val => !val || isMasterFingerprintUnique(val, i) || $t('MasterFingerprintMustBeUnique', {}, 'Master fingerprint must be unique')
                        ]"
                      />
                    </div>
                    <q-stepper-navigation>
                        <q-btn :disable="!signer.xpub || !signer.name || !signer.masterFingerprint || !isXpubUnique(signer.xpub, i) || !isNameUnique(signer.name, i) || !isMasterFingerprintUnique(signer.masterFingerprint, i)" @click="onLastSignerContinue(i)" color="primary" :label="$t('Continue')" rounded/>
                        <q-btn flat @click="$refs.stepper.previous()" color="primary" :label="$t('Back')" class="q-ml-sm" />
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
import { useTieredLimitGate } from 'src/composables/useTieredLimitGate'
import { loadWallet } from 'src/wallet'
import { binToHex } from 'bitauth-libauth-v3'
import QrScanner from 'src/components/qr-scanner.vue'

const $store = useStore()
const $q = useQuasar()
const router = useRouter()
const { t: $t } = useI18n()
const { 
  multisigCoordinationServer, 
  multisigNetworkProvider, 
  resolveXprvOfXpub,
  getWalletsFromVault
} = useMultisigHelpers()
const { ensureCanPerformAction } = useTieredLimitGate()
const mOptions = ref()
const nOptions = ref()
const wallet = ref()
const step = ref(1)

const name = ref('')
const m = ref(0)
const n = ref(0)
const signers = ref([])
const showQrScanner = ref(false)
const currentSignerIndex = ref(null)
const localWallets = ref([])
const showFinishDialog = ref(false)

const mOptionsComputed = computed(() => {
  return mOptions.value
})

const nOptionsComputed = computed(() => {
  return nOptions.value
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const canSignOnDevice = computed(() => {
  return (xpub) => {
    return localWallets.value.some(w => w.xpub === xpub)
  }
})

const signersWithXprv = computed(() => {
  if (!signers.value) return []
  return signers.value.filter(s => canSignOnDevice.value(s.xpub))
})

const isNameUnique = (name, currentIndex) => {
  return !signers.value.some((s, i) => i !== currentIndex && s.name === name)
}

const isXpubUnique = (xpub, currentIndex) => {
  return !signers.value.some((s, i) => i !== currentIndex && s.xpub === xpub)
}

const isMasterFingerprintUnique = (fingerprint, currentIndex) => {
  return !signers.value.some((s, i) => i !== currentIndex && s.masterFingerprint === fingerprint)
}


const openLocalWalletsSelectionDialog = ({ signer, signerIndex }) => {
  $q.dialog({
    component: LocalWalletsSelectionDialog,
    componentProps: {
      signerIndex: signerIndex,
      signerName: signer.name
    }

  }).onOk(async (selectedWallet) => {
    signers.value[signerIndex].xpub = selectedWallet.xpub
    signers.value[signerIndex].masterFingerprint = selectedWallet.masterFingerprint
    if (!signers.value[signerIndex].name) {
      signers.value[signerIndex].name = selectedWallet.name
    }
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

const scanXPub = (signerIndex) => {
  currentSignerIndex.value = signerIndex
  showQrScanner.value = true
}

const onXPubQrDecoded = (content) => {
  showQrScanner.value = false
  
  const decoded = Array.isArray(content) ? content?.[0]?.rawValue : content
  const xpub = typeof decoded === 'string' ? decoded.trim() : ''
  
  if (!xpub) {
    $q.notify({
      type: 'negative',
      message: $t('NoQrDetected'),
      timeout: 2000,
      position: 'top'
    })
    return
  }
  
  if (!xpub.startsWith('xpub') && !xpub.startsWith('tpub')) {
    $q.notify({
      type: 'negative',
      message: $t('InvalidXpubFormat'),
      timeout: 2000,
      position: 'top'
    })
    return
  }
  
  if (currentSignerIndex.value !== null) {
    signers.value[currentSignerIndex.value].xpub = xpub
    $q.notify({
      type: 'positive',
      message: $t('XpubScanned'),
      timeout: 1500,
      position: 'top'
    })
  }
  
  currentSignerIndex.value = null
}

const onLastSignerContinue = (signerIndex) => {
  if (signerIndex === n.value - 1) {
    showFinishDialog.value = true
  } else {
    step.value = step.value + 1
  }
}

const onFinishDialogCancel = () => {
  showFinishDialog.value = false
  step.value = n.value + 1
}

const onResetClicked = () => {
  m.value = 2
  n.value = 3
  name.value = `My ${m.value} of ${n.value} wallet`
  initializeSigners(n.value)
}

const onCreateClicked = async () => {
  const canCreate = await ensureCanPerformAction('multisigWallets', { darkMode: darkMode.value, forceRefresh: true })
  if (!canCreate) return

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

onMounted(async () => {
  onResetClicked()
  localWallets.value = await getWalletsFromVault()
})

</script>

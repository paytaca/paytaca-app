<template>
    <QrScanner v-model="showQrScanner" @decode="onQrDecoded" />
    <q-layout view="lHh Lpr lFf">
      <q-pull-to-refresh
        id="app-container"
        class="multisig-app"
        :class="getDarkModeClass(darkMode)"
        @refresh="refreshPage"
      >
        <HeaderNav
          :backnavpath="`/apps/multisig/wallet/${route?.params?.wallethash}/nfts/${route.params.tokenid}`"
          class="apps-header"
        />
        <q-page-container>
          <q-page class="q-pa-none">
            <div class="row justify-center">
              <div class="col-xs-12 col-sm-8 q-px-xs q-mb-lg" style="padding-bottom: 100px;">
            <template v-if="wallet">
                <div class="row">
                  <div class="col-xs-12 flex items-center justify-center text-bold text-h6">
                    {{ $t('SendNft', {}, 'Send NFT') }}
                  </div>
                  <div class="col-xs-12 text-center q-mt-sm">
                    <q-card flat class="nft-info-card q-mx-auto" :class="getDarkModeClass(darkMode)">
                      <q-card-section class="text-center">
                        <q-avatar color="primary" text-color="white" size="64px" class="q-mb-sm">
                          <q-icon name="image" size="40px"></q-icon>
                        </q-avatar>
                        <div class="text-subtitle1 text-weight-bold">{{ nftInfo?.token_name || 'Unnamed NFT' }}</div>
                        <div class="text-caption text-bow-muted">{{ nftInfo?.token_ticker || '' }}</div>
                        <div class="text-caption text-bow-muted q-mt-xs">
                          {{ $t('TokenId', {}, 'Token ID') }}: {{ shortenString(route.params.tokenid, 16) }}
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
                <q-list>
                  <q-item>
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="text-bold">{{ $t('From') }}</div>
                        <q-input :model-value="wallet.name" dense :hint="shortenString(`${wallet.getWalletHash()}`, 20)" disable>
                          <template v-slot:prepend>
                            <q-btn icon="wallet" flat dense></q-btn>
                          </template>
                        </q-input>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="text-bold">{{ $t('Purpose') }}</div>
                        <q-input v-model="purpose" type="textarea" rows="3" filled autogrow hint clearable :disable="isCreatingProposal"></q-input>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="!isNftPreselected">
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="text-bold">{{ $t('SelectNft', {}, 'Select NFT to Send') }}</div>
                        <q-select
                          v-model="selectedNft"
                          :options="nftOptions"
                          option-label="label"
                          option-value="value"
                          filled
                          dense
                          :disable="isCreatingProposal"
                          :loading="loadingNfts"
                        >
                          <template v-slot:prepend>
                            <q-icon name="image"></q-icon>
                          </template>
                          <template v-slot:option="scope">
                            <q-item v-bind="scope.itemProps">
                              <q-item-section avatar>
                                <q-avatar color="primary" text-color="white" size="32px">
                                  <q-icon name="image" size="20px"></q-icon>
                                </q-avatar>
                              </q-item-section>
                              <q-item-section>
                                <q-item-label>{{ scope.opt.label }}</q-item-label>
                                <q-item-label caption>{{ scope.opt.commitment || 'No commitment' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </template>
                        </q-select>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-else>
                    <q-item-section>
                      <q-item-label class="q-gutter-y-md">
                        <div class="text-bold">{{ $t('SelectedNft', {}, 'Selected NFT') }}</div>
                        <q-card flat class="selected-nft-card" :class="getDarkModeClass(darkMode)">
                          <q-card-section class="q-pa-sm">
                            <div class="flex items-center q-gutter-x-sm">
                              <q-avatar color="primary" text-color="white" size="40px">
                                <q-icon name="image" size="24px"></q-icon>
                              </q-avatar>
                              <div>
                                <div class="text-weight-medium">{{ selectedNft?.label }}</div>
                                <!-- <div class="text-caption text-bow-muted">{{ shortenString(selectedNft?.value?.txid, 8) }}:{{ selectedNft?.value?.vout }}</div> -->
                              </div>
                            </div>
                          </q-card-section>
                        </q-card>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label class="text-bold">
                        {{ $t('Recipients') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-item-label side>
                        {{ $t('TotalRecipients', {}, 'Recipients') }}: {{ recipients.length }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-for="recipient,i in recipients" :key="`recipient-${i}`" :ref="el => { if (el) recipientRefs[i] = el.$el || el }">
                    <q-item-section>
                      <q-item-label :class="addressInputRefs[i]? 'q-gutter-y-md': ''">
                        <div class="flex justify-between items-center">
                            <span class="text-italic">{{ $t('RecipientLabel') }} {{ i + 1 }}</span>
                            <q-btn v-if="i > 0" @click="removeRecipient(i)" icon="remove" color="red" flat dense :disable="isCreatingProposal"></q-btn>
                        </div>
                        <q-input
                          v-model="recipient.address" :label="`${$t('PasteAddressOfRecipient')} ${i + 1}`"
                          :rules="recipientRules"
                          clearable
                          filled dense
                          :disable="isCreatingProposal"
                          :ref="el => { if (el) addressInputRefs[i] = el }">
                          <template v-slot:append>
                             <q-btn icon="qr_code_scanner" flat dense @click="openQrScanner(i)" :disable="isCreatingProposal"></q-btn>
                           </template>
                        </q-input>
                      </q-item-label>
                      <q-separator class="q-my-sm"/>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section></q-item-section>
                    <q-item-section side>
                      <div class="text-right">
                        <q-btn 
                          @click="addRecipient()" 
                          icon="add" 
                          color="primary" 
                          :label="$t('AddRecipient')" 
                          :disable="isCreatingProposal || recipients.length >= availableNfts.length" 
                          flat dense no-caps>
                        </q-btn>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
            </template>
          </div>
            </div>
          </q-page>
        </q-page-container>
      </q-pull-to-refresh>
      <div class="sticky-bottom-actions">
        <q-btn
          :loading="isCreatingProposal"
          style="width: 100%; filter: opacity((100%))"
          color="primary"
          :disable="!sendable"
          class="text-bold q-py-md"
          no-caps
          rounded
          unelevated
          icon="mdi-note-plus-outline"
          @click="createProposal"
          >
          {{ $t('CreateProposal') }}
        </q-btn>
      </div>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref, nextTick, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import QrScanner from 'src/components/qr-scanner.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  MultisigWallet,
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { decodeCashAddress } from 'bitauth-libauth-v3'
import { generateCosignerAuthPublicKeyFromFromXpub } from 'src/lib/multisig/coordination'
import { watchtowerUtxoToCommonUtxo } from 'src/lib/multisig/utxo'
const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const recipients = ref([])
const purpose = ref('')
const recipientRefs = ref([])
const addressInputRefs = ref([])
const isCreatingProposal = ref(false)
const loadingNfts = ref(false)
const availableNfts = ref([])
const selectedNft = ref(null)
const nftInfo = ref(null)
const showQrScanner = ref(false)
const currentRecipientIndex = ref(null)

const {
  multisigNetworkProvider,
  multisigCoordinationServer,
  resolveXprvOfXpub,
  resolveMnemonicOfXpub,
  getSignerWalletFromVault
} = useMultisigHelpers()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      store: $store,
      provider: multisigNetworkProvider,
      coordinationServer: multisigCoordinationServer,
      resolveXprvOfXpub,
      resolveMnemonicOfXpub
    })
  }
  return null
})

const nftOptions = computed(() => {
  return availableNfts.value.map((nft, index) => ({
    label: `NFT #${index + 1} - ${nft.commitment || 'No commitment'}`,
    value: nft,
    commitment: nft.commitment,
    txid: nft.txid,
    vout: nft.vout
  }))
})

const isNftPreselected = computed(() => {
  return route.query.txid && route.query.vout !== undefined
})

const recipientRules = computed(() => {
  const correctAddressFormat = (v) => {
    const decoded = decodeCashAddress(v)
    if (typeof decoded === 'string') {
      return decoded
    }
    if (!decoded.type?.toLowerCase().includes('withtokens')) {
      return $t('TokenAddressRequired', {}, 'Token-enabled address required')
    }
    return true
  }
  return [correctAddressFormat]
})

const sendable = computed(() => {
  const hasAddressErrors = addressInputRefs.value.some(ref => ref?.hasError === true)
  
  return (
    selectedNft.value !== null &&
    recipients.value?.every(r => Boolean(r.address)) && 
    recipients.value?.length > 0 &&
    recipients.value?.length <= availableNfts.value.length &&
    !hasAddressErrors
  )
})

const removeRecipient = (index) => {
  recipients.value.splice(index, 1)
  recipientRefs.value.splice(index, 1)
  addressInputRefs.value.splice(index, 1)
}

const addRecipient = async () => {
  if (recipients.value.length >= availableNfts.value.length) return
  
  recipients.value.push({
    address: '',
    asset: route.params.tokenid
  })
  
  await nextTick()
  const newIndex = recipients.value.length - 1
  
  if (recipientRefs.value[newIndex]) {
    const element = recipientRefs.value[newIndex]
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    
    setTimeout(() => {
      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      if (rect.bottom > viewportHeight - 100) {
        const scrollOffset = rect.bottom - viewportHeight + 150
        window.scrollBy({ top: scrollOffset, behavior: 'smooth' })
      }
    }, 300)
  }
  
  if (addressInputRefs.value[newIndex]) {
    await nextTick() 
    addressInputRefs.value[newIndex].focus()
  }
}

const openQrScanner = (recipientIndex) => {
  currentRecipientIndex.value = recipientIndex
  showQrScanner.value = true
}

const onQrDecoded = (content) => {
  showQrScanner.value = false
  
  const decoded = Array.isArray(content) ? content?.[0]?.rawValue : content
  const address = typeof decoded === 'string' ? decoded.trim() : ''
  
  if (!address || currentRecipientIndex.value === null) {
    return
  }
  
  recipients.value[currentRecipientIndex.value].address = address
}

const loadNfts = async () => {
  if (!wallet.value) return
  loadingNfts.value = true
  try {
    const result = await wallet.value.getWalletHashUtxos('nft')
    const allNfts = result || []
    availableNfts.value = allNfts.filter(nft => nft.tokenid === route.params.tokenid)
    
    if (availableNfts.value.length > 0) {
      nftInfo.value = availableNfts.value[0]
      
      if (isNftPreselected.value) {
        const preselectedNft = availableNfts.value.find(
          nft => nft.txid === route.query.txid && nft.vout === parseInt(route.query.vout)
        )
        if (preselectedNft) {
          const preselectedOption = nftOptions.value.find(
            opt => opt.value.txid === preselectedNft.txid && opt.value.vout === preselectedNft.vout
          )
          selectedNft.value = preselectedOption || nftOptions.value[0]
        } else {
          selectedNft.value = nftOptions.value[0]
        }
      } else {
        selectedNft.value = nftOptions.value[0]
      }
    }
  } catch (error) {
    console.error('Error loading NFTs:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Failed to load NFTs'
    })
  } finally {
    loadingNfts.value = false
  }
}

const createProposal = async () => {
  try {
    isCreatingProposal.value = true
    let creator = ''
    for (const signer of wallet.value.signers) {
      const signerWallet = await getSignerWalletFromVault({ xpub: signer.xpub })
      if (signerWallet) {
        creator = generateCosignerAuthPublicKeyFromFromXpub({ xpub: signer.xpub })
      }
    }

    const nftRecipients = recipients.value.map(recipient => ({
      address: recipient.address,
      amount: selectedNft.value.value.amount, // Retain NFT token amount
      asset: route.params.tokenid,
      targetNftUtxo: watchtowerUtxoToCommonUtxo(selectedNft.value.value)
    }))
    
    const options = {
      store: $store,
      provider: multisigNetworkProvider,
      coordinationServer: multisigCoordinationServer
    }
    
    const proposal = await wallet.value.createProposal({
      creator: creator,
      origin: 'paytaca-wallet',
      purpose: purpose.value,
      recipients: nftRecipients
    }, 'send-non-fungible-assets')
    
    await proposal.save()
    
    if (wallet.value.isOnline()) {
      await proposal.upload()
    }

    router.push({ 
      name: 'app-multisig-wallet-pst-view', 
      params: { unsignedtransactionhash: proposal.unsignedTransactionHash }
    })

  } catch (error) {
    $q.dialog({
      message: error,
      class: `q-my-md pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)}`,
      ok: {
        rounded: true,
        padding: 'xs md',
        color: 'primary',
        label: $t('OK')
      }
    })
  } finally {
    isCreatingProposal.value = false
  }
}

const refreshPage = async (done) => {
  try {
    await loadNfts()
  } catch (error) {
    console.error('Error refreshing page:', error)
  } finally {
    if (done) done()
  }
}

onBeforeMount(async () => {
  await loadNfts()
  addRecipient()
})

onMounted(async () => {
  purpose.value = `${$t('SendNft', {}, 'Send NFT')}: ${nftInfo.value?.token_name || 'NFT'}`
})
</script>

<style scoped>
.sticky-bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
  z-index: 10;
  background: transparent;
}

.sticky-bottom-actions .text-red {
  color: var(--q-negative);
}

.nft-info-card {
  max-width: 300px;
  border-radius: 12px;
}

.nft-info-card.light {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.nft-info-card.dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.selected-nft-card {
  border-radius: 8px;
}

.selected-nft-card.light {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.selected-nft-card.dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>

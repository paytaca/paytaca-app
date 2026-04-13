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
          :backnavpath="`/apps/multisig/wallet/${route?.params?.wallethash}`"
          class="apps-header"
        />
        <q-page-container>
          <q-page class="q-pa-none">
            <div class="row justify-center">
              <div class="col-xs-12 col-sm-8 q-px-xs q-mb-lg" style="padding-bottom: 100px;">
            <template v-if="wallet">
                <div class="row">
                  <div class="col-xs-12 flex items-center justify-center text-bold text-h6">
                    {{ $t('Send') }} {{ assetHeaderName }}
                  </div>
                </div>
                <q-card id="bch-card" class="q-ma-md br-15" style="color:white">
                  <q-card-section>
                    <div class="row q-gutter-y-md">
                      <div class="col-xs-12 text-center">
                        <div :class="getDarkModeClass(darkMode)">{{ $t('AvailableBalance') }}</div>
                        <div class="flex items-center justify-center q-gutter-x-sm">
                          <q-avatar v-if="assetHeaderIcon?.startsWith('http')" size="sm">
                            <img :src="assetHeaderIcon">
                          </q-avatar>
                          <q-icon v-else
                            :name="assetHeaderIcon"
                            size="sm"
                            :color="assetHeaderIcon === 'token'? 'grey': '' "
                          />
                          <span v-if="route.query.asset === 'bch'" style="font-size: 2em">
                            {{ (availableBalance ?? 0 ) > 0 ? availableBalance?.toFixed(8): '0'}}
                          </span>
                          <span v-else style="font-size: 2em">
                            {{ (availableBalance ?? 0 ) > 0 ? availableBalance?.toFixed(assetTokenIdentity?.token?.decimals || 0): '0'}}
                          </span>
                        </div>
                        <div v-if="route.query.asset === 'bch'" >{{ (availableBalance ?? 0 ) > 0 && assetPrice ? `=${assetPrice}` : '' }}</div>
                      </div>
                      <div v-if="walletWcSessionHistory?.length > 0 && walletWcAccountUtxos?.length > 0" class="col-xs-12">
                        <div class="text-center">
                          <span class="text-bold">{{ $t('WalletConnectReservedFunds') }}:</span> {{ walletWcReserveFunds ?? 0 }} {{ assetHeaderName }}
                          <q-btn flat dense size="sm" color="primary" icon="help_outline" @click="showWcHeldFundsDialog = true" />
                        </div>
                        <div class="text-center text-italic">
                          <q-checkbox 
                            v-model="reserveWcAccountUtxos" 
                            :label="$t('WcExcludeReservedFundsLabel', {}, 'Exclude Wallet Connect reserved funds on this tx.')" 
                            dense
                            class="q-mt-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
                <q-dialog v-model="showWcHeldFundsDialog">
                  <q-card class="pt-card text-bow br-15" :class="getDarkModeClass(darkMode)">
                    <q-card-section>
                      <div class="text-h6">{{ $t('WalletConnectReservedFunds') }}</div>
                    </q-card-section>
                    <q-card-section class="q-pt-none text-justify">
                      <p>{{ $t('WcHeldFundsExplanation', {}, 'Paytaca remembers your previous WalletConnect app sessions and automatically designates the funds in your primary account (address 0) as "Wallet Connect Reserved Funds". This ensures the peer app can reliably re-use the specific funds (UTXOs) it identified when you first connected.') }}</p>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn flat :label="$t('Close')" color="primary" v-close-popup />
                    </q-card-actions>
                  </q-card>
                </q-dialog>
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
                        <q-input 
                          v-model="purpose" 
                          type="textarea" 
                          rows="3" filled autogrow hint clearable :disable="isCreatingProposal" hide-bottom-space></q-input>
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
                      <q-item-label side :class="totalAmount && totalAmount > balance  ? 'text-red' : ''">
                        {{ $t('TotalAmount') }}: {{ totalAmount }}
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
                          filled 
                          :disable="isCreatingProposal"
                          @focus="onAddressFocus"
                          :ref="el => { if (el) addressInputRefs[i] = el }"
                          hide-bottom-space
                        >
                        <template v-slot:append>
                             <q-btn icon="qr_code_scanner" flat dense @click="openQrScanner(i)" :disable="isCreatingProposal"></q-btn>
                           </template>
                        </q-input>
                        <q-input
                          v-model="recipient.amount" :label="$t('Amount')"
                          filled 
                          :hint="assetDecimalsHint"
                          :rules="amountRules"
                          clearable
                          :disable="isCreatingProposal"
                          inputmode="none"
                          @focus="onAmountFocus(i)"
                          :ref="el => { if (el) amountInputRefs[i] = el }"
                          >
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
                          :disable="isCreatingProposal" 
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
      <div class="sticky-bottom-actions" v-if="customKeyboardState !== 'show'">
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
      <CustomKeyboard
        :custom-keyboard-state="customKeyboardState"
        v-on:addKey="setAmount"
        v-on:makeKeyAction="makeKeyAction"
      />
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref, nextTick, onBeforeMount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import Big from 'big.js'
import HeaderNav from 'components/header-nav'
import QrScanner from 'src/components/qr-scanner.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseKey, adjustSplicedAmount } from 'src/utils/custom-keyboard-utils'
import {
  shortenString,
  MultisigWallet,
} from 'src/lib/multisig'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { decodeCashAddress } from 'bitauth-libauth-v3'
import { generateCosignerAuthPublicKeyFromXpub } from 'src/lib/multisig/coordination'

const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const {
  multisigNetworkProvider,
  multisigCoordinationServer,
  network,
  getAssetTokenIdentity,
  resolveXprvOfXpub,
  resolveMnemonicOfXpub,
  getSignerWalletFromVault
} = useMultisigHelpers()

const balance = ref()
const balanceConvertionRates = ref()
const recipients = ref([])
const purpose = ref('')
const recipientRefs = ref([])
const addressInputRefs = ref([])
const amountInputRefs = ref([])
const isCreatingProposal = ref(false)
const walletWcSessionHistory = ref([])
const walletWcAccountUtxos = computed(() => {
  return wallet.value?.utxos?.filter(u => u.addressPath === '0/0' || u.address_path === '0/0') || []
})
const walletWcReserveFunds = computed(() => {
  if (walletWcSessionHistory.value?.length > 0 && reserveWcAccountUtxos.value !== false) {
    const defaultAddressUtxos = walletWcAccountUtxos.value
    const asset = route.query.asset
    if (!asset || asset === 'bch') {
      return defaultAddressUtxos.filter(u => !u.token).reduce((b, u) => b + (u.satoshis || 0), 0) / 1e8
    }
    const tokenReserveFunds = defaultAddressUtxos.filter(u => u.token && u.token?.category === asset).reduce((b, u) => b + (u.token?.amount || 0), 0)
    return Big(tokenReserveFunds).div(`1e${assetTokenIdentity.value?.token?.decimals || 0}`).toString()
  }
  return undefined
})

const availableBalance = computed(() => {
  return (balance.value ?? 0) - (walletWcReserveFunds.value ?? 0)
})

const showWcHeldFundsDialog = ref(false)
const reserveWcAccountUtxos = ref(true)
const showQrScanner = ref(false)
const currentRecipientIndex = ref(null)
const customKeyboardState = ref('dismiss')
const focusedInputField = ref('')

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})
const assetTokenIdentity = ref()
const wallet = ref()

const assetHeaderName = computed(() => {
  if (route.query.asset === 'bch') return 'BCH'
  if (assetTokenIdentity.value?.token?.symbol) return assetTokenIdentity.value?.token?.symbol
  return shortenString(route.query.asset, 10)
})

const assetHeaderIcon = computed(() => {
  if (route.query.asset === 'bch') return 'img:bitcoin-cash-circle.svg'
  if (assetTokenIdentity.value?.uris?.icon?.includes('nftstorage.link') || assetTokenIdentity.value?.uris?.icon?.startsWith('ipfs://')) {
    return `https://cashtokens.studio/api/ipfs-image?url=${encodeURIComponent(assetTokenIdentity.value?.uris?.icon)}`
  }
  return assetTokenIdentity.value?.uris?.icon || 'token'
})

const assetDecimalsHint = computed(() => {
  if (route.query.asset === 'bch') return ''
  if (assetTokenIdentity.value?.token?.decimals === undefined) {
    return $t('CautionUnableToGetDecimals')
  }
  return `${$t('DecimalPlaces')}: ${assetTokenIdentity.value.token.decimals}`
})

const recipientRules = computed(() => {

  const correctAddressFormat = (v) => {
    if (!v) return true
    const decoded = decodeCashAddress(v)
    if (typeof decoded === 'string') {
      return decoded
    }
    if (route.query.asset === 'bch') {
      if (decoded.type?.toLowerCase().includes('withtokens')) {
        return $t('BCHAddressRequired')
      }
    } else {
      if (!decoded.type?.toLowerCase().includes('withtokens')) {
        return $t('TokenAddressRequired')
      }
    }
    return true
  }

  return [correctAddressFormat]
})

const DUST_LIMIT = 546

const amountRules = computed(() => {
  let rules = [
    v => ( v?.length === 0 || /^(\d+)?\.?(\d+)?$/.test(v)) || $t('InvalidValue'),
    v => {
      if (!v) return true
      if (route.query.asset !== 'bch') {
        return (Number(v) <= availableBalance.value) || $t('ValueExceedsBalance') 
      }
      if (route.query.asset === 'bch') {
        return (Number(v) < availableBalance.value) || $t('ValueExceedsBalance') 
      }
      return true
    },
    v => {
      if (v === '' || v === undefined) return true
      const sats = Math.round(v * 1e8);
      if (sats < DUST_LIMIT) return $t('DustAmountError');
      return true;
    }
  ]
  if (route.query.asset !== 'bch') {
    if (assetTokenIdentity.value?.token?.decimals === undefined || assetTokenIdentity.value?.token?.decimals === 0) {
      rules = rules.concat([
        v => (v==='' || Number(v) >= 1)  || $t('TokenHasNoDecimals'),
        v => !v.includes('.') || $t('TokenNoDecimalsInvalid')
      ])
    }
  }
  return rules
})

const totalAmount = computed(() => {
  try {
    return recipients.value.reduce((total, nextR) => {
      total = Big(total).add(nextR.amount || 0)
      return total
    }, '0')  
  } catch (error) {
    return '!'
  }
})

const assetPrice = computed(() => {
  if (balanceConvertionRates.value?.length > 0) {
    const b = balanceConvertionRates.value?.find(priceData => (
       priceData.relative_currency?.toLowerCase() === route.query.asset
    ))
    if (!b) return ''
    return b[`assetPriceIn${b.currency}Text`]
  }
})

const sendable = computed(() => {
  const hasAmountErrors = amountInputRefs.value.some(ref => ref?.hasError === true)
  const hasAddressErrors = addressInputRefs.value.some(ref => ref?.hasError === true)
  
  return (
    recipients.value?.every(r => Boolean(r.address)) && 
    recipients.value?.every(r => Boolean(r.amount)) &&
    recipients.value?.length > 0 &&
    totalAmount.value !== '!' &&
    totalAmount.value > 0 &&  
    balance.value > totalAmount.value &&
    !hasAmountErrors &&
    !hasAddressErrors
  )
})

const removeRecipient = (index) => {
  recipients.value.splice(index, 1)
  recipientRefs.value.splice(index, 1)
  addressInputRefs.value.splice(index, 1)
  amountInputRefs.value.splice(index, 1)
}

const addRecipient = async () => {
  recipients.value.push({
    address: '',
    amount: '',
    asset: route.query.asset
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
        const scrollOffset = rect.bottom - viewportHeight + 150 // 150px padding for footer
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

const onAmountFocus = (index) => {
  currentRecipientIndex.value = index
  focusedInputField.value = 'amount'
  customKeyboardState.value = 'show'
}

const onAddressFocus = () => {
  focusedInputField.value = ''
  customKeyboardState.value = 'dismiss'
}

const asset = computed(() => {
  if (route.query.asset === 'bch') {
    return { id: 'bch', symbol: 'BCH', decimals: 8 }
  }
  return {
    id: route.query.asset,
    symbol: assetHeaderName.value,
    decimals: assetTokenIdentity.value?.token?.decimals ?? 8
  }
})

const setAmount = (key) => {
  if (focusedInputField.value !== 'amount') return
  const recipient = recipients.value[currentRecipientIndex.value]
  if (!recipient) return
  const currentRef = amountInputRefs.value[currentRecipientIndex.value]
  const caret = currentRef?.nativeEl?.selectionStart
  recipient.amount = parseKey(key, recipient.amount, caret, asset.value)
}

const makeKeyAction = (action) => {
  if (focusedInputField.value !== 'amount') return
  const recipient = recipients.value[currentRecipientIndex.value]
  if (!recipient) return
  const currentRef = amountInputRefs.value[currentRecipientIndex.value]

  if (action === 'backspace') {
    const caret = (currentRef?.nativeEl?.selectionStart ?? recipient.amount.length) - 1
    recipient.amount = adjustSplicedAmount(recipient.amount, caret)
  } else if (action === 'delete') {
    recipient.amount = ''
  } else {
    customKeyboardState.value = 'dismiss'
    focusedInputField.value = ''
    nextTick(() => currentRef?.blur())
  }
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

const createProposal = async () => {
  try {
    isCreatingProposal.value = true
    let creator = ''
    for (const signer of wallet.value.signers) {
      const signerWallet = await getSignerWalletFromVault({ xpub: signer.xpub })
      if (signerWallet) {
        creator = generateCosignerAuthPublicKeyFromXpub({ xpub: signer.xpub })
      }
    }

    if (route.query.asset !== 'bch' && Number(assetTokenIdentity.value?.token?.decimals || 0) > 0) {
      recipients.value.forEach((r) => {
        r.decimals =  Number(assetTokenIdentity.value.token.decimals)
      })
    }

    const proposal = await wallet.value.createProposal({
      creator: creator,
      origin: 'paytaca-wallet',
      purpose: purpose.value,
      recipients: recipients.value,
      reserveWcAccountUtxos: reserveWcAccountUtxos.value
    })  
      
    if (wallet.value.isOnline()) {
      await proposal.upload()
    }
    await proposal.save()
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
    if (wallet.value) {
      balance.value = await wallet.value.getWalletBalance(route.query.asset)
      balanceConvertionRates.value = 
        await wallet.value.convertBalanceToCurrencies(
          route.query.asset,
          balance.value,
          [$store.getters['market/selectedCurrency'].symbol]
        )
    }
  } catch (error) {
    $q.notify({
      title: $t('Warning'),
      color: 'warning',
      textColor: 'black',
      message: error.message,
    })
  } finally {
    if (done) done()
  }
}

const initWallet = () => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    wallet.value = MultisigWallet.importFromObject(savedWallet, {
      store: $store,
      provider: multisigNetworkProvider,
      coordinationServer: multisigCoordinationServer,
      resolveXprvOfXpub,
      resolveMnemonicOfXpub
    })
  }
}

watch(() => wallet.value?.id, async (walletId) => {
  if (walletId) {
    walletWcSessionHistory.value = await wallet.value?.options?.coordinationServer?.getWalletWcSessions({
      walletIdentifier: wallet.value?.id
    })
    
    if (!walletWcSessionHistory.value || walletWcSessionHistory.value?.length === 0) {
      reserveWcAccountUtxos.value = false  
      return
    }
    reserveWcAccountUtxos.value = wallet.value?.settings?.reserveWcAccountUtxos !== false
  }
}, { immediate: true })

watch(reserveWcAccountUtxos, () => {
  amountInputRefs.value.forEach(ref => ref?.validate?.())
}, { immediate: true })


onBeforeMount(async () => {
  initWallet()
  addRecipient()
})

onMounted(async () => {
  balance.value = await wallet.value.getWalletBalance(route.query.asset)
  balanceConvertionRates.value = 
      await wallet.value.convertBalanceToCurrencies(
        route.query.asset,
        balance.value,
        [$store.getters['market/selectedCurrency'].symbol]
      )
  
  assetTokenIdentity.value = await getAssetTokenIdentity(route.query.asset)
  if (route.query.asset !== 'bch' && 
    assetTokenIdentity.value?.token?.decimals && 
    Number(assetTokenIdentity.value?.token?.decimals) > 0) {
    balance.value = Big(balance.value).div(`1e${assetTokenIdentity.value.token.decimals}`).toString()
  }

  await wallet.value.subscribeWalletAddressIndex(wallet.value.getLastUsedChangeAddressIndex(network) + 1, 'change')
  purpose.value = `${$t('Send')} ${assetHeaderName.value}`
})
</script>

<style scoped>
/* .light {
  color: #141414;
} */
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

.sticky-bottom-spacer {
  height: 100px;
}
</style>
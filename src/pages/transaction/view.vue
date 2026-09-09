<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('TransactionProposal', {}, 'Transaction Proposal')" :backnavpath="backNavPath" class="header-nav" />
    <div class="row justify-center">
      <div class="col-xs-12 q-px-xs" v-if="unsignedTx">
        <div class="row q-mb-xs justify-center">
          <div class="col-xs-12">
            <q-card id="bch-card" class="q-ma-md" style="border-radius: 15px; color:white">
              <q-card-section>
                <div class="text-bold text-h6 ellipsis">{{ purpose || $t('PurposeNotSpecified', {}, 'Purpose Not Specified') }}</div>
                <div class="text-caption flex items-center">
                  <span>{{ $t('UnsignedHash', {}, 'Unsigned Hash') }} : {{ shortenString(unsignedTransactionHash, 20) }}</span>
                  <q-btn flat dense size="sm" icon="content_copy" color="white" class="q-ml-xs" @click="copyToClipboard(unsignedTransactionHash)">
                    <q-tooltip>{{ $t('Copy') }}</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div v-if="isReadOnlyWallet" class="q-pa-md">
          <q-banner rounded class="readonly-banner" :class="getDarkModeClass(darkMode)">
            <q-icon name="visibility" class="q-mr-sm" />
            {{ $t('ReadOnlyCannotSign', {}, 'This is a read-only wallet — you can review but cannot sign this transaction.') }}
          </q-banner>
        </div>
        <div v-if="!isSigned" class="q-pa-md">
          <q-banner rounded class="unsigned-banner" :class="getDarkModeClass(darkMode)">
            <q-icon name="lock_open" class="q-mr-sm" />
            {{ $t('UnsignedTransactionBanner', {}, 'This transaction is unsigned.') }}
          </q-banner>
        </div>

        <q-list>
          <q-item v-if="Number(debitBch) > 0">
            <q-item-section>
              <span class="coin-symbol">BCH</span>
            </q-item-section>
            <q-item-section side top class="q-gutter-y-sm">
              <div class="flex no-wrap items-center text-red">
                <span class="coin-amount">- {{ debitBch }}</span>
                <q-icon name="img:bitcoin-cash-circle.svg" size="sm" />
              </div>
              <div v-if="Number(changeBch) > 0" class="flex no-wrap items-center">
                <span class="text-caption q-mr-xs">[{{ $t('Change') }}]</span>
                <span class="coin-amount">{{ changeBch }}</span>
                <q-icon name="img:bitcoin-cash-circle.svg" size="sm" />
              </div>
            </q-item-section>
          </q-item>

          <template v-for="category in tokenCategories" :key="category">
            <q-item v-if="BigInt(tokenDebit[category] || 0) > 0n">
              <q-item-section>
                <span class="coin-symbol ellipsis">{{ shortenString(category, 16) }}</span>
              </q-item-section>
              <q-item-section side top class="q-gutter-y-sm">
                <div class="flex no-wrap items-center text-red">
                  <span class="coin-amount">- {{ formatTokenAmount(tokenDebit[category]) }}&nbsp;</span>
                  <q-icon name="token" size="sm" />
                </div>
                <div v-if="BigInt(tokenChange[category] || 0) > 0n" class="flex no-wrap items-center">
                  <span class="text-caption q-mr-xs">[{{ $t('Change') }}]</span>
                  <span class="coin-amount">{{ formatTokenAmount(tokenChange[category]) }}</span>
                  <q-icon name="token" size="sm" />
                </div>
              </q-item-section>
            </q-item>
          </template>

          <q-item>
            <q-item-section>
              <q-item-label caption>{{ $t('Recipients') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-for="(o, i) in recipientRows" :key="i">
            <q-item-section top>
              <div class="text-caption" style="word-break: break-all;">{{ o.address }}</div>
            </q-item-section>
            <q-item-section side>
              <div class="flex no-wrap items-center">
                <span class="coin-amount">{{ o.amountText }}</span>
              </div>
            </q-item-section>
          </q-item>

          <q-separator />
          <q-item>
            <q-item-section>
              <q-item-label caption>{{ $t('TransactionFee') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="flex no-wrap items-center justify-right">
                <span class="coin-amount">{{ feeBch }}</span>
                <q-icon name="img:bitcoin-cash-circle.svg" size="sm" />
              </div>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>{{ $t('RequiredSignatures', {}, 'Required Signatures') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>1 / 1</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <div class="sticky-bottom-spacer"></div>
      </div>
    </div>

    <div v-if="canSign" class="sticky-bottom-actions" :class="getDarkModeClass(darkMode)">
      <DragSlide
        :disable="isBroadcasting"
        :text="$t('SwipeToSend')"
        @swiped="onConfirmSliderSwiped"
      />
    </div>
    <div v-else-if="isSigned" class="sticky-bottom-actions" :class="getDarkModeClass(darkMode)">
      <DragSlide
        :disable="isBroadcasting"
        :text="$t('SwipeToSend')"
        @swiped="onConfirmSliderSwiped"
      />
    </div>
    <div v-else class="sticky-bottom-actions row q-gutter-sm" :class="getDarkModeClass(darkMode)">
      <q-btn
        rounded
        no-caps
        unelevated
        class="col q-py-md"
        color="primary"
        :label="$t('ScanQrCode', {}, 'Scan QR Code')"
        icon="qr_code_scanner"
        @click="openScanQr"
      />
      <q-btn
        rounded
        no-caps
        unelevated
        class="col q-py-md"
        color="primary"
        :label="$t('ShareQrCode', {}, 'Share QR Code')"
        icon="share"
        @click="openShareQr"
      />
    </div>

    <div v-if="showActionConfirmationSlider" class="action-confirmation-backdrop" @click.stop="showActionConfirmationSlider = false">
      <div class="action-confirmation-slider-content" @click.stop>
        <div class="text-center q-mb-sm text-bold" :class="getDarkModeClass(darkMode)">
          {{ $t('ConfirmSend', {}, 'Confirm Send') }}
        </div>
        <DragSlide
          @swiped="onSliderSwiped"
          :text="$t('SwipeToSend')"
          disable-absolute-bottom
        />
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { useStore } from 'vuex'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Big from 'big.js'
import {
  decodeTransactionCommon,
  lockingBytecodeToCashAddress,
  binToHex,
  hexToBin,
  base64ToBin,
  deriveHdPath,
  deriveHdPrivateNodeFromBip39Mnemonic,
  secp256k1,
  hashTransaction,
  encodeTransaction
} from 'bitauth-libauth-v3'
import Watchtower from 'watchtower-cash-js'
import HeaderNav from 'src/components/header-nav'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import BroadcastSuccessDialog from 'src/components/multisig/BroadcastSuccessDialog.vue'
import PsbtQrDialog from 'src/components/sharing/PsbtQrDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Psbt } from 'src/lib/multisig/psbt'
import { signBchTransaction } from 'src/wallet/bch-sign'
import { getMnemonic } from 'src/wallet'
import { isReadOnlyVaultEntry } from 'src/lib/readonly-wallet'

const PENDING_PSBT_KEY = 'paytaca-single-sig-psbt'

const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const router = useRouter()

defineOptions({ name: 'PsbtView' })

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isChipnet = computed(() => $store.getters['global/isChipnet'])

const unsignedTx = ref(null)
const unsignedTransactionHash = ref('')
const psbtBase64 = ref('')
const purpose = ref('')
const inputs = ref([])
const outputRows = ref([])
const tokenCategories = ref([])
const tokenDebit = ref({})
const tokenChange = ref({})
const inputSatoshis = ref(0n)
const outputSatoshis = ref(0n)
const isBroadcasting = ref(false)
const showActionConfirmationSlider = ref(false)
const ownedKeyMap = new Map()
const backNavPath = '/'

const networkPrefix = computed(() => (isChipnet.value ? 'bchtest' : 'bitcoincash'))

const isReadOnlyWallet = computed(() => {
  const index = $store.getters['global/getWalletIndex']
  return isReadOnlyVaultEntry($store.getters['global/getVault']?.[index])
})

const sourceOutputs = computed(() => inputs.value.map(i => i.sourceOutput))

const debitBch = computed(() => {
  const debit = outputRows.value
    .filter(o => !o.isChange && !o.token)
    .reduce((t, o) => t + o.valueSatoshis, 0n)
  return Big(debit).div(1e8).toString()
})

const changeBch = computed(() => {
  const change = outputRows.value
    .filter(o => o.isChange && !o.token)
    .reduce((t, o) => t + o.valueSatoshis, 0n)
  return Big(change).div(1e8).toString()
})

const feeBch = computed(() => {
  return Big(inputSatoshis.value - outputSatoshis.value).div(1e8).toString()
})

const canSign = computed(() => {
  return ownedKeyMap.size > 0 && !isBroadcasting.value
})

const isSigned = computed(() => {
  return inputs.value.length > 0 && inputs.value.every(i => i.hasSignature)
})

const recipientRows = computed(() => outputRows.value.filter(o => !o.isChange))

function formatTokenAmount (amount) {
  return Big(amount || 0).toString()
}

function shortenString (str, max = 20) {
  if (!str) return ''
  const s = String(str)
  if (s.length <= max) return s
  return `${s.slice(0, max / 2)}...${s.slice(-max / 2)}`
}

async function loadPsbt () {
  const raw = sessionStorage.getItem(PENDING_PSBT_KEY)
  if (!raw) {
    $q.notify({
      type: 'negative',
      message: $t('NoPendingPsbt', {}, 'No transaction proposal found'),
      timeout: 5000
    })
    router.replace({ name: 'apps-dashboard' })
    return
  }

  try {
    psbtBase64.value = raw

    const psbt = new Psbt()
    psbt.deserialize(base64ToBin(raw))

    const unsigned = psbt.getUnsignedTx()
    const unsignedBin = typeof unsigned === 'string' ? hexToBin(unsigned) : unsigned
    const tx = decodeTransactionCommon(unsignedBin)
    if (typeof tx === 'string') throw new Error(tx)
    unsignedTx.value = tx

    const rawTxid = hashTransaction(unsignedBin)
    const txid = String(typeof rawTxid === 'string' ? rawTxid : binToHex(rawTxid)).toLowerCase()
    unsignedTransactionHash.value = txid

    // Purpose/origin metadata (best-effort; our PSBTs embed paytaca proprietary fields)
    try {
      const obj = {}
      new Psbt().decode(raw, obj)
      purpose.value = obj.metadata?.purpose || ''
    } catch { /* no purpose metadata */ }

    const tokenCategoriesSet = new Set()
    ;(psbt.inputMap?.inputs || []).forEach((inp) => {
      const sourceOutput = inp.getSourceUtxo?.() || null
      const der = inp.getBip32Derivation?.() || {}
      const entries = Object.entries(der)
      const [pubkey, info] = entries[0] || [null, null]
      const partialSigs = inp.getPartialSigs?.() || {}
      const finalScriptSig = inp.getFinalScriptSig?.()
      const hasSignature = Object.keys(partialSigs || {}).length > 0 || Boolean(finalScriptSig && finalScriptSig.length > 0)
      inputs.value.push({
        sourceOutput,
        pubkey,
        path: info?.path || null,
        partialSigs,
        finalScriptSig,
        hasSignature
      })
    })

    inputSatoshis.value = inputs.value.reduce((t, i) => t + (i.sourceOutput?.valueSatoshis || 0n), 0n)
    outputSatoshis.value = tx.outputs.reduce((t, o) => t + o.valueSatoshis, 0n)

    const psbtOutputs = psbt.outputMap?.outputs || []
    tx.outputs.forEach((o, i) => {
      let address = ''
      try {
        address = lockingBytecodeToCashAddress({ bytecode: o.lockingBytecode, prefix: networkPrefix.value })
      } catch { address = o.lockingBytecode ? binToHex(o.lockingBytecode) : '' }
      const der = psbtOutputs[i]?.getBip32Derivation?.() || {}
      const isChange = Object.keys(der).length > 0
      let token = null
      if (o.token) {
        const category = binToHex(o.token.category)
        token = { category, amount: o.token.amount }
        tokenCategoriesSet.add(category)
        if (isChange) {
          tokenChange.value[category] = (tokenChange.value[category] || 0n) + BigInt(o.token.amount || 0)
        } else {
          tokenDebit.value[category] = (tokenDebit.value[category] || 0n) + BigInt(o.token.amount || 0)
        }
      }
      const amountText = token
        ? `${formatTokenAmount(token.amount)} ${shortenString(token.category, 8)}`
        : `${Big(o.valueSatoshis).div(1e8).toString()} BCH`
      outputRows.value.push({ address, valueSatoshis: o.valueSatoshis, token, isChange, amountText })
    })
    tokenCategories.value = Array.from(tokenCategoriesSet)

    await checkOwnership()
  } catch (error) {
    console.error('[PsbtView] Error loading proposal:', error)
    $q.notify({
      type: 'negative',
      message: $t('ErrorLoadingPsbt', {}, 'Failed to load transaction proposal'),
      timeout: 5000
    })
    router.replace({ name: 'apps-dashboard' })
  }
}

async function checkOwnership () {
  if (isReadOnlyWallet.value) return
  const index = $store.getters['global/getWalletIndex']
  const mnemonic = await getMnemonic(index).catch(() => null)
  if (!mnemonic) return
  try {
    const masterNode = deriveHdPrivateNodeFromBip39Mnemonic(mnemonic)
    inputs.value.forEach((input, inputIndex) => {
      if (!input.path) return
      const node = deriveHdPath(masterNode, input.path)
      const privateKey = node.privateKey
      const publicKey = secp256k1.derivePublicKeyCompressed(privateKey)
      if (typeof publicKey === 'string') return
      if (input.pubkey && binToHex(publicKey) !== input.pubkey) return
      ownedKeyMap.set(inputIndex, { privateKey, publicKey })
    })
  } catch (error) {
    console.error('[PsbtView] Error checking ownership:', error)
  }
}

function resolveKey (_lockingBytecode, inputIndex) {
  return ownedKeyMap.get(inputIndex) || null
}

function concatBytes (...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const array of arrays) {
    out.set(array, offset)
    offset += array.length
  }
  return out
}

function finalizeSignedTx () {
  const decoded = structuredClone(unsignedTx.value)
  const psbt = new Psbt()
  psbt.deserialize(base64ToBin(psbtBase64.value))
  ;(psbt.inputMap?.inputs || []).forEach((inp, i) => {
    const finalScriptSig = inp.getFinalScriptSig?.()
    if (finalScriptSig && finalScriptSig.length > 0) {
      decoded.inputs[i].unlockingBytecode = finalScriptSig
      return
    }
    const partialSigs = inp.getPartialSigs?.() || {}
    const pubkeyHex = Object.keys(partialSigs)[0]
    const sig = pubkeyHex ? partialSigs[pubkeyHex] : null
    const pubkey = pubkeyHex ? hexToBin(pubkeyHex) : null
    if (!sig || !pubkey) throw new Error('Cannot finalize input — missing signature')
    decoded.inputs[i].unlockingBytecode = concatBytes(
      Uint8Array.from([sig.length]), sig,
      Uint8Array.from([pubkey.length]), pubkey
    )
  })
  return binToHex(encodeTransaction(decoded))
}

async function commitSignAndBroadcast () {
  if (!canSign.value && !isSigned.value) return
  try {
    isBroadcasting.value = true
    let signedTransaction
    if (canSign.value) {
      const result = signBchTransaction({
        transaction: unsignedTx.value,
        sourceOutputs: sourceOutputs.value,
        resolveKey,
        prefix: networkPrefix.value
      })
      signedTransaction = result.signedTransaction
    } else {
      signedTransaction = finalizeSignedTx()
    }

    const watchtower = new Watchtower(isChipnet.value)
    const broadcastResponse = await watchtower.BCH.broadcastTransaction(signedTransaction)
    const data = broadcastResponse?.data || {}
    if (data.success ||
        data.error?.includes?.('txn-already-known') ||
        data.error?.includes?.('txn-already-in-mempool')) {
      sessionStorage.removeItem(PENDING_PSBT_KEY)
      $q.dialog({
        component: BroadcastSuccessDialog,
        componentProps: {
          successMessage: purpose.value || $t('SentSuccessfully', {}, 'Successfully Sent'),
          amountSent: debitBch.value,
          txid: data.txid || '',
          darkMode: darkMode.value
        }
      }).onOk(() => {
        router.push({ name: 'apps-dashboard' })
      }).onDismiss(() => {
        router.push({ name: 'apps-dashboard' })
      })
      return
    }
    throw new Error(data.error || 'Failed to broadcast transaction')
  } catch (error) {
    $q.dialog({
      title: $t('Error'),
      message: error.message || $t('BroadcastFailed', {}, 'Failed to broadcast transaction.'),
      class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
      ok: {
        label: $t('Ok'),
        color: 'primary',
        rounded: true
      }
    })
  } finally {
    isBroadcasting.value = false
  }
}

function onSliderSwiped (reset) {
  showActionConfirmationSlider.value = false
  $q.dialog({ component: SecurityCheckDialog })
    .onOk(() => {
      commitSignAndBroadcast()
    })
    .onDismiss(() => {
      reset?.()
    })
}

function onConfirmSliderSwiped (reset) {
  if (!canSign.value && !isSigned.value) return
  showActionConfirmationSlider.value = true
  reset?.()
}

function openScanQr () {
  router.push({
    name: 'qr-reader',
    query: { backnavpath: router.currentRoute.value.fullPath }
  })
}

function openShareQr () {
  $q.dialog({
    component: PsbtQrDialog,
    componentProps: {
      darkMode: darkMode.value,
      psbtBase64: psbtBase64.value
    }
  })
}

async function refreshPage (done) {
  done()
}

onMounted(() => {
  loadPsbt()
})

onUnmounted(() => {
  showActionConfirmationSlider.value = false
})
</script>

<style lang="scss" scoped>
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

.sticky-bottom-spacer {
  height: 100px;
}

.coin-symbol {
  font-weight: bold;
  font-size: 1.1em;
}

.coin-amount {
  font-weight: 600;
}

.action-confirmation-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.action-confirmation-slider-content {
  width: 100%;
}

.readonly-banner,
.unsigned-banner {
  border-radius: 12px;
}
</style>
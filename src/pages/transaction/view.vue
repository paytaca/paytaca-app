<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Transaction', {}, 'Transaction')" :backnavpath="backNavPath" class="header-nav" />
    <div class="row justify-center">
      <div class="col-xs-12 q-px-xs" v-if="unsignedTx">
        <div class="row q-mb-xs justify-center">
          <div class="col-xs-12">
            <q-card id="bch-card" class="q-ma-md" style="border-radius: 15px; color:white">
              <q-card-section>
                <div v-if="purpose" class="text-bold text-h6 ellipsis">{{ purpose || $t('PurposeNotSpecified', {}, 'Purpose Not Specified') }}</div>
                <div v-if="!isSigned" class="q-pa-sm">
                    <q-icon name="priority_high"></q-icon>{{ canSign
                      ? $t('UnsignedTransactionSignableBanner', {}, 'This transaction is unsigned — you can sign and broadcast it on this device.')
                      : $t('UnsignedTransactionBanner', {}, 'This transaction is unsigned.') }}
                </div>
                <div v-else class="q-pa-sm">
                    <q-icon :name="signedReadyForBroadcast ? 'mdi-party-popper' : 'priority_high'"></q-icon>{{ signedReadyForBroadcast
                      ? $t('SignedTransactionBanner', {}, 'This transaction is signed and ready for broadcast.')
                      : $t('SignedTransactionUnverifiedBanner', {}, 'This transaction is signed, but its signatures could not be verified.') }}
                </div>
                <div v-if="noSignableInputs" class="q-pa-sm">
                    <q-icon name="info"></q-icon>{{ $t('NoSignableInputs', {}, "None of this transaction's inputs belong to this wallet, so it can't be signed here.") }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
        
        <div class="flex justify-between q-px-sm q-mb-lg">
          <q-btn flat dense no-caps class="tile" :disable="isSigned" @click="openScanQr">
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="qr_code_scanner" class="col-12" color="primary"></q-icon>
                <div class="col-12 tile-label">{{ $t('ImportSignature', {}, 'Import Signature') }}</div>
              </div>
            </template>
          </q-btn>
          <q-btn flat dense no-caps class="tile" @click="openShareQr">
            <template v-slot:default>
              <div class="row justify-center">
                <q-icon name="qr_code" class="col-12" color="primary"></q-icon>
                <div class="col-12 tile-label">{{ $t('ShareTransaction', {}, 'Share Transaction') }}</div>
              </div>
            </template>
          </q-btn>
        </div>

        <q-list>
          <q-item>
            <q-item-section>
              <q-item-label class="text-bold text-center">****** {{ $t('TransactionSummary', {}, 'Transaction Summary') }} ******</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="Number(debitBch) > 0">
            <q-item-section>
              <span class="section-label">BCH</span>
            </q-item-section>
            <q-item-section side top class="q-gutter-y-sm">
              <div class="flex no-wrap items-center text-red q-gutter-x-xs">
                <span class="coin-amount">- {{ debitBch }}</span>
                <q-icon name="img:bitcoin-cash-circle.svg" size="xs" />
              </div>
              <div v-if="Number(changeBch) > 0" class="flex no-wrap items-center q-gutter-x-xs">
                <span class="text-caption q-mr-xs">[{{ $t('Change') }}]</span>
                <span class="coin-amount">{{ changeBch }}</span>
                <q-icon name="img:bitcoin-cash-circle.svg" size="xs" />
              </div>
            </q-item-section>
          </q-item>
          <q-item v-if="tokenCategories?.length > 0" dense>
            <q-item-section>
              <q-item-label class="section-label">{{ $t('Assets', {}, 'Assets') }}</q-item-label>
            </q-item-section>
          </q-item>
          <template v-for="category in tokenCategories" :key="category">
            <q-item>
              <q-item-section top>
                <template v-if="tokenMeta[category]?.symbol">
                  <span class="text-bold ellipsis text-caption">{{ tokenMeta[category].symbol }}</span>
                  <div class="text-caption row items-center no-wrap">
                    <span class="ellipsis">{{ shortenString(category, 16) }}</span>
                    <q-btn flat dense round size="sm" icon="content_copy" @click="copyCategory(category)" />
                  </div>
                </template>
                <div v-else class="row items-center no-wrap">
                  <span class="coin-symbol ellipsis">{{ shortenString(category, 16) }}</span>
                  <q-btn flat dense round size="sm" icon="content_copy" @click="copyCategory(category)" />
                </div>
              </q-item-section>
              <q-item-section side top class="q-gutter-y-sm">
                <div class="flex no-wrap items-center q-gutter-x-xs">
                  <span class="text-caption q-mr-xs">[{{ $t('Input', {}, 'Input') }}]</span>
                  <span class="coin-amount">{{ formatTokenAmount(tokenTotalInputs[category], tokenMeta[category]?.decimals) }}</span>
                  <q-icon name="token" size="xs" />
                </div>
                <div v-if="BigInt(tokenDebit[category] || 0) > 0n" class="flex no-wrap items-center text-red q-gutter-x-xs">
                  <span class="text-caption text-bow">[{{ $t('Debit', {}, 'Debit') }}]</span>
                  <span class="coin-amount">- {{ formatTokenAmount(tokenDebit[category], tokenMeta[category]?.decimals) }}</span>
                  <q-icon name="token" size="xs" />
                </div>
                <div v-if="BigInt(tokenChange[category] || 0) > 0n" class="flex no-wrap items-center q-gutter-x-xs">
                  <span class="text-caption q-mr-xs">[{{ $t('Change') }}]</span>
                  <span class="coin-amount">{{ formatTokenAmount(tokenChange[category], tokenMeta[category]?.decimals) }}</span>
                  <q-icon name="token" size="xs" />
                </div>
              </q-item-section>
            </q-item>
          </template>
          <q-separator />
          <q-item dense>
            <q-item-section>
              <q-item-label class="section-label">{{ $t('Recipients') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-for="(o, i) in recipientRows" :key="i">
            <q-item-section>
              <div class="text-caption">{{ shortenAddressForDisplay(o.address) }}</div>
            </q-item-section>
            <q-item-section side>
              <div class="flex no-wrap items-center q-gutter-x-xs">
                <span class="coin-amount">{{ o.token ? tokenAmountText(o.token) : o.amountText?.replace('BCH', '') }}</span>
                <q-icon v-if="o.amountText?.includes('BCH')" name="img:bitcoin-cash-circle.svg" size="xs" />
              </div>
              <div v-if="o.token?.nft" class="text-caption q-ml-sm row items-center no-wrap">
                <span class="ellipsis">{{ shortenString(o.token.category, 16) }}</span>
                <q-btn flat dense round size="sm" icon="content_copy" @click="copyCategory(o.token.category)" />
              </div>
            </q-item-section>
          </q-item>
          
          <q-separator />
          <q-item>
            <q-item-section>
              <q-item-label class="section-label">{{ $t('TransactionFee') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="flex no-wrap items-center justify-right q-gutter-x-xs">
                <span class="coin-amount">{{ feeBch }}</span>
                <q-icon name="img:bitcoin-cash-circle.svg" size="xs" />
              </div>
            </q-item-section>
          </q-item>
          <q-separator />
          
          <!-- <q-item>
            <q-item-section>
              <q-item-label>{{ $t('LoadSignedTxQrCode', {}, 'Import Signature By QR Code') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn clickable @click="openScanQr" :disable="isSigned" color="primary" rounded no-caps>
                <q-avatar size="md"><q-icon name="qr_code_scanner" size="sm" ></q-icon></q-avatar>
                <span>{{ $t('Scan QR') }}</span>
              </q-btn>
            </q-item-section>
          </q-item> -->
          
        </q-list>
        <div class="sticky-bottom-spacer"></div>
      </div>
    </div>

    <div v-if="canSign" class="sticky-bottom-actions" :class="getDarkModeClass(darkMode)">
      <DragSlide
        :disable="isBroadcasting"
        :text="$t('SwipeToSend')"
        @swiped="onSliderSwiped"
      />
    </div>
    <div v-else-if="isSigned" class="sticky-bottom-actions" :class="getDarkModeClass(darkMode)">
      <DragSlide
        :disable="isBroadcasting"
        :text="$t('SwipeToSend')"
        @swiped="onSliderSwiped"
      />
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { useStore } from 'vuex'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { ref, computed, watch, onMounted } from 'vue'
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
  hash160,
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
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { Psbt } from 'src/lib/multisig/psbt'
import { signBchTransaction } from 'src/wallet/bch-sign'
import { verifyTransactionInputSignature } from 'src/lib/multisig/utils'
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
const ownedKeyMap = ref(new Map())
const ownershipChecked = ref(false)
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
  return ownedKeyMap.value.size > 0 && !isBroadcasting.value
})

const isSigned = computed(() => {
  return inputs.value.length > 0 && inputs.value.every(i => i.hasSignature)
})

/**
 * Verification state of the signatures carried by an imported (externally
 * signed) PSBT: 'unsigned' | 'valid' | 'invalid' | 'unsupported'.
 * Signatures are checked against the sighash and the pubkey must hash to the
 * source output's P2PKH script before anything is broadcast.
 */
const signatureCheck = computed(() => {
  if (!unsignedTx.value || !inputs.value.length) return 'unsigned'
  const results = inputs.value.map((input, inputIndex) => verifyInputSignature({ input, inputIndex }))
  if (results.includes('invalid')) return 'invalid'
  if (results.includes('unsupported')) return 'unsupported'
  return results.every(result => result === 'valid') ? 'valid' : 'unsigned'
})

function signatureErrorMessage () {
  if (signatureCheck.value === 'unsigned') {
    return $t('PsbtNotSignedYet', {}, 'This transaction has no signatures yet, so there is nothing to broadcast.')
  }
  return signatureCheck.value === 'unsupported'
    ? $t('PsbtSignatureUnsupported', {}, 'This transaction is signed in a format this wallet cannot verify, so it will not be broadcast.')
    : $t('PsbtSignatureInvalid', {}, 'The signature on this transaction is invalid, so it will not be broadcast.')
}

/**
 * A signed PSBT is ready to broadcast when this wallet can sign it itself or the
 * imported signatures passed verification. Used for the status banner so it does
 * not claim "ready for broadcast" for signatures that will be refused.
 */
const signedReadyForBroadcast = computed(() => {
  if (!isSigned.value) return false
  return canSign.value || signatureCheck.value === 'valid'
})

/**
 * True when an unsigned PSBT was loaded on a wallet that owns none of its
 * inputs, so there is nothing to sign. Surfaced in the UI instead of leaving
 * the user without a slider and no explanation.
 */
const noSignableInputs = computed(() => {
  return Boolean(
    unsignedTx.value &&
    ownershipChecked.value &&
    !isReadOnlyWallet.value &&
    !isBroadcasting.value &&
    !isSigned.value &&
    ownedKeyMap.value.size === 0
  )
})

const recipientRows = computed(() => outputRows.value.filter(o => !o.isChange))

// Symbol/decimals per token category, sourced from the assets store (re-resolves
// when BCMR metadata dispatches below commit to the store)
const tokenMeta = computed(() => {
  const map = {}
  tokenCategories.value.forEach((category) => {
    const asset = $store.getters['assets/getAsset'](`ct/${category}`)?.[0]
    if (asset) map[category] = { symbol: asset.symbol || '', decimals: parseInt(asset.decimals) || 0 }
  })
  return map
})

function formatTokenAmount (amount, decimals) {
  const d = parseInt(decimals) || 0
  return Big(amount || 0).div(10 ** d).toString()
}

function tokenAmountText (token) {
  if (!token) return ''
  if (token.nft) return '1 NFT'
  const meta = tokenMeta.value[token.category]
  return `${formatTokenAmount(token.amount, meta?.decimals)} ${meta?.symbol || shortenString(token.category, 8)}`
}

// Total token inputs per category (= debits + change; tokens are conserved)
const tokenTotalInputs = computed(() => {
  const totals = {}
  tokenCategories.value.forEach((category) => {
    const total = (tokenDebit.value[category] || 0n) + (tokenChange.value[category] || 0n)
    if (total > 0n) totals[category] = total
  })
  return totals
})

function shortenString (str, max = 20) {
  if (!str) return ''
  const s = String(str)
  if (s.length <= max) return s
  return `${s.slice(0, max / 2)}...${s.slice(-max / 2)}`
}

function copyCategory (category) {
  copyToClipboard(category).then(() => {
    $q.notify({
      message: $t('CopiedToClipboard'),
      timeout: 800,
      icon: 'mdi-clipboard-check',
      color: 'blue-9'
    })
  }).catch(() => {})
}

function resetPsbtState () {
  unsignedTx.value = null
  unsignedTransactionHash.value = ''
  psbtBase64.value = ''
  purpose.value = ''
  inputs.value = []
  outputRows.value = []
  tokenCategories.value = []
  tokenDebit.value = {}
  tokenChange.value = {}
  ownedKeyMap.value.clear()
  ownershipChecked.value = false
}

async function loadPsbt () {
  resetPsbtState()
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
      // Categories also live on the consumed input UTXOs; collect them so token
      // rows render even when outputs carry zero amounts (e.g. immutable NFTs)
      if (sourceOutput?.token?.category) {
        tokenCategoriesSet.add(binToHex(sourceOutput.token.category))
      }
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
        token = {
          category,
          amount: o.token.amount,
          nft: o.token.nft
            ? { capability: o.token.nft.capability, commitment: binToHex(o.token.nft.commitment) }
            : null
        }
        tokenCategoriesSet.add(category)
        if (isChange) {
          tokenChange.value[category] = (tokenChange.value[category] || 0n) + BigInt(o.token.amount || 0)
        } else {
          tokenDebit.value[category] = (tokenDebit.value[category] || 0n) + BigInt(o.token.amount || 0)
        }
      }
      const amountText = token ? '' : `${Big(o.valueSatoshis).div(1e8).toString()} BCH`
      outputRows.value.push({ address, valueSatoshis: o.valueSatoshis, token, isChange, amountText })
    })
    tokenCategories.value = Array.from(tokenCategoriesSet)
    // Best-effort BCMR backfill for tokens without symbol/decimals in the store
    tokenCategories.value.forEach((category) => {
      const asset = $store.getters['assets/getAsset'](`ct/${category}`)?.[0]
      if (!asset?.symbol || !(parseInt(asset.decimals) > 0)) {
        $store.dispatch('assets/getAssetMetadata', `ct/${category}`).catch(() => {})
      }
    })

    await checkOwnership()

    // Warn about forged/unverifiable signatures as soon as the PSBT is loaded,
    // not only when the user tries to broadcast.
    if (signatureCheck.value === 'invalid' || signatureCheck.value === 'unsupported') {
      $q.notify({ type: 'negative', message: signatureErrorMessage(), timeout: 6000 })
    }
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
  ownershipChecked.value = false
  try {
    if (isReadOnlyWallet.value) return
    const index = $store.getters['global/getWalletIndex']
    const mnemonic = await getMnemonic(index).catch(() => null)
    if (!mnemonic) {
      console.debug('[PsbtView] No mnemonic available — wallet is locked or unreadable')
      return
    }
    const masterNode = deriveHdPrivateNodeFromBip39Mnemonic(mnemonic)
    inputs.value.forEach((input, inputIndex) => {
      if (!input.path) {
        console.debug('[PsbtView] PSBT input has no BIP32 derivation path', inputIndex)
        return
      }
      const node = deriveHdPath(masterNode, input.path)
      const privateKey = node.privateKey
      const publicKey = secp256k1.derivePublicKeyCompressed(privateKey)
      if (typeof publicKey === 'string') return
      if (input.pubkey && binToHex(publicKey) !== input.pubkey) return
      ownedKeyMap.value.set(inputIndex, { privateKey, publicKey })
    })
  } catch (error) {
    console.error('[PsbtView] Error checking ownership:', error)
  } finally {
    ownershipChecked.value = true
  }
}

function resolveKey (_lockingBytecode, inputIndex) {
  return ownedKeyMap.value.get(inputIndex) || null
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

const P2PKH_LOCKING_PREFIX = '76a914'
const P2PKH_LOCKING_SUFFIX = '88ac'

function isP2pkhLockingBytecode (lockingBytecode) {
  return Boolean(
    lockingBytecode &&
    lockingBytecode.length === 25 &&
    binToHex(lockingBytecode.slice(0, 3)) === P2PKH_LOCKING_PREFIX &&
    binToHex(lockingBytecode.slice(-2)) === P2PKH_LOCKING_SUFFIX
  )
}

/** Split a P2PKH unlocking bytecode ( `<sig> <pubkey>` ) into its two pushes. */
function parseP2pkhUnlockingBytecode (unlockingBytecode) {
  if (!unlockingBytecode || unlockingBytecode.length < 2) return null
  const signatureLength = unlockingBytecode[0]
  const signatureStart = 1
  const signatureEnd = signatureStart + signatureLength
  if (signatureLength <= 0 || signatureEnd >= unlockingBytecode.length) return null
  const publicKeyLength = unlockingBytecode[signatureEnd]
  const publicKeyStart = signatureEnd + 1
  const publicKeyEnd = publicKeyStart + publicKeyLength
  if (publicKeyLength !== 33 && publicKeyLength !== 65) return null
  if (publicKeyEnd !== unlockingBytecode.length) return null
  return {
    signature: unlockingBytecode.slice(signatureStart, signatureEnd),
    publicKey: unlockingBytecode.slice(publicKeyStart, publicKeyEnd)
  }
}

/**
 * Check the signature(s) an imported PSBT claims for one input.
 * Single-sig P2PKH only: the pubkey must hash to the source output's locking
 * script, and the signature must verify against that script as the scriptCode.
 * @returns {'unsigned'|'valid'|'invalid'|'unsupported'}
 */
function verifyInputSignature ({ input, inputIndex }) {
  const lockingBytecode = input.sourceOutput?.lockingBytecode
  if (!isP2pkhLockingBytecode(lockingBytecode)) return 'unsupported'
  const expectedPubkeyHash = binToHex(lockingBytecode.slice(3, 23))

  const candidates = Object.entries(input.partialSigs || {}).map(([publicKeyHex, signature]) => ({
    signature,
    publicKey: hexToBin(publicKeyHex)
  }))
  if (input.finalScriptSig?.length) {
    const parsed = parseP2pkhUnlockingBytecode(input.finalScriptSig)
    if (!parsed) return 'unsupported'
    candidates.push(parsed)
  }
  if (!candidates.length) return 'unsigned'

  const context = {
    inputIndex,
    sourceOutputs: sourceOutputs.value,
    transaction: unsignedTx.value
  }
  for (const candidate of candidates) {
    const verified = p2pkhCandidateVerifies({
      ...candidate,
      lockingBytecode,
      expectedPubkeyHash,
      context
    })
    if (!verified) return 'invalid'
  }
  return 'valid'
}

/** Verify one claimed signature against a P2PKH source output. */
function p2pkhCandidateVerifies ({ signature, publicKey, lockingBytecode, expectedPubkeyHash, context }) {
  if (binToHex(hash160(publicKey)) !== expectedPubkeyHash) return false
  try {
    return Boolean(verifyTransactionInputSignature({
      signature,
      publicKey,
      // For P2PKH the source output's locking bytecode is the signed scriptCode
      redeemScript: lockingBytecode,
      context
    }))
  } catch {
    return false
  }
}

/**
 * Pick the signature to put in the unlocking bytecode for one input: prefer one
 * that actually verifies, so a PSBT carrying several partial signatures (e.g.
 * combined from different signers) does not fail on whichever comes first.
 */
function selectSignatureForInput ({ input, inputIndex, partialSigs }) {
  const candidates = Object.entries(partialSigs || {}).map(([publicKeyHex, signature]) => ({
    signature,
    publicKey: hexToBin(publicKeyHex)
  }))
  if (!candidates.length) return null

  const lockingBytecode = input?.sourceOutput?.lockingBytecode
  if (!isP2pkhLockingBytecode(lockingBytecode)) return candidates[0]

  const context = { inputIndex, sourceOutputs: sourceOutputs.value, transaction: unsignedTx.value }
  const expectedPubkeyHash = binToHex(lockingBytecode.slice(3, 23))
  return candidates.find(candidate => p2pkhCandidateVerifies({
    ...candidate,
    lockingBytecode,
    expectedPubkeyHash,
    context
  })) || candidates[0]
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
    const chosen = selectSignatureForInput({
      input: inputs.value[i],
      inputIndex: i,
      partialSigs: inp.getPartialSigs?.() || {}
    })
    if (!chosen?.signature || !chosen?.publicKey) throw new Error('Cannot finalize input — missing signature')
    decoded.inputs[i].unlockingBytecode = concatBytes(
      Uint8Array.from([chosen.signature.length]), chosen.signature,
      Uint8Array.from([chosen.publicKey.length]), chosen.publicKey
    )
  })
  return binToHex(encodeTransaction(decoded))
}

async function commitSignAndBroadcast () {
  if (!canSign.value && !isSigned.value) return
  // `canSign` also depends on `isBroadcasting`, so sample it before broadcasting
  // flips that flag — otherwise this always falls through to the signed-PSBT path.
  const signLocally = canSign.value
  try {
    isBroadcasting.value = true
    let signedTransaction
    if (signLocally) {
      const result = signBchTransaction({
        transaction: unsignedTx.value,
        sourceOutputs: sourceOutputs.value,
        resolveKey,
        prefix: networkPrefix.value
      })
      signedTransaction = result.signedTransaction
    } else {
      // Imported (externally signed) PSBT: never broadcast signatures we could
      // not verify against the sighash and the sender's own locking script.
      if (signatureCheck.value !== 'valid') throw new Error(signatureErrorMessage())
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

function onSliderSwiped (reset = () => {}) {
  if (!canSign.value && !isSigned.value) return
  if (!canSign.value && signatureCheck.value !== 'valid') {
    $q.notify({ type: 'negative', message: signatureErrorMessage(), timeout: 6000 })
    reset()
    return
  }
  if (isReadOnlyWallet.value) {
    commitSignAndBroadcast()
    return
  }
  $q.dialog({ component: SecurityCheckDialog })
    .onOk(() => {
      commitSignAndBroadcast()
    })
    .onDismiss(() => {
      reset()
    })
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

watch(() => router.currentRoute.value.name, (to, from) => {
  if (to === 'psbt-view' && from === 'qr-reader') {
    loadPsbt()
  }
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

.section-label {
  font-weight: bold;
  font-size: 0.9em;
  letter-spacing: 0.5px;
  opacity: 0.65;
}

.readonly-banner,
.unsigned-banner {
  border-radius: 12px;
}
</style>
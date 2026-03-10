<template>
  <QrScanner v-model="showQrScanner" @decode="onEncryptionPublicKeyScanned" />
  <q-dialog ref="dialogRef" @hide="onDialogHide" seamless class="no-click-outside">
    <!-- <q-resize-observer @resize="resizeQrSize" /> -->
     
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm"> {{ $t('POSID')}}#{{ paddedPosId }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
          class="close-button"
        />
      </div>
      <q-card-section class="q-gutter-y-sm">
        <q-banner class="rounded-borders" :class="darkMode ? 'bg-grey text-white': ''">
          <div class="row no-wrap">
            <div class="row items-center q-mr-sm">
              <q-icon name="info" size="1.5em"/>
            </div>
            <div>{{ $t('DeviceMustBeOnline') }}</div>
          </div>
        </q-banner>
        <div v-if="!encryptionPublicKey" :class="darkMode ? 'bg-grey text-white': ''">
          <q-input
            dense
            outlined
            class="full-width"
            label="Encryption Public Key"
            hint="Please enter the encryption public key of the POS device"
            v-model="encryptionPublicKeyInput"
          >
            <template v-slot:control>
              <span class="ellipsis" style="direction: rtl;">
                {{ encryptionPublicKeyInput || 'Loading...' }}
              </span>
            </template>
            <template v-slot:append>
              <q-btn
                padding="sm"
                flat
                icon="qr_code_scanner"
                :dark="darkMode"
                @click="scanPosEncryptionPublicKey()"
              />
              <q-btn
                padding="sm"
                flat
                icon="send"
                :dark="darkMode"
                @click="submitEncryptionPublicKey()"
              />
            </template>
          </q-input>
        </div>
        <div v-else>
          <div class="qr-code-container">
            <div class="row items-center justify-center">
              <q-skeleton v-if="generatingLinkCode" height="250px" width="250px"/>
              <qr-code
                v-else
                :key="qrCodePxSize"
                :text="qrCodeData"
                :size="qrCodePxSize"
              />
            </div>
            <div class="row items-center justify-end">
              <q-btn-group rounded class="q-r-mb-md q-r-mr-md">
                <q-btn padding="xs md" text-color="black" icon="zoom_out" @click="() => qrCodePxSize -= 25"/>
                <q-btn padding="xs md" text-color="black" icon="zoom_in" @click="() => qrCodePxSize += 25"/>
              </q-btn-group>
            </div>
          </div>
          <div v-if="qrCodeData" class="row items-center justify-end q-gutter-sm">
            <q-field
              dense
              outlined
              readonly
              :dark="darkMode"
              class="full-width"
            >
              <template v-slot:control>
                <a :href="qrCodeDataLink" target="_blank" class="ellipsis" style="direction: rtl;">
                  {{ qrCodeDataLink }}
                </a>
              </template>
              <template v-slot:append>
                <q-btn
                  padding="sm"
                  flat
                  icon="content_copy"
                  :dark="darkMode"
                  @click="copyToClipboard(qrCodeDataLink, 'Link code url copied')"
                />
              </template>
            </q-field>
          </div>
          <div class="row items-center justify-center q-gutter-xs">
            <span v-if="linkExpiresIn > 1000" class="text-grey">
              {{ $t('LinkExpiresIn') }}
              {{ formatTimestampToText(linkCode?.expiresAt * 1000) }}
            </span>
            <span v-else-if="linkExpiresIn < -1000" class="text-grey">
              {{ $t('LinkExpired') }} {{ formatTimestampToText(linkCode?.expiresAt * 1000) }}
            </span>
            <span v-else-if="linkExpiresIn > 0" class="text-grey">
              {{ $t('LinkExpiresIn') }}
              <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ linkExpiresIn }}</span>
              {{ linkExpiresIn > 1 ? $t('Seconds'): $t('Second') }}
            </span>
            <span v-else-if="linkExpiresIn < 0" class="text-grey">
              {{ $t('LinkExpired') }}
              <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ linkExpiresIn * -1 }}</span>
              {{ linkExpiresIn < -1 ? $t('Seconds'): $t('Second') }} {{ $t('Ago') }}
            </span>
            <q-btn
              :disable="generatingLinkCode"
              :loading="generatingLinkCode"
              padding="none"
              flat
              no-caps
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              :label="$t('GenerateNewCode')"
              @click="generateLinkCode()"
              style="text-decoration:underline;"
            />
            <!-- in case linkExpiresIn is not a number nothing will be shown -->
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import BCHJS from '@psf/bch-js';
import { Wallet } from 'src/wallet'
import { padPosId, aes } from 'src/wallet/pos'
import { formatTimestampToText } from 'src/wallet/anyhedge/formatters';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue';
import { useStore } from 'vuex';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import QrScanner from 'src/components/qr-scanner'
import { encryptWithPublicKey } from 'src/utils/ecies'
import { loadCardMerchantWallet } from 'src/services/wallet';

const bchjs = new BCHJS()

const $copyText = inject('$copyText')
const $q = useQuasar()

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  posid: Number,
  name: { type: String, required: false },
  wallet: Wallet,
})

const paddedPosId = computed(() => padPosId(props.posid))
const walletData = computed(() => $store.getters['global/getWallet']('bch'))

const generatingLinkCode = ref(false)
const linkCode = computed(() => {
  if (!props.wallet) return
  return $store.getters['paytacapos/linkCodes']
    .find(linkCode => linkCode.walletHash === props.wallet.BCH?.walletHash && linkCode.posid === props.posid)
})

let showQrScanner = ref(false)
const encryptionPublicKey = ref(null)
const encryptionPublicKeyInput = ref('')

function scanPosEncryptionPublicKey() {
  showQrScanner.value = true
}

function onEncryptionPublicKeyScanned(result) {
  showQrScanner.value = false
  try {
    encryptionPublicKeyInput.value = result
    encryptionPublicKey.value = result
    $q.notify({
      message: 'Encryption public key scanned successfully',
      color: 'positive',
      icon: 'check_circle',
      timeout: 2000
    })
    // Automatically generate link code after scanning the public key
    generateLinkCode({ checkExpiry: true })
  } catch (error) {
    console.error('Error processing scanned encryption public key:', error)
    $q.notify({
      message: 'Invalid encryption public key',
      color: 'negative',
      icon: 'error',
      timeout: 2000
    })
  }
}

async function submitEncryptionPublicKey() {
  if (!encryptionPublicKeyInput.value?.trim()) {
    $q.notify({
      message: 'Please enter or scan the encryption public key',
      color: 'warning',
      icon: 'warning',
      timeout: 2000
    })
    return
  }
  // Set the encryption public key only when submitted
  encryptionPublicKey.value = encryptionPublicKeyInput.value.trim()
  
  $q.notify({
    message: 'Encryption public key submitted successfully',
    color: 'positive',
    icon: 'check_circle',
    timeout: 2000
  })
  // Generate link code with the entered encryption public key
  await generateLinkCode({ checkExpiry: true })
}

async function generateLinkCode(opts) {
  if (!encryptionPublicKey.value) {
    $q.notify({
      message: 'Encryption public key is required to generate link code',
      color: 'warning',
      icon: 'warning',
      timeout: 2000
    })
    return
  }

  try {
    const wallet = props.wallet.BCH
    const xpubkey = await wallet.getXPubKey()

    // Encrypt xpubkey with POS device's public key using ECIES
    const addressIndex = 0
    const merchantWallet = await loadCardMerchantWallet(addressIndex)
    const _data = {
      xpubkey: xpubkey,
      privateKey: merchantWallet.privkey()
    }
    const encrypted = encryptWithPublicKey(_data, encryptionPublicKey.value)
    const nonce = Math.floor(Math.random() * (2 ** 31 - 1))
    const privkey = await wallet.getPrivateKey(nonce)

    // Sign the encrypted data for verification
    const signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, encrypted.encryptedData)

    const data = {
      walletHash: wallet.walletHash,
      posid: props.posid,
      encryptedData: encrypted.encryptedData,
      encryptKey: encrypted.encryptKey,
      nonce: nonce,
      signature: signature,
      opts: {
        checkExpiry: opts?.checkExpiry,
      }
    }

    generatingLinkCode.value = true
    await $store.dispatch('paytacapos/generateLinkCode', data)
    
  } catch (error) {
    console.error('Error generating link code:', error)
    $q.notify({
      message: `Failed to generate link code: ${error?.message}`,
      color: 'negative',
      icon: 'error',
      timeout: 3000
    })
  } finally {
    generatingLinkCode.value = false
  }
}

const qrCodePxSize = ref(200)
// onMounted(() => resizeQrSize())
// function resizeQrSize() {
//   // let minViewport = Math.min(window.innerWidth - 70, window.innerHeight - 55, 400)
//   // let size = Math.max(window.innerWidth - 70, 250)
//   // console.log({ minViewport, size })
//   // size = Math.min(size, minViewport)
//   // qrCodePxSize.value = size
// }

const qrCodeDataLink = computed(() => `app://com.paytaca.pos/link?code=${qrCodeDataB64.value}`)
const qrCodeDataB64 = computed(() => btoa(qrCodeData.value))
const qrCodeData = computed(() => {
  return JSON.stringify({
    code: linkCode.value?.code,
    encryptKey: linkCode.value?.encryptKey,
    nonce: linkCode.value?.nonce,
  })
})
watch(qrCodeData, () => console.log(qrCodeData.value))
onMounted(() => console.log(qrCodeData.value))

const expirationUpdateInterval = ref(null)
const linkExpiresIn = ref(null)
onMounted(() => {
  expirationUpdateInterval.value = setInterval(() => updateLinkExpiration(), 1000)
  updateLinkExpiration()
})
onUnmounted(() => clearInterval(expirationUpdateInterval.value))
watch(linkCode, () => updateLinkExpiration())
function updateLinkExpiration() {
  if (!linkCode.value?.expiresAt) return linkExpiresIn.value = null
  linkExpiresIn.value = Math.round(linkCode.value?.expiresAt - Date.now() / 1000)
}

function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}
</script>
<style scoped>
.qr-code-container {
  position:relative;
  margin-left: -10px;
  margin-right: -10px;

  background-color: white;

  display: flex;
  flex-flow: column;
  justify-content: center;
  align-content: center;

  border-radius: 16px;
  border: 2px solid #ed5f59;

  padding: 1rem;
}
</style>

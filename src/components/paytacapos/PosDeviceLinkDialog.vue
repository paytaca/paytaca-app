<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" seamless>
    <q-resize-observer @resize="resizeQrSize" />
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
        <div class="qr-code-container">
          <div class="row items-center justify-center">
            <q-skeleton v-if="generatingLinkCode" height="250px" width="250px"/>
            <qr-code
              v-else
              :key="qrCodePxSize"
              :text="qrCodeData"
              color="#253933"
              :size="qrCodePxSize"
              error-level="H"
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
          <span v-if="linkExpiresIn > 0" class="text-grey">
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
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import BCHJS from '@psf/bch-js';
import { Wallet } from 'src/wallet'
import { padPosId, aes } from 'src/wallet/pos'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue';
import { useStore } from 'vuex';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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

onMounted(() => generateLinkCode({ checkExpiry: true }))

async function generateLinkCode(opts) {
  const wallet = props.wallet.BCH
  const xpubkey = await wallet.getXPubKey()

  const key = aes.generateKey()
  const encryptedData = aes.encrypt(xpubkey, key.password, key.iv)
  const password = key.password + '.' + key.iv

  const nonce = Math.floor(Math.random() * 2 ** 31-1)
  const privkey = await wallet.getPrivateKey(nonce)

  const signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, encryptedData)

  const data = {
    walletHash: wallet.walletHash,
    posid: props.posid,
    encryptedData: encryptedData,
    decryptKey: password,
    nonce: nonce,
    signature: signature,
    opts: {
      checkExpiry: opts?.checkExpiry,
    }
  }

  generatingLinkCode.value = true
  $store.dispatch('paytacapos/generateLinkCode', data)
    .finally(() => {
      generatingLinkCode.value = false
    })
}

const qrCodePxSize = ref(250)
onMounted(() => resizeQrSize())
function resizeQrSize() {
  let minViewport = Math.min(window.innerWidth - 70, window.innerHeight - 55, 400)
  let size = Math.max(window.innerWidth - 70, 250)
  console.log({ minViewport, size })
  size = Math.min(size, minViewport)
  qrCodePxSize.value = size
}

const qrCodeDataLink = computed(() => `app://com.paytaca.pos/link?code=${qrCodeDataB64.value}`)
const qrCodeDataB64 = computed(() => btoa(qrCodeData.value))
const qrCodeData = computed(() => {
  return JSON.stringify({
    code: linkCode.value?.code,
    decryptKey: linkCode.value?.decryptKey,
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

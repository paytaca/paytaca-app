<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card :class="darkMode ? 'pt-dark' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm"> {{ $t('POSID')}}#{{ paddedPosId }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm">
        <q-banner class="rounded-borders" :class="darkMode ? 'bg-grey text-white': ''">
          <div class="row no-wrap">
            <div class="row items-center q-mr-sm">
              <q-icon name="info" size="1.5em"/>
            </div>
            <div>Device must be online to link POS device</div>
          </div>
        </q-banner>
        <div class="qr-code-container">
          <q-skeleton v-if="generatingLinkCode" height="250px" width="250px"/>
          <qr-code
            v-else
            :text="qrCodeData"
            color="#253933"
            :size="250"
            error-level="H"
            class="q-mb-sm"
          />
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
            Link expires in
            <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ linkExpiresIn }}</span>
            {{ linkExpiresIn > 1 ? 'seconds': 'second' }}
          </span>
          <span v-else-if="linkExpiresIn < 0" class="text-grey">
            Link expired
            <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ linkExpiresIn * -1 }}</span>
            {{ linkExpiresIn < -1 ? 'seconds': 'second' }} ago
          </span>
          <q-btn
            :disable="generatingLinkCode"
            :loading="generatingLinkCode"
            padding="none"
            flat
            no-caps
            :color="darkMode? 'white': 'brandblue'"
            label="Generate new code"
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
  const ppvsAddrPath = `0/${wallet.purelypeerVaultSigner.index}`
  const ppvsPrivKey = await wallet.getPrivateKey(ppvsAddrPath, wallet.purelypeerVaultSigner.derivationPath)

  const toBeEncryptedData = xpubkey + '@' + ppvsPrivKey

  const key = aes.generateKey()
  const encryptedData = aes.encrypt(toBeEncryptedData, key.password, key.iv)
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
  console.log(value)
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

  background-color: white;

  display: flex;
  justify-content: center;
  align-content: center;

  border-radius: 16px;
  border: 2px solid #ed5f59;

  padding: 1rem;
}
</style>

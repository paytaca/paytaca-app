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
            :text="linkCode?.code"
            color="#253933"
            :size="250"
            error-level="H"
            class="q-mb-sm"
          />
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
            v-if="linkExpiresIn == null || linkExpiresIn < 0 || generatingLinkCode"
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
import { padPosId } from 'src/wallet/pos'
import { useDialogPluginComponent } from 'quasar'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useStore } from 'vuex';
import Watchtower from 'watchtower-cash-js';

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
})

const paddedPosId = computed(() => padPosId(props.posid))
const walletData = computed(() => $store.getters['global/getWallet']('bch'))

const generatingLinkCode = ref(false)
const linkCode = computed(() => {
  return $store.getters['paytacapos/linkCodes']
    .find(linkCode => linkCode.walletHash === walletData.value?.walletHash && linkCode.posid === props.posid)
})
onMounted(() => console.log(linkCode.value?.code))
watch(() => [linkCode.value?.code], () => console.log(linkCode.value?.code))

onMounted(() => generateLinkCode({ checkExpiry: true }))
function generateLinkCode(opts) {
  const data = {
    walletHash: walletData.value?.walletHash,
    posid: props.posid,
    xpubkey: walletData.value?.xPubKey,
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

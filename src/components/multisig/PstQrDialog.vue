<template>
  <q-dialog
    ref="dialogRef"
    full-width
    full-height
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card
      class="q-dialog-plugin pt-card row items-center justify-center text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section class="col-12 justify-center">
        <div class="text-grad text-center text-bold">
          {{ $t("ProposalQrCode") }}
        </div>

        <div class="text-subtitle-2 text-center text-bow-muted">
          Scan the Animated QR from your device
        </div>
        <div class="flex flex-center q-mt-md">
          <img v-if="currentQr" :src="currentQr" style="width: 330px; height: 330px" class="br-15"/>
        </div>
        <div class="q-pa-md">
          <q-linear-progress rounded size="1.5em" :value="progress" color="secondary" class="q-mt-sm" >
            <div class="absolute-full flex flex-center items-center justify-center">
              <span class="text-caption text-bold text-white text-center">{{ progressLabel }}</span>
            </div>
          </q-linear-progress>
          <div class="text-subtitle-2 text-center text-bow-muted q-mt-md text-italic q-gutter-y-xs">
            <div>{{ $t('ScanPsbtTip', {}, `The sequence auto-recycles; keep scanning until all fragments are picked up by your scanner...`) }}</div>
            <div class="q-mt-sm">{{ $t('ScanProblemTip', {}, `Having trouble? Try adjusting the camera angle or try aiming it slightly above the bottom-left square marker.`) }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close')" @click="onDialogOK" color="red" rounded v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useDialogPluginComponent } from "quasar";
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
const { t: $t } = useI18n()
import { base64ToBin } from "bitauth-libauth-v3";
import { UR, UREncoder } from "@ngraveio/bc-ur";
import { Pst } from 'src/lib/multisig'

const props = defineProps({
  pst: Pst,
  darkMode: Boolean,
  cashAddressNetworkPrefix: String,
});

const { dialogRef, onDialogOK } = useDialogPluginComponent();

const currentQr = ref("");
const animationTimer = ref();
const encoder = ref(null);
const progress = ref(0)
const progressLabel = computed(() => {
  return (Math.floor(progress.value * 100)) + '% of QR Code Fragments Shown.'  
})

async function prepareBase64Chunks() {
  
  try {
    if (!props.pst) {
      return false;
    }
    const base64Psbt = await props.pst.export()
    const buffer = Buffer.from(base64ToBin(base64Psbt), 'base64');
    const ur = new UR(buffer, "crypto-psbt");
    
    const chunkSize = 50; 
    encoder.value = new UREncoder(ur, chunkSize);
    return encoder.value?.fragments?.length;
  } catch (error) {
    $q.notify({
      type: 'warning',
      message: `Warning: ${error}`,
      color: 'warning'
    })
    return false;
  }
}

function updateQrFrame() {
  if (!encoder.value) {
    $q.notify({
      type: 'warning',
      message: `Warning: Encoder not initialized`,
      color: 'warning'
    })
    return;
  }

  try {
    // Note: nextPart() never returns undefined - it cycles forever by design
    const part = encoder.value.nextPart();
    const qrImage = qrToString(part);
    if (qrImage) {
      currentQr.value = qrImage;
    }
    
    const match = part.match(/\d+-\d+/);
    progress.value = match[0]?.split('-').reduce((acc, curr) => {
      if (acc === 0) return curr 
      if (acc/curr >= 1) return 1
      return acc = acc / curr
    }, 0)
  } catch (error) {
    $q.notify({
      type: 'warning',
      message: `Warning: ${error}`,
      color: 'warning'
    })
  }
}

function qrToString(text) {
  if (!text) return "";
  try {
    const QRCode = require("qrcode-svg");
    const qrcode = new QRCode({
      content: text,
      ecl: "Q",   
      padding: 8, 
      join: true,
      swap: true
    });
    const svgString = qrcode.svg();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  } catch (error) {
    $q.notify({
      type: 'error',
      message: `Error: ${error}`,
      color: 'negative'
    })
    return "";
  }
}

function startAnimation() {
  if (!encoder.value) {
    $q.notify({
      type: 'warning',
      message: `Warning: Encoder not initialized`,
      color: 'warning'
    })
    return;
  }
  
  // First frame
  updateQrFrame();

  animationTimer.value = setInterval(() => {
    updateQrFrame();
  }, 300); // 300ms per frame (industry standard)
}

onMounted(async () => {
  await prepareBase64Chunks()
  startAnimation()
});

onBeforeUnmount(() => {
  if (animationTimer.value) clearInterval(animationTimer.value);
});

</script>

<style scoped>
.q-item.q-router-link--active,
.q-item--active {
  color: inherit;
}
</style>

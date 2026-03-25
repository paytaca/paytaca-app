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
        <div class="text-grad text-center text-h6">
          {{ $t("QrCode") }}
        </div>

        <div class="text-subtitle-2 text-center text-bow-muted">
          Scan the Animated QR from your device
        </div>
        <div class="flex flex-center q-mt-md">
          <img v-if="currentQr" :src="currentQr" style="width: 420px; height: 420px" class="br-15"/>
        </div>
        <div class="q-pa-md">
          <q-linear-progress rounded size="4em" :value="progress" color="secondary" class="q-mt-sm" >
            <div class="absolute-full flex flex-center items-center justify-center">
              <span class="text-caption text-bold text-white text-center">{{ progressLabel }}</span>
            </div>
          </q-linear-progress>
        </div>
        <!-- <div class="flex column text-center q-gutter-y-xl" style="margin-top: 20px;">
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="14px">
              <q-icon class="default-text-color"  size="24px" name="file_download" @click="handleDownloadPst"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">{{ $t('DownloadTxFile') }}</div>
          </div>
        </div> -->
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close')" @click="onDialogOK" color="red" rounded v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from "vue";
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

// === Animated QR State ===
const currentQr = ref(""); // data URL for current QR frame
const animationTimer = ref();
const encoder = ref(null);
const progress = ref(0)
const progressLabel = computed(() => {
  if (Math.floor(progress.value * 100) !== 100) {
    return (Math.floor(progress.value * 100)) + '% of QR Code Fragments Shown.'  
  }
  return (Math.floor(progress.value * 100)) + '% of QR Code Fragments Shown. The sequence auto-recycles; keep scanning until all fragments are picked up by your scanner...'
})

async function prepareBase64Chunks() {
  
  try {
    if (!props.pst) {
      return false;
    }
    const base64Psbt = await props.pst.export()
    const buffer = Buffer.from(base64ToBin(base64Psbt), 'base64');
    const ur = new UR(buffer, "crypto-psbt");
    
    // Create fragments
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
    // Generate QR code from UR string
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
      width: 400,
      height: 400,
      ecl: "Q",    // Error Correction Level
      padding: 12, 
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

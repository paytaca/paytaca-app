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
          {{ $t('TransactionQrCode', {}, 'Transaction QR Code') }}
        </div>

        <div class="text-subtitle-2 text-center text-bow-muted">
          {{ $t('ScanTransactionQrHint', {}, 'Scan the animated QR from the signer device') }}
        </div>
        <div class="flex flex-center q-mt-md">
          <img v-if="currentQr" :src="currentQr" style="width: 330px; height: 330px" class="br-15"/>
        </div>
        <div class="q-pa-md">
          <q-linear-progress rounded size="1.5em" :value="progress" color="secondary" class="q-mt-sm">
            <div class="absolute-full flex flex-center items-center justify-center">
              <span class="text-caption text-bold text-white text-center">{{ progressLabel }}</span>
            </div>
          </q-linear-progress>
          <div class="text-subtitle-2 text-center text-bow-muted q-mt-md text-italic q-gutter-y-xs">
            <div>{{ $t('ScanPsbtTip', {}, `The sequence auto-recycles; keep scanning until all fragments are picked up by your scanner...`) }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close', {}, 'Close')" @click="onDialogOK" color="red" rounded v-close-popup />
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

const props = defineProps({
  psbtBase64: String,
  darkMode: Boolean
});

const { dialogRef, onDialogOK } = useDialogPluginComponent();

const currentQr = ref("");
const animationTimer = ref(null);
const encoder = ref(null);
const progress = ref(0)
const progressLabel = computed(() => {
  return (Math.floor(progress.value * 100)) + '% of QR Code Fragments Shown.'
})

function prepareBase64Chunks() {
  if (!props.psbtBase64) {
    return false;
  }
  const buffer = Buffer.from(base64ToBin(props.psbtBase64), 'base64');
  const ur = new UR(buffer, "crypto-psbt");

  const chunkSize = 50;
  encoder.value = new UREncoder(ur, chunkSize);
  return encoder.value?.fragments?.length;
}

function updateQrFrame() {
  if (!encoder.value) {
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
    } catch {
      // ignore frame errors, keep animating
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
    } catch {
      return "";
    }
}

function startAnimation() {
  if (!encoder.value) {
    return;
  }

  updateQrFrame();

  animationTimer.value = setInterval(() => {
    updateQrFrame();
  }, 300);
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
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
          <img v-if="currentQr" :src="currentQr" style="width: 100%; max-width: 340px; height: auto" class="br-15"/>
        </div>
        <div class="q-pa-md">
          <div class="row items-center q-mt-sm">
            <q-linear-progress rounded size="1.5em" :value="progress" color="secondary" class="col" >
              <div class="absolute-full flex flex-center items-center justify-center">
                <span class="text-caption text-bold text-white text-center">{{ progressLabel }}</span>
              </div>
            </q-linear-progress>
            <q-btn flat round dense icon="help_outline" color="grey" class="q-ml-xs" @click="showScanHelp" />
          </div>
          <div class="column items-center q-mt-md q-gutter-y-xs">
            <div class="text-subtitle-2 text-bow-muted">{{ $t('QrDensity', {}, 'Density') }}</div>
            <q-btn-toggle
              v-model="selectedDensity"
              :options="densityOptions"
              toggle-color="secondary"
              rounded
              dense
            />
          </div>
          <div class="column items-center q-mt-md q-gutter-y-xs">
            <div class="text-subtitle-2 text-bow-muted">{{ $t('QrAnimationSpeed', {}, 'Animation') }}</div>
            <q-btn-toggle
              v-model="selectedAnimation"
              :options="animationOptions"
              toggle-color="secondary"
              rounded
              dense
/>
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
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { useDialogPluginComponent, useQuasar } from "quasar";
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
const { t: $t } = useI18n()
const $q = useQuasar()
import { base64ToBin } from "bitauth-libauth-v3";
import { UR, UREncoder } from "@ngraveio/bc-ur";
import { Pst } from 'src/lib/multisig'

const props = defineProps({
  pst: Pst,
  darkMode: Boolean,
  cashAddressNetworkPrefix: String,
});

const densityOptions = [
  { label: 'Low', value: 50 },
  { label: 'Medium', value: 150 },
  { label: 'High', value: 250 },
]

const animationOptions = [
  { label: 'slow', value: 450 },
  { label: 'normal', value: 300 },
  { label: 'fast', value: 100 }
]


const { dialogRef, onDialogOK } = useDialogPluginComponent();

const currentQr = ref("");
const animationTimer = ref();
const encoder = ref(null);
const progress = ref(0)
const selectedDensity = ref(150)
const selectedAnimation = ref(300)
const progressLabel = computed(() => {
  return (Math.floor(progress.value * 100)) + '% of QR Code Fragments Shown.'  
})

function showScanHelp() {
  $q.dialog({
    title: $t('ScanHelpTitle', {}, 'Scanning Tips'),
    message: `${$t('ScanPsbtTip', {}, `The sequence auto-recycles; keep scanning until all fragments are picked up by your scanner...`)}<br/><br/>${$t('ScanProblemTip', {}, `Having trouble? Try adjusting the camera angle or try aiming it slightly above the bottom-left square marker.`)}`,
    html: true,
    ok: {
      flat: true,
      color: 'primary',
      label: 'OK'
    },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(props.darkMode)}`,
  })
}

watch(selectedDensity, async (density, oldDensity) => {
  if (density !== oldDensity) {
    await prepareBase64Chunks(density)
  }
  restartAnimation()
})

watch(selectedAnimation, () => {
  restartAnimation()
})

async function prepareBase64Chunks(chunkSize = 100) {
  
  try {
    if (!props.pst) {
      return false;
    }
    const base64Psbt = await props.pst.export()
    const buffer = Buffer.from(base64ToBin(base64Psbt), 'base64');
    const ur = new UR(buffer, "crypto-psbt");
    
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
      padding: 6, 
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
  }, selectedAnimation.value);
}

function restartAnimation() {
  if (animationTimer.value) clearInterval(animationTimer.value);
  startAnimation();
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

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
          {{ $t("Tx Qr Code") }}
        </div>

        <div class="text-subtitle-2 text-center text-bow-muted">
          Scan the Animated QR from your device
        </div>
        <div class="flex flex-center q-mt-md">
          <img v-if="currentQr" :src="currentQr" style="width: 350px; height: 350px" />
        </div>
        <div class="q-pa-md">
          <q-linear-progress rounded size="30px" :value="progress" color="secondary" class="q-mt-sm" >
            <div class="absolute-full flex flex-center items-center">
              <span class="text-caption text-bold text-white">{{ progressLabel }}</span>
            </div>
          </q-linear-progress>
        </div>
        <div class="flex column text-center q-gutter-y-xl" style="margin-top: 20px;">
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="14px">
              <q-icon class="default-text-color"  size="24px" name="file_download" @click="handleDownloadPst"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">{{ $t('DownloadTxFile') }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close')" @click="onDialogOK" color="red" v-close-popup />
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
import { base64ToBin, binToBase64, binToHex, utf8ToBin } from "bitauth-libauth-v3";
import { UR, UREncoder, URDecoder } from "@ngraveio/bc-ur";
import { cborEncode, cborDecode } from "@ngraveio/bc-ur/dist/cbor";
import { extractMValue, getWalletHash, Pst } from 'src/lib/multisig'

// Props
const props = defineProps({
  pst: Pst,
  darkMode: Boolean,
  cashAddressNetworkPrefix: String,
});

const { dialogRef, onDialogOK } = useDialogPluginComponent();

// === Animated QR State ===
const currentQr = ref(""); // data URL for current QR frame
const animationTimer = ref();
// const currentChunkIndex = ref(0);
const encoder = ref(null);
// const totalParts = ref(0);
const testDecodingIndex = ref(0)
const decoder = ref(null);
const progress = ref(0)
const progressLabel = computed(() => {
  return (Math.floor(progress.value * 100)) + '% of QR Code Shown'
})

async function prepareBase64Chunks() {
  
  try {
    if (!props.pst) {
      console.error("Tx is required");
      return false;
    }
    const base64Psbt = await props.pst.export()
    console.log('BASE64 PSBT', base64Psbt)
    const buffer = Buffer.from(base64ToBin(base64Psbt), 'base64');
    const ur = new UR(buffer, "crypto-psbt");
    
    // Create encoder with 200-byte fragments for reliable scanning
    const chunkSize = 200;
    encoder.value = new UREncoder(ur, chunkSize);
    
    // Get total sequence length from encoder (UREncoder cycles infinitely, so we need to track manually)
    // sequenceLength tells us how many parts there are total
    // totalParts.value = Math.ceil(encoder.value.messageLength / chunkSize);

    // console.log(`Created UR encoder with ${totalParts.value} parts`);
    return encoder.value?.fragments?.length;

  } catch (error) {
    console.error("Error preparing UR chunks:", error);
    return false;
  }
}

function updateQrFrame() {
  if (!encoder.value) {
    console.warn("Encoder not available");
    return;
  }

  try {
    // Get current part from encoder (automatically cycles infinitely)
    // Note: nextPart() never returns undefined - it cycles forever by design
    const part = encoder.value.nextPart();
    // Generate QR code from UR string
    const qrImage = qrToString(part);
    if (qrImage) {
      currentQr.value = qrImage;
      // Track current index for display (cycles 0 to totalParts-1)
      // currentChunkIndex.value = (currentChunkIndex.value + 1) % totalParts.value;
    }
    
    const match = part.match(/\d+-\d+/);
    progress.value = match[0]?.split('-').reduce((acc, curr) => {
      if (acc === 0) return curr 
      if (acc/curr >= 1) return 1
      return acc = acc / curr
    }, 0)
    decoder.value.receivePart(part);
    testDecodingIndex.value = testDecodingIndex.value + 1
    if (decoder.value.isComplete()) {
      const ur = decoder.value.resultUR()
      const decodedData = Buffer.from(ur.cbor, 'base64')

      const pst = Pst.import(binToBase64(decodedData))
      const m = extractMValue(pst.inputs[0].redeemScript)
      console.log('M', m)
      console.log('Wallet', pst.wallet)
      // const walletHash = getWalletHash(pst.wallet)

      // console.log('Wallet Hash', walletHash)
      // todo: instead of relying on wallet hash from paytaca, use the xpubs
      console.log('PST IMPORTED', pst)
    }
  } catch (error) {
    console.error("Error generating QR frame:", error);
  }
}

function qrToString(text) {
  if (!text) return "";
  
  try {
    const QRCode = require("qrcode-svg");
    const qrcode = new QRCode({
      content: text,
      width: 350,
      height: 350,
      ecl: "Q", // High error correction for better scanning
      padding: 4, // Add padding for better scanning
      join: true,
      swap: true
    });
    const svgString = qrcode.svg();
    // Use URI encoding - more reliable for SVG data URLs
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return "";
  }
}

function startAnimation() {
  if (!encoder.value) {
    console.error("Encoder not initialized");
    return;
  }

  // Reset chunk index
  // currentChunkIndex.value = 0;

  // Update immediately for first frame
  updateQrFrame();

  // If only one part, no need to animate
  // if (totalParts.value === 1) {
  //   console.log("Only one part, displaying static QR code");
  //   return;
  // }

  // Start animation interval
  animationTimer.value = setInterval(() => {
    updateQrFrame();
  }, 300); // 300ms per frame (industry standard)
  
  // console.log(`Started animation with ${totalParts.value} parts`);
}

// === Lifecycle ===
onMounted(async () => {
  decoder.value = new URDecoder();
  console.log('onMounted')
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

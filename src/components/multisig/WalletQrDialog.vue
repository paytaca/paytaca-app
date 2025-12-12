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
          {{ $t("Wallet Qr Code") }}
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
              <q-icon class="default-text-color"  size="24px" name="file_download" @click="handleDownloadWallet"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">Download Wallet File</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn label="Close" @click="onDialogOK" color="red" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useDialogPluginComponent } from "quasar";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { binToBase64, binToHex, utf8ToBin } from "bitauth-libauth-v3";
import { UR, UREncoder, URDecoder } from "@ngraveio/bc-ur";
import { cborEncode, cborDecode } from "@ngraveio/bc-ur/dist/cbor";
// Props
const props = defineProps({
  wallet: Object,
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

function prepareBase64Chunks() {
  
  try {
    if (!props.wallet) {
      console.error("Wallet is required");
      return false;
    }

    const cborEncoded = cborEncode(props.wallet.export());
    console.log('CBOR ENCODED', binToHex(cborEncoded))
    const cborDecoded = cborDecode(cborEncoded);


    // const base64String = props.wallet.toBase64();
    // if (!base64String) {
    //   console.error("Wallet.toString() returned empty string");
    //   return false;
    // }

    console.log('ORIGINAL DATA', binToBase64(cborEncoded))

    // Decode base64 to buffer
    const buffer = Buffer.from(cborEncoded);
    
    // Create UR with crypto-mofnwallet type
    const ur = new UR(buffer, "crypto-mofnwallet");
    
    // Create encoder with 200-byte fragments for reliable scanning
    const chunkSize = 300;
    encoder.value = new UREncoder(ur, chunkSize);
    console.log('ENCODER', encoder.value)
    
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
      const originalData = Buffer.from(ur.cbor)
      console.log('DECODED DATA', binToBase64(originalData))
      console.log('decode cbor', cborDecode(ur.cbor))
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
onMounted(() => {
  decoder.value = new URDecoder();
  console.log('onMounted')
  if (prepareBase64Chunks()) {
    startAnimation();
  } else {
    console.error("Failed to prepare base64 chunks for QR display");
  }
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

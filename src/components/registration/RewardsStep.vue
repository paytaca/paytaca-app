<template>
  <QrScanner v-model="showQrScanner" @decode="processReferralCode" />
  <QRUploader ref="qr-upload" @detect-upload="processReferralCode" />

  <div v-if="!isLoading" class="row q-mt-sm q-gutter-y-xs">
    <template v-if="!isCodeProcessed">
      <span style="font-size: 18px;">
        <!-- Were you referred by a friend or a cashier of one of our partner merchants? -->
        {{ $t('ReferredStepDescription1') }}
      </span>
      <span class="text-subtitle1 q-mt-sm">
        {{ $t('ReferredStepDescription2') }}
      </span>
      <span class="text-body2 q-mt-sm">
        ({{ $t('ReferredStepDescription3') }})
      </span>

      <div class="row col-12 justify-evenly items-center q-mt-md">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="mdi-qrcode"
          @click="showQrScanner = true"
        />
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          @click="$refs['qr-upload'].$refs['q-file'].pickFiles()"
        />
      </div>
      <span
        v-if="isProcessingError"
        class="row full-width justify-center text-center text-red q-mt-md"
      >
        {{ $t('ReferredStepError') }}
      </span>

      <div class="row full-width justify-center text-center q-mt-xl">
        <span class="text-subtitle1">
          {{ $t('ReferredStepDescription4') }}
        </span>
      </div>
    </template>

    <div v-else class="row full-width justify-center text-center q-mt-sm">
      <span class="text-subtitle1">
        {{ $t('ReferredStepSuccess1') }}<br/><br/>
        {{ $t('ReferredStepSuccess1') }}
      </span>
    </div>
    <q-btn
      rounded
      :label="$t('Continue')"
      class="q-mt-sm full-width button"
      @click="$emit('on-proceed-to-next-step')"
    />
  </div>

  <div v-else class="row col-12 justify-center q-mt-lg">
    <span class="row col-12 justify-center text-center q-mb-md">
      {{ $t('ProcessingReferralCode') }} ...
    </span>
    <progress-loader />
  </div>
</template>

<script>
import { processReferralCode } from 'src/utils/engagementhub-utils/rewards'

import QrScanner from 'src/components/qr-scanner'
import QRUploader from 'src/components/QRUploader'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  name: 'RewardsStep',

  components: {
    QrScanner,
    QRUploader,
    ProgressLoader
  },

  props: {
    walletHash: { type: String, default: '' }
  },

  emits: ['on-proceed-to-next-step'],

  data () {
    return {
      showQrScanner: false,
      isLoading: false,
      isCodeProcessed: false,
      isProcessingError: false
    }
  },

  computed: {
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  methods: {
    async processReferralCode (content) {
      this.isLoading = true
      let referralCode = null

      if (typeof content === 'object') referralCode = content[0].rawValue
      else if (typeof content === 'string') referralCode = content

      if (referralCode) {
        this.isProcessingError = await processReferralCode({
          wallet_hash: this.walletHash,
          id: referralCode.split('-')[2],
          model: referralCode.split('-')[0]
        })
      } else this.isProcessingError = true

      this.isCodeProcessed = !this.isProcessingError
      this.isLoading = false
    }
  }
}
</script>

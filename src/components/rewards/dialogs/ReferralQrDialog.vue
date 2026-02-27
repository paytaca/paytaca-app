<template>
  <q-dialog persistent ref="dialogRef" seamless class="no-click-outside">
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center q-mb-sm">
        <span class="text-h6">{{ $t(`${referralType}ReferralQR`) }}</span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="text-subtitle1 q-mb-sm">
        {{ $t('ReferralQRDescription', 'Have new users scan this QR code during wallet creation.') }}
      </div>

      <div>
        <qr-code
          name="rfp-qr"
          border-width="3px"
          border-color="var(--q-primary)"
          :qr-id="0"
          :text="`${promoType}-${code}-${promoId}`"
          :size="200"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ReferralQrDialog',

  props: {
    code: { type: String, default: '' },
    promoId: { type: Number, default: -1 },
    promoType: { type: String, default: '' },
    referralType: { type: String, default: '' }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>

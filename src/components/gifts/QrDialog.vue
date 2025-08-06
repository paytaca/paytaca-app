<template>
  <q-dialog ref="dialog" @hide="onDialogHide">
    <q-card class="gift-qr-dialog" style="min-width: 350px">
      <q-btn
        icon="close"
        flat
        round
        dense
        class="absolute-top-right q-ma-sm"
        style="z-index: 1000;"
        v-close-popup
      />
      
      <q-card-section class="text-center q-pb-none">
        <div class="gift-icon q-mb-sm">
          <q-icon name="mdi-gift" size="32px" color="primary"/>
        </div>
        <div class="text-h5 text-weight-bold q-mb-xs">{{ $t('BCHGift') }}</div>
        <div class="text-h4 text-primary text-weight-bold q-mb-md">
          {{ getAssetDenomination(denomination, amount) }}
        </div>
        <div class="qr-container q-mb-md relative-position">
          <qr-code :text="'https://gifts.paytaca.com/claim/?code=' + qrCode" :size="200" />
          <div v-if="claimed || recovered" class="claimed-overlay">
            <div class="claimed-text">{{ recovered ? 'RECOVERED' : 'CLAIMED' }}</div>
          </div>
        </div>
        <div class="text-caption text-grey-7">
          {{ $t('ScanToClaimGift') }}
        </div>
      </q-card-section>

      <q-separator class="q-my-md" />

      <q-card-actions align="center" class="q-pa-md">
        <q-btn
          flat
          color="primary"
          :label="$t('ShareGiftLink')"
          icon="mdi-share-variant"
          @click="copyToClipboard"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getAssetDenomination } from 'src/utils/denomination-utils'

export default {
  name: 'QrDialog',
  props: {
    qrCode: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    claimed: {
      type: Boolean,
      default: false
    },
    recovered: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    denomination() {
      return this.$store.getters['global/denomination']
    }
  },
  emits: ['hide'],
  methods: {
    getAssetDenomination,
    show () {
      this.$refs.dialog.show()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.$emit('hide')
    },
    copyToClipboard () {
      const url = 'https://gifts.paytaca.com/claim/?code=' + this.qrCode
      this.$copyText(url)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        color: 'blue-9',
        timeout: 800,
        icon: 'mdi-clipboard-check'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.gift-qr-dialog {
  border-radius: 12px;
  
  .gift-icon {
    background: rgba(var(--q-primary), 0.1);
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }

  .qr-container {
    background: white;
    padding: 16px;
    border-radius: 8px;
    display: inline-block;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .claimed-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;

      .claimed-text {
        color: #800000;
        font-size: 32px;
        font-weight: bold;
        transform: rotate(-30deg);
        letter-spacing: 4px;
      }
    }
  }

  :deep(.q-card__section) {
    padding: 24px 24px 16px;
  }

  :deep(.q-card__actions) {
    padding: 8px 24px 16px;
    
    .q-btn {
      padding: 8px 24px;
    }
  }
}
</style> 
<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onAddressQrDecoded"
  />
  <QRUploader
    ref="qr-upload"
    @detect-upload="onAddressQrDecoded"
  />

  <q-card flat bordered class="form-card addresses-card">
    <q-card-section class="addresses-card-header">
      <div class="row justify-between items-center">
        <div class="text-subtitle2 text-weight-medium">
          Addresses
        </div>
        <div class="row items-center q-gutter-sm">
          <q-btn
            round
            flat
            icon="mdi-qrcode-scan"
            color="primary"
            @click="showQrScanner = true"
            aria-label="Scan QR code"
          />

          <q-btn
            round
            flat
            icon="mdi-image"
            color="primary"
            @click="onQRUploaderClick"
            aria-label="Upload QR image"
          />

          <q-btn
            round
            icon="mdi-plus"
            color="primary"
            unelevated
            @click="addresses.push({ address: '' }), scrollAddressesToBottom()"
            aria-label="Add address"
          />
        </div>
      </div>
    </q-card-section>

    <q-card-section class="addresses-card-content" ref="addressesScroll">
      <div v-if="addresses.length === 0" class="empty-addresses-state text-center q-pa-lg">
        <q-icon
          name="mdi-wallet-outline"
          size="48px"
          :color="darkMode ? 'grey-5' : 'grey-7'"
          class="q-mb-md"
        />
        <p
          class="text-body2 q-mb-none"
          :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
        >
          No addresses added yet
        </p>
      </div>

      <div v-else class="addresses-list">
        <q-card
          v-for="(address, index) in addresses"
          :key="index"
          flat
          bordered
          class="address-card q-mb-sm"
        >
          <q-card-section class="q-pa-sm">
            <div class="row items-center q-gutter-x-sm">
              <q-input
                dense
                v-model="address.address"
                label="Address"
                filled
                class="col"
                placeholder="Enter address"
                lazy-rules
                :dark="darkMode"
                :rules="[
                  val => checkAddressFormat(val) || 'Incorrect address format.'
                ]"
              />
              <q-btn
                round
                flat
                icon="mdi-minus"
                color="negative"
                size="sm"
                @click="addresses.splice(index, 1)"
                :aria-label="'Remove address ' + (index + 1)"
                class="q-ml-sm"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
import QrScanner from 'src/components/qr-scanner.vue'
import QRUploader from 'src/components/QRUploader'

export default {
  name: 'AddressesFormCard',

  components: {
    QrScanner,
    QRUploader,
  },

  props: {
    modelValue: { type: Array, default: new Array }
  },

  emits: ['update:modelValue'],

  data () {
    return {
      showQrScanner: false,
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },

    addresses: {
      get () {
        return this.modelValue
      },
      set (val) {
        this.$emit('update:modelValue', val)
      }
    }
  },

  methods: {
    onQRUploaderClick () {
      try {
        this.$refs['qr-upload'].$refs['q-file'].pickFiles()
      } catch (e) {
        console.error('QR upload picker error:', e)
        this.$q?.notify?.({
          type: 'negative',
          message: 'Unable to open file picker',
          timeout: 2500,
          position: 'top'
        })
      }
    },

    normalizeQrContentToAddress (content) {
      if (typeof content !== 'string') return ''
      let value = content.trim()
      if (!value) return ''

      // If multi-line QR content, keep the first line
      value = value.split('\n')[0].trim()

      // If BIP21-like payload, keep the base before query params
      value = value.split('?')[0].trim()

      return value
    },
    checkAddressFormat (address) {
      return (
        address.includes('bitcoincash:q') ||
        address.includes('bitcoincash:z')
      ) && address.length === 54
    },

    scrollAddressesToBottom () {
      const ref = this.$refs.addressesScroll
      const el = ref?.$el || ref
      if (!el || typeof el.scrollHeight !== 'number') return
      el.scrollTop = el.scrollHeight
    },

    onAddressQrDecoded (content) {
      // Close camera overlay (mobile scanner uses its own UI; this is still safe)
      this.showQrScanner = false

      const decoded = Array.isArray(content) ? content?.[0]?.rawValue : content
      const address = this.normalizeQrContentToAddress(decoded)

      if (!address) {
        this.$q.notify({
          type: 'negative',
          message: 'No QR code detected. Please try again.',
          timeout: 2000,
          position: 'top'
        })
        return
      }

      // Only accept P2PKH addresses + bch prefix (bitcoincash:q... or bitcoincash:z...)
      if (!this.checkAddressFormat(address)) {
        this.$q.notify({
          type: 'negative',
          message: 'Incorrect address format.',
          timeout: 1500,
          position: 'top'
        })
        return
      }

      const alreadyAdded = this.addresses.some(a => (a?.address || '').trim() === address)
      if (alreadyAdded) {
        this.$q.notify({
          type: 'warning',
          message: 'Address already added.',
          timeout: 1500,
          position: 'top'
        })
        return
      }

      this.addresses.push({ address })
      this.$q.notify({
        type: 'positive',
        message: 'Address added.',
        timeout: 1500,
        position: 'top'
      })

      this.$nextTick(() => this.scrollAddressesToBottom())
    }
  }
}
</script>

<style lang="scss" scoped>
.addresses-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.addresses-card-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 12px;

  .dark & {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.addresses-card-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 12px;
  min-height: 0;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    transition: background 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;

  .dark & {
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }

    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
}

.address-card {
  border-radius: 12px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .dark & {
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
}

.addresses-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-addresses-state {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}
</style>
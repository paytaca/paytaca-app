<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <QrScanner
      v-model="showQrScanner"
      @decode="onAddressQrDecoded"
    />
    <QRUploader ref="qr-upload" @detect-upload="onAddressQrDecoded" />

    <HeaderNav
      class="apps-header"
      backnavpath="/apps/address-book/"
      :title="'Address Book'"
      id="header-nav"
    />

    <div class="q-px-md page-content">
      <!-- Action Buttons Header -->
      <div class="action-header q-mb-lg" id="action-buttons">
        <div class="row justify-between items-center q-py-sm">
          <span class="text-h6 text-weight-bold col-7">
            {{ 'Add New Record'.toLocaleUpperCase() }}
          </span>

          <div class="row justify-end items-center q-gutter-sm col-auto">
            <q-btn
              round
              flat
              :outline="!favorite"
              :icon="favorite ? 'mdi-star' : 'mdi-star-outline'"
              :color="favorite ? 'amber' : 'primary'"
              @click="favorite = !favorite"
              :aria-label="favorite ? 'Remove from favorites' : 'Add to favorites'"
            >
              <q-tooltip>{{ favorite ? 'Remove from favorites' : 'Add to favorites' }}</q-tooltip>
            </q-btn>
      
            <q-btn
              rounded
              class="save-button"
              label="Save"
              color="primary"
              unelevated
              padding="sm md"
              @click="saveRecord"
            />
          </div>
        </div>
      </div>

      <!-- Name Input Card -->
      <q-card flat bordered class="form-card name-card q-my-md">
        <q-card-section class="q-pt-md q-pb-sm">
          <div class="text-subtitle2 text-weight-medium q-mb-sm">Record Name</div>
          <q-input
            v-model="recordName"
            label="Name"
            class="full-width"
            filled
            dense
            :dark="darkMode"
            placeholder="Enter contact name"
            :rules="[
              val => Boolean(val) || 'Name is required',
            ]"
          />
        </q-card-section>
      </q-card>

      <!-- Addresses Section Card -->
      <q-card flat bordered class="form-card addresses-card">
        <q-card-section class="addresses-card-header">
          <div class="row justify-between items-center">
            <div class="text-subtitle2 text-weight-medium">Addresses</div>
            <div class="row items-center q-gutter-sm">
              <q-btn
                round
                flat
                icon="mdi-qrcode-scan"
                color="primary"
                @click="showQrScanner = true"
                aria-label="Scan QR code"
              >
                <q-tooltip>Scan QR code</q-tooltip>
              </q-btn>

              <q-btn
                round
                flat
                icon="mdi-image"
                color="primary"
                @click="onQRUploaderClick"
                aria-label="Upload QR image"
              >
                <q-tooltip>Upload QR image</q-tooltip>
              </q-btn>

              <q-btn
                round
                icon="mdi-plus"
                color="primary"
                unelevated
                @click="addresses.push({ address: '' })"
                aria-label="Add address"
              >
                <q-tooltip>Add address</q-tooltip>
              </q-btn>
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
                <div class="row items-center q-gutter-sm">
                  <q-input
                    dense
                    v-model="address.address"
                    label="Address"
                    filled
                    class="col"
                    :dark="darkMode"
                    placeholder="Enter address"
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
                  >
                    <q-tooltip>Remove address</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script>
import { Address } from 'watchtower-cash-js';
import { ensureKeypair } from 'src/utils/memo-service';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { encryptMemo } from 'src/utils/transaction-memos';
import { getWalletHash } from 'src/utils/wallet-storage';

import HeaderNav from 'src/components/header-nav.vue'
import QrScanner from 'src/components/qr-scanner.vue'
import QRUploader from 'src/components/QRUploader'

export default {
  name: 'AddRecord',

  components: {
    HeaderNav,
    QrScanner,
    QRUploader
  },

  data () {
    return {
      recordName: '',
      favorite: false,
      addresses: [],
      showQrScanner: false,
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,

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
          timeout: 2500,
          position: 'top'
        })
        return
      }

      const alreadyAdded = this.addresses.some(a => (a?.address || '').trim() === address)
      if (alreadyAdded) {
        this.$q.notify({
          type: 'warning',
          message: 'Address already added',
          timeout: 2000,
          position: 'top'
        })
        return
      }

      this.addresses.push({ address })
      this.$q.notify({
        type: 'positive',
        message: 'Address added',
        timeout: 1500,
        position: 'top'
      })

      this.$nextTick(() => this.scrollAddressesToBottom())
    },

    async saveRecord () {
      console.log('saveRecord', this.recordName, this.addresses)
      const payload = { address_book: {}, addresses: [] }

      // encrypt the recordName
      let encryptedRecordName
      try {
        const keypair = await ensureKeypair()
        encryptedRecordName = await encryptMemo(keypair.privkey, keypair.pubkey, this.recordName)
        if (!encryptedRecordName) {
          throw new Error('Failed to encrypt record name')
        }
        payload.address_book.name = encryptedRecordName
        payload.address_book.is_favorite = this.favorite
        payload.address_book.wallet_hash = getWalletHash()
      } catch (error) {
        console.error('Error ensuring keypair or encrypting record name:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to encrypt record name',
          timeout: 2000,
        })
        return
      }

      // parse address type of addresses
      for (const address of this.addresses) {
        const addressObj = new Address(address.address)
        if (addressObj.isTokenAddress()) {
          payload.addresses.push({ address: address.address, address_type: 'ct' })
        } else {
          payload.addresses.push({ address: address.address, address_type: 'bch' })
        }
      }

      console.log('payload', payload)
    }
  }
}
</script>

<style lang="scss" scoped>
#app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.action-header {
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
  margin: 0 -16px;
  padding: 0 16px;
  transition: all 0.3s ease;
  flex-shrink: 0;

  .dark & {
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .favorite-btn-active {
    background: rgba(255, 193, 7, 0.2);
    border: 1px solid rgba(255, 193, 7, 0.4);
  }

  .save-button {
    font-weight: 600;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.form-card {
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .dark & {
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
}

.name-card {
  flex-shrink: 0;
}

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
<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card class="send-bch-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="dialog-header">
        <div class="text-h6">{{ $t('SendBCH', {}, 'Send BCH') }}</div>
        <q-btn icon="close" flat round dense @click="onCancel" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <!-- Amount -->
        <div class="amount-display">
          <div class="amount-value">{{ amount }} BCH</div>
        </div>

        <!-- Recipient -->
        <div class="recipient-info">
          <div class="recipient-label">{{ $t('To', {}, 'To') }}</div>
          <div class="recipient-address">
            <q-avatar size="24px" class="recipient-avatar">
              <span class="avatar-initial">{{ recipientInitial }}</span>
            </q-avatar>
            <div class="recipient-details">
              <div class="recipient-name">{{ recipientName }}</div>
              <div class="recipient-npub">{{ recipientNpub }}</div>
            </div>
          </div>
        </div>

        <!-- Published address (from Nostr profile) -->
        <div v-if="publishedAddress && !fetchingAddress" class="published-address q-mt-md">
          <div class="published-label">
            <q-icon name="verified" size="16px" color="positive" />
            <span>{{ $t('PublishedAddress', {}, 'Published Address') }}</span>
          </div>
          <div class="published-value">{{ publishedAddress }}</div>
        </div>

        <!-- No published address found -->
        <div v-if="addressLookupDone && !publishedAddress && !fetchingAddress" class="no-address q-mt-md">
          <q-icon name="info" size="16px" color="grey-5" />
          <span>{{ $t('NoPublishedAddress', {}, 'This user has not published a BCH address. Paste their address below.') }}</span>
        </div>

        <!-- Address Input (only shown when no published address) -->
        <div v-if="!publishedAddress" class="address-input-section q-mt-md">
          <div class="address-label">{{ $t('RecipientAddress', {}, 'Recipient BCH Address') }}</div>
          <q-input
            v-model="editableAddress"
            outlined
            dense
            placeholder="bitcoincash:..."
            :error="!addressValid && editableAddress.length > 0"
            :error-message="$t('InvalidAddress', {}, 'Invalid address')"
            class="address-field"
            @update:model-value="onAddressChange"
          >
            <template #append>
              <q-btn
                v-if="editableAddress"
                flat
                dense
                round
                icon="clear"
                size="sm"
                @click="editableAddress = ''"
              />
            </template>
          </q-input>
        </div>

        <!-- Loading state -->
        <div v-if="fetchingAddress" class="fetching-status q-mt-sm">
          <q-spinner size="16px" />
          <span>{{ $t('LookingUpAddress', {}, 'Looking up address from Nostr profile...') }}</span>
        </div>
      </q-card-section>

      <div class="swipe-container q-px-md q-pb-md">
        <DragSlide
          :disable="sending || !canSend"
          disable-absolute-bottom
          @swiped="onSwiped"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { validateAddress } from 'src/utils/send-page-utils'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { cachedLoadWallet } from 'src/wallet'
import { Address } from 'src/wallet'
import { getChangeAddress } from 'src/utils/send-page-utils'
import { npubEncode } from 'nostr-tools/nip19'
import DragSlide from 'src/components/drag-slide.vue'

export default {
  name: 'SendBchDialog',
  components: { DragSlide },
  props: {
    amount: { type: Number, required: true },
    recipientPubKey: { type: String, required: true },
    recipientName: { type: String, default: '' },
    preFilledAddress: { type: String, default: '' },
  },
  emits: ['ok', 'cancel'],
  data () {
    return {
      showDialog: true,
      sending: false,
      wallet: null,
      editableAddress: '',
      addressValid: false,
      validatedAddress: '',
      publishedAddress: '',
      fetchingAddress: false,
      addressLookupDone: false,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    recipientNpub () {
      try {
        const npub = npubEncode(this.recipientPubKey)
        return npub.slice(0, 12) + '...' + npub.slice(-8)
      } catch {
        return this.recipientPubKey?.slice(0, 12) + '...'
      }
    },
    recipientInitial () {
      return this.recipientName?.charAt(0)?.toUpperCase() || '?'
    },
    canSend () {
      return !!this.publishedAddress || (this.addressValid && !!this.validatedAddress)
    },
  },
  async mounted () {
    await this.loadWallet()
    await this.fetchRecipientAddress()
  },
  methods: {
    getDarkModeClass,
    async loadWallet () {
      const walletIndex = this.$store.getters['global/getWalletIndex']
      this.wallet = await cachedLoadWallet('BCH', walletIndex)
    },
    async fetchRecipientAddress () {
      // If pre-filled address was provided from /send command, use it directly
      if (this.preFilledAddress) {
        this.publishedAddress = this.preFilledAddress
        this.editableAddress = this.preFilledAddress
        this.addressLookupDone = true
        this.$nextTick(() => this.onAddressChange())
        return
      }

      this.fetchingAddress = true
      try {
        const address = await this.$store.dispatch('nostrChat/fetchPublishedBchAddress', {
          pubKeyHex: this.recipientPubKey,
        })
        if (address) {
          this.publishedAddress = address
          this.editableAddress = address
          this.$nextTick(() => this.onAddressChange())
        }
      } catch (err) {
        console.warn('[SendBchDialog] Failed to fetch recipient address:', err)
      } finally {
        this.fetchingAddress = false
        this.addressLookupDone = true
      }
    },
    onAddressChange () {
      if (!this.editableAddress) {
        this.addressValid = false
        this.validatedAddress = ''
        return
      }
      const result = validateAddress(this.editableAddress, 'bch', false)
      this.addressValid = result.valid && !!result.address
      this.validatedAddress = result.address || ''
    },
    onCancel () {
      this.showDialog = false
      this.$emit('cancel')
    },
    onSwiped (reset) {
      this.send().then(() => {
        // Dialog closes on success, no need to reset
      }).catch(() => {
        // On error, reset the slider so user can try again
        if (typeof reset === 'function') reset()
      })
    },
    async send () {
      if (!this.canSend) {
        throw new Error(this.$t('InvalidAddress', {}, 'No recipient address available'))
      }

      const addressToSend = this.publishedAddress || this.validatedAddress
      if (!addressToSend) {
        throw new Error(this.$t('InvalidAddress', {}, 'No recipient address available'))
      }

      this.sending = true
      try {
        const bchWallet = getWalletByNetwork(this.wallet, 'bch')
        if (!bchWallet || typeof bchWallet.sendBch !== 'function') {
          throw new Error('BCH wallet unavailable')
        }

        const changeAddress = await getChangeAddress('bch')
        if (!changeAddress) {
          throw new Error('Could not get change address')
        }

        const recipientAddress = new Address(addressToSend).toCashAddress()
        const recipients = [{
          address: recipientAddress,
          amount: this.amount,
        }]

        const sendResult = await bchWallet.sendBch(
          0,
          '',
          changeAddress,
          null,
          undefined,
          recipients,
        )

        if (!sendResult?.success) {
          throw new Error(sendResult?.error || 'Send BCH failed')
        }

        this.showDialog = false
        this.$emit('ok', {
          txid: sendResult.txid,
          amount: this.amount,
          recipient: recipientAddress,
        })
      } catch (err) {
        console.error('[SendBchDialog] Send failed:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || 'Failed to send BCH',
        })
        throw err
      } finally {
        this.sending = false
      }
    },
  },
}
</script>

<style scoped>
.send-bch-card {
  min-width: 320px;
  border-radius: 16px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
}

.amount-display {
  text-align: center;
  padding: 20px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.amount-value {
  font-size: 32px;
  font-weight: 700;
  color: #166534;
}

.recipient-info {
  margin-bottom: 16px;
}

.recipient-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.recipient-address {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
}

.recipient-avatar {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  font-weight: 600;
  font-size: 12px;
}

.recipient-details {
  flex: 1;
  min-width: 0;
}

.recipient-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.recipient-npub {
  font-size: 11px;
  color: #9ca3af;
  font-family: 'Courier New', monospace;
}

.published-address {
  padding: 10px 12px;
  background: rgba(34, 197, 94, 0.08);
  border-radius: 10px;
  border-left: 3px solid #22c55e;
}

.published-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #166534;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.published-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #1f2937;
  word-break: break-all;
}

.no-address {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(156, 163, 175, 0.08);
  border-radius: 10px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.address-input-section {
  margin-top: 8px;
}

.address-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.address-field :deep(.q-field__control) {
  border-radius: 10px;
}

.fetching-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

/* Dark mode */
.dark .amount-value {
  color: #86efac;
}

.dark .recipient-address {
  background: rgba(255, 255, 255, 0.05);
}

.dark .recipient-name {
  color: #e2e8f0;
}

.dark .recipient-npub {
  color: #64748b;
}

.dark .published-value {
  color: #e2e8f0;
}

.dark .no-address {
  color: #9ca3af;
}

.swipe-container {
  margin-top: -8px;
}

.swipe-container :deep(.drag-slide-container) {
  position: relative !important;
  z-index: 1;
}
</style>

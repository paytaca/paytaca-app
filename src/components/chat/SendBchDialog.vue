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

        <!-- Address Input -->
        <div class="address-input-section q-mt-md">
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

      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          :label="$t('Cancel', {}, 'Cancel')"
          color="grey"
          @click="onCancel"
        />
        <q-btn
          unelevated
          :label="$t('SendBCH', {}, 'Send BCH')"
          color="positive"
          :loading="sending"
          :disable="sending || !addressValid"
          @click="send"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { validateAddress } from 'src/utils/send-page-utils'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { cachedLoadWallet } from 'src/wallet'
import { getChangeAddress } from 'src/utils/send-page-utils'
import { npubEncode } from 'nostr-tools/nip19'

export default {
  name: 'SendBchDialog',
  props: {
    amount: { type: Number, required: true },
    recipientPubKey: { type: String, required: true },
    recipientName: { type: String, default: '' },
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
      this.fetchingAddress = true
      try {
        const address = await this.$store.dispatch('nostrChat/fetchPublishedBchAddress', {
          pubKeyHex: this.recipientPubKey,
        })
        console.log('[SendBchDialog] Fetched address:', address)
        if (address) {
          this.publishedAddress = address
          this.editableAddress = address
          await this.$nextTick()
          this.onAddressChange()
        }
      } catch (err) {
        console.warn('[SendBchDialog] Failed to fetch recipient address:', err)
      } finally {
        this.fetchingAddress = false
      }
    },
    onAddressChange () {
      if (!this.editableAddress) {
        this.addressValid = false
        this.validatedAddress = ''
        return
      }
      const result = validateAddress(this.editableAddress, 'bch', false)
      this.addressValid = result.valid
      this.validatedAddress = result.address || ''
    },
    onCancel () {
      this.showDialog = false
      this.$emit('cancel')
    },
    async send () {
      if (!this.addressValid || !this.validatedAddress) {
        this.$q.notify({
          type: 'negative',
          message: this.$t('InvalidAddress', {}, 'Please enter a valid BCH address'),
        })
        return
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

        const recipients = [{
          address: this.validatedAddress,
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
          recipient: this.validatedAddress,
        })
      } catch (err) {
        console.error('[SendBchDialog] Send failed:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || 'Failed to send BCH',
        })
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
</style>

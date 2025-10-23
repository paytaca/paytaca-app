<template>
  <div class="q-px-md text-center sent-success-container">
    <q-icon size="70px" name="check_circle" color="green-5" />
    <div
      class="text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="{ 'margin-top': $q.platform.is.ios ? '60px' : '20px'}"
    >
      <p style="font-size: 22px;">{{ $t('SuccessfullySent') }}</p>
      <template v-if="isNFT">
        <p class="amount-label">{{ name }}</p>
      </template>
      <template v-else>
        <p class="amount-label">{{ amountSent }}</p>
        <template v-if="!isCashToken">
          <p class="amount-fiat-label">({{ fiatAmountSent }})</p>
        </template>
      </template>

      <!-- Reference ID Section -->
      <div class="reference-id-section q-mt-md">
        <div class="text-grey text-weight-medium text-caption">{{ $t('ReferenceId')}}</div>
        <div class="reference-id-value">
          {{ txid.substring(0, 6).toUpperCase() }}
        </div>
        <q-separator color="grey" class="q-mt-sm"/>
      </div>

      <!-- View Details Button -->
      <div class="q-mt-md q-mb-sm">
        <q-btn
          :label="$t('ViewDetails', {}, 'View details')"
          no-caps
          unelevated
          class="button view-details-btn"
          @click="openSendSuccessDetailsDialog"
        />
      </div>

      <!-- Transaction ID Section -->
      <div class="transaction-id-section q-mt-md">
        <div class="text-grey text-weight-medium text-caption q-mb-sm">{{ $t('TransactionId')}}</div>
        <div 
          class="txid-container"
          :class="getDarkModeClass(darkMode)"
          @click="copyTxid"
        >
          <span class="txid-text">
            {{ txid.slice(0, 8) }}...{{ txid.slice(-8) }}
          </span>
          <q-icon name="content_copy" size="18px" class="copy-icon" />
        </div>
        <div class="view-explorer-container q-mt-sm">
        <a
            class="view-explorer-link"
          :class="getDarkModeClass(darkMode)"
          :href="getExplorerLink(txid)"
          target="_blank"
        >
            <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
          {{ $t('ViewInExplorer') }}
        </a>
        </div>
      </div>
      <div v-if="formattedTxTimestamp" class="text-center text-grey q-mt-md q-mb-xs" style="font-size: 13px;">
        {{ formattedTxTimestamp }}
      </div>

      <!-- Transaction Memo Section -->
      <div class="row justify-center q-mt-sm q-mb-sm">
        <div class="col-12 col-md-8 q-px-md">
          <div v-if="!editingMemo && transactionMemo" 
            class="text-left q-my-sm rounded-borders q-px-md q-py-sm text-subtitle1 memo-container"
            :class="getDarkModeClass(darkMode, 'text-white', '')"
            @click="editingMemo = true"
          >
            <div class="row items-center">
              <div class="col">
                <span :class="getDarkModeClass(darkMode, 'text-grey-5', 'text-grey-8')">
                  {{ $t('Memo') }}:
                </span>
                {{ transactionMemo }}
              </div>
              <q-btn 
                flat 
                dense 
                round 
                icon="edit" 
                size="sm"
                :class="getDarkModeClass(darkMode, 'text-grey-5', 'text-grey-8')"
              />
            </div>
          </div>

          <div v-else class="memo-input-container">
            <q-input
              v-model="memoInput"
              :dark="darkMode"
              filled
              :label="transactionMemo ? $t('EditMemo', {}, 'Edit memo') : $t('AddMemo', {}, 'Add memo (optional)')"
              :placeholder="$t('AddNoteForThisTransaction', {}, 'Add a note for this transaction...')"
              :disable="networkError"
              maxlength="200"
              counter
              type="textarea"
              rows="3"
              class="q-mb-sm"
            >
              <template v-slot:append>
                <q-icon 
                  v-if="memoInput" 
                  name="close" 
                  class="cursor-pointer" 
                  @click="memoInput = ''"
                />
              </template>
            </q-input>
            <div v-if="networkError" class="row justify-between q-pb-xs q-px-sm">
              <div class="text-grey-5 text-italic" style="font-size: 12px;">
                {{ $t('NetworkError', {}, 'Network error. Try again later.') }}
              </div>
            </div>
            <div class="row q-gutter-sm justify-end">
              <q-btn
                v-if="transactionMemo"
                flat
                no-caps
                :label="$t('Cancel')"
                @click="cancelEditMemo"
              />
              <q-btn
                no-caps
                class="button"
                :label="$t('Save')"
                :disable="!memoInput || memoInput === transactionMemo || networkError"
                @click="saveMemo"
              />
            </div>
          </div>
        </div>
      </div>
      <q-item
        v-if="jpp?.paymentManuallyVerified"
        class="text-left bg-warning rounded-borders text-black text-subtitle1 q-mt-sm"
      >
        <q-item-section avatar style="min-width: unset;">
          <q-icon name="warning" size="1.5em"/>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('PaymentNotYetAcknowledged') }}</q-item-label>
        </q-item-section>
      </q-item>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getExplorerLink } from 'src/utils/send-page-utils'
import {
  parseFiatCurrency,
  parseAssetDenomination
} from 'src/utils/denomination-utils'
import { fetchMemo, createMemo, updateMemo, encryptMemo, decryptMemo, authMemo } from 'src/utils/transaction-memos.js'
import { getKeypair } from 'src/exchange/chat/keys'

import SendSuccessDetailsDialog from 'src/components/send-page/SendSuccessDetailsDialog.vue'

export default {
  name: 'SendSuccessBlock',

  props: {
    isNFT: { type: Boolean, default: false },
    isCashToken: { type: Boolean, default: false },

    name: { type: String, default: '' },
    txid: { type: String, default: '' },
    denomination: { type: String, default: 'BCH' },

    totalFiatAmountSent: { type: [String, Number] },
    totalAmountSent: { type: Number, default: 0 },
    txTimestamp: { type: Number, default: 0 },

    asset: { type: Object, default: Object },
    jpp: { type: Object, default: Object },
    recipients: { type: Object, default: Object },

    currentSendPageCurrency: { type: Function },
    convertToFiatAmount: { type: Function }
  },

  data () {
    return {
      amountSent: '',
      fiatAmountSent: '',
      transactionMemo: '',
      memoInput: '',
      editingMemo: false,
      hasMemo: false,
      networkError: false,
      keypair: null
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    transactionBreakdownData () {
      if (this.jpp?.parsed?.outputs !== undefined) {
        return this.jpp.parsed.outputs.map(value => {
          const amount = parseAssetDenomination(
            this.denomination, { ...this.asset, balance: value.amount }
          )
          const fiatAmount = this.parseFiatAmount(0, value.amount)

          return {
            address: value.address,
            amount: `${amount} (${fiatAmount})`
          }
        })
      } else {
        return this.recipients.map(value => {
          const amount = parseAssetDenomination(
            this.denomination, { ...this.asset, balance: value.amount }
          )
          const fiatAmount = this.parseFiatAmount(0, value.amount)
          const tokenAmount = this.isCashToken ? '' : ` (${fiatAmount})`

          return {
            address: value.recipientAddress,
            amount: this.isNFT ? this.name : `${amount}${tokenAmount}`
          }
        })
      }
    },
    formattedTxTimestamp () {
      const dateObj = new Date(this.txTimestamp)
      if (!dateObj.getTime()) return ''

      const langs = [this.$store.getters['global/language'], 'en-US']
      return new Intl.DateTimeFormat(langs, {
        dateStyle: 'medium',
        timeStyle: 'full'
      }).format(dateObj)
    }
  },

  mounted () {
    this.amountSent = parseAssetDenomination(
      this.denomination, { ...this.asset, balance: this.totalAmountSent }
    )
    this.fiatAmountSent = this.parseFiatAmount(
      this.totalFiatAmountSent, this.totalAmountSent
    )
    this.loadMemo()
  },

  methods: {
    getDarkModeClass,

    getExplorerLink (txid) {
      return getExplorerLink(txid, this.isCashToken)
    },
    openSendSuccessDetailsDialog () {
      this.$q.dialog({
        component: SendSuccessDetailsDialog,
        componentProps: {
          isNFT: this.isNFT,
          isCashToken: this.isCashToken,
          totalSent: this.amountSent,
          totalFiatSent: this.fiatAmountSent,
          txid: this.txid,
          timestamp: this.formattedTxTimestamp,
          name: this.name,
          breakdownList: this.transactionBreakdownData
        }
      })
    },
    parseFiatAmount (origFiatAmount, origAmount) {
      let fiatAmount
      if (origFiatAmount > 0 && this.asset.id === 'bch') {
        fiatAmount = parseFiatCurrency(
          origFiatAmount, this.currentSendPageCurrency()
        )
      } else {
        fiatAmount = parseFiatCurrency(
          this.convertToFiatAmount(origAmount), this.currentSendPageCurrency()
        )
      }
      return fiatAmount
    },
    async loadMemo () {
      if (!this.txid) return
      
      try {
        // Get keypair for encryption/decryption
        this.keypair = await getKeypair().catch(console.error)
        if (!this.keypair) {
          console.error('Failed to get keypair')
          this.networkError = true
          return
        }

        // Fetch memo from server
        let currentMemo = null
        try {
          currentMemo = await fetchMemo(this.txid)
        } catch (err) {
          console.error('Error fetching memo:', err)
          this.networkError = true
        }

        if (currentMemo) {
          if ('error' in currentMemo) {
            this.hasMemo = false
            // Show input field if no memo exists
            this.editingMemo = true
          } else {
            // Decrypt memo
            const decryptedNote = await decryptMemo(this.keypair.privkey, currentMemo.note)
            this.transactionMemo = decryptedNote
            this.memoInput = decryptedNote
            this.hasMemo = true
          }
        } else {
          // Show input field if no memo exists
          this.editingMemo = true
        }
      } catch (error) {
        console.error('Error loading memo:', error)
        this.networkError = true
        // Show input field even on error
        this.editingMemo = true
      }
    },
    async saveMemo () {
      if (!this.txid || !this.memoInput) return
      if (!this.keypair) {
        this.$q.notify({
          message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
        return
      }

      try {
        // Ensure user is authenticated before saving
        await authMemo()

        // Encrypt the memo before sending
        const encryptedMemo = await encryptMemo(
          this.keypair.privkey,
          this.keypair.pubkey,
          this.memoInput.trim()
        )

        const data = {
          txid: this.txid,
          note: encryptedMemo
        }

        let response = null
        if (this.hasMemo) {
          // Update existing memo
          try {
            response = await updateMemo(data)
          } catch (err) {
            console.error('Error updating memo:', err)
            this.networkError = true
          }
        } else {
          // Create new memo
          try {
            response = await createMemo(data)
          } catch (err) {
            console.error('Error creating memo:', err)
            this.networkError = true
          }
        }

        if (response) {
          if ('error' in response) {
            this.hasMemo = false
            this.$q.notify({
              message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
              color: 'negative',
              icon: 'error',
              position: 'top',
              timeout: 2000
            })
          } else {
            // Successfully saved
            this.transactionMemo = this.memoInput.trim()
            this.hasMemo = true
            this.editingMemo = false
            
            this.$q.notify({
              message: this.$t('MemoSaved', {}, 'Memo saved'),
              color: 'positive',
              icon: 'check_circle',
              position: 'top',
              timeout: 2000
            })
          }
        } else {
          this.$q.notify({
            message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 2000
          })
        }
      } catch (error) {
        console.error('Error saving memo:', error)
        this.$q.notify({
          message: this.$t('ErrorSavingMemo', {}, 'Error saving memo'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }
    },
    cancelEditMemo () {
      this.memoInput = this.transactionMemo
      this.editingMemo = false
    },
    copyTxid () {
      this.$copyText(this.txid)
      this.$q.notify({
        message: this.$t('TransactionIdCopied', {}, 'Transaction ID copied to clipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  .sent-success-container {
    margin-top: -70px;

    .amount-label {
      font-size: 28px;
      font-weight: 600;
      margin-top: -10px;
      margin-bottom: 4px;
    }
    
    .amount-fiat-label {
      font-size: 20px;
      margin-top: 0;
      opacity: 0.85;
    }

    // Reference ID Section
    .reference-id-section {
      .reference-id-value {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: 8px;
        margin-top: 8px;
        font-family: 'Courier New', monospace;
      }
    }

    // View Details Button
    .view-details-btn {
      min-width: 180px;
      font-weight: 500;
      padding: 10px 24px;
    }

    // Transaction ID Section
    .transaction-id-section {
      .txid-container {
        cursor: pointer;
        padding: 12px 20px;
        border-radius: 12px;
        transition: all 0.25s ease;
        display: inline-flex;
        align-items: center;
        gap: 12px;
        background: rgba(128, 128, 128, 0.08);
        border: 1px solid rgba(128, 128, 128, 0.2);
        
        &:hover {
          background: rgba(128, 128, 128, 0.15);
          border-color: rgba(128, 128, 128, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          
          .copy-icon {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        
        &:active {
          transform: translateY(0);
        }

        .txid-text {
          font-family: 'Courier New', monospace;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        .copy-icon {
          opacity: 0.7;
          transition: all 0.2s ease;
        }
      }

      .view-explorer-container {
        display: block;
        text-align: center;
        
        .view-explorer-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          color: var(--q-primary);
          font-size: 15px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
          
          &:hover {
            background: rgba(0, 128, 0, 0.08);
            transform: translateX(2px);
          }
          
          &.dark {
            color: #4ade80;
          }
        }
      }
    }
    
    // Memo Section
    .memo-container {
      min-width: 50vw;
      border: 1px solid rgba(128, 128, 128, 0.3);
      background-color: inherit;
      cursor: pointer;
      transition: all 0.25s ease;
      
      &:hover {
        border-color: rgba(128, 128, 128, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    }
    
    .memo-input-container {
      width: 100%;
      
      .q-field {
        margin-bottom: 8px;
      }
    }
  }
</style>

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
          {{ hexToRef(txid.substring(0, 6)) }}
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
      <div v-if="formattedTxTimestamp" class="text-center text-grey q-mt-md q-mb-md" style="font-size: 13px;">
        {{ formattedTxTimestamp }}
      </div>

      <!-- Transaction Memo Section -->
      <div class="memo-section q-mt-md">
        <div v-if="hasMemo || editingMemo" class="text-grey text-weight-medium text-caption q-mb-sm text-center">{{ $t('Memo') }}</div>
        <div class="row justify-center">
          <div class="col-12 col-md-8 q-px-md">
            <q-slide-transition>
              <div v-if="!editingMemo">
                <div v-if="hasMemo" class="memo-display-container">
                  <div 
                    class="memo-content-container"
                    :class="getDarkModeClass(darkMode)"
                  >
                    <div class="memo-text">{{ transactionMemo }}</div>
                    <div class="memo-actions">
                      <q-btn flat icon="edit" size="sm" padding="xs sm" @click="openMemo()"/>
                      <q-separator vertical :dark="darkMode"/>
                      <q-btn flat icon="delete" size="sm" padding="xs sm" color="red-7" @click="confirmDelete()"/>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <q-item-section class="q-pt-sm text-center">
                    <q-btn
                      outline
                      no-caps
                      :label="$t('AddMemo', {}, 'Add memo')"
                      icon="add"
                      color="grey-7"
                      class="br-15"
                      padding="xs md"
                      :disable="networkError"
                      @click="openMemo()"
                    />
                    <div v-if="networkError" class="row justify-center q-pt-xs q-px-sm">
                      <div class="text-grey-5 text-italic" style="font-size: 12px;">
                        {{ $t('NetworkError', {}, 'Network error. Try again later.') }}
                      </div>
                    </div>
                  </q-item-section>
                </div>
              </div>
              <q-item v-else style="overflow-wrap: anywhere;">
                <q-item-section>
                  <q-item-label>
                    <div class="row items-start">
                      <div class="col q-pr-sm">
                        <input
                          ref="memoInputRef"
                          v-model="memoInput"
                          type="text"
                          class="memo-input"
                          :class="darkMode ? 'memo-input-dark' : 'memo-input-light'"
                          :placeholder="`${$t('EnterMemo', {}, 'Enter memo')}...`"
                          style="width: 100%; border: none; outline: none; font-size: 14px; padding: 8px 12px; font-family: inherit; border-radius: 4px;"
                          @input="onMemoInputChange"
                          @keyup.enter="saveMemo()"
                          @keyup.esc="cancelEditMemo()"
                        />
                      </div>
                      <div class="row items-center no-wrap">
                        <q-btn flat icon="check" size="sm" padding="xs sm" color="primary" :disable="!memoInput || memoInput === transactionMemo" @click="saveMemo()"/>
                        <q-separator vertical :dark="darkMode"/>
                        <q-btn flat icon="close" size="sm" padding="xs sm" @click="cancelEditMemo()"/>
                      </div>
                    </div>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-slide-transition>
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
import { hexToRef } from 'src/utils/reference-id-utils'

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
      // Helper to convert amount to smallest unit if needed for tokens
      const convertAmountForDisplay = (amount) => {
        if (this.asset && this.asset.decimals && this.asset.id !== 'bch' && this.asset.id !== 'sbch') {
          // Amount is in human-readable format, convert to smallest unit
          return amount * (10 ** this.asset.decimals)
        }
        return amount
      }

      if (this.jpp?.parsed?.outputs !== undefined) {
        return this.jpp.parsed.outputs.map(value => {
          const convertedAmount = convertAmountForDisplay(value.amount)
          const amount = parseAssetDenomination(
            this.denomination, { ...this.asset, balance: convertedAmount }
          )
          const fiatAmount = this.parseFiatAmount(0, value.amount)

          return {
            address: value.address,
            amount: `${amount} (${fiatAmount})`
          }
        })
      } else {
        return this.recipients.map(value => {
          const convertedAmount = convertAmountForDisplay(value.amount)
          const amount = parseAssetDenomination(
            this.denomination, { ...this.asset, balance: convertedAmount }
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
    // For tokens, totalAmountSent is in human-readable format, but parseAssetDenomination
    // expects balance in smallest units. Convert if needed.
    let balanceForDisplay = Math.abs(this.totalAmountSent)
    if (this.asset && this.asset.decimals && this.asset.id !== 'bch' && this.asset.id !== 'sbch') {
      // Convert from human-readable format to smallest unit
      balanceForDisplay = balanceForDisplay * (10 ** this.asset.decimals)
    }
    
    this.amountSent = parseAssetDenomination(
      this.denomination, { ...this.asset, balance: balanceForDisplay }
    )
    this.fiatAmountSent = this.parseFiatAmount(
      this.totalFiatAmountSent, this.totalAmountSent
    )
    this.loadMemo()
  },

  methods: {
    getDarkModeClass,
    hexToRef,

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
      const currency = this.currentSendPageCurrency()
      const fiatProvided = Number(origFiatAmount)
      if (Number.isFinite(fiatProvided) && fiatProvided !== 0 && this.asset.id === 'bch') {
        return parseFiatCurrency(Math.abs(fiatProvided), currency)
      }
      const amountAbs = Math.abs(Number(origAmount))
      const converted = this.convertToFiatAmount(amountAbs)
      return parseFiatCurrency(converted, currency)
    },
    async loadMemo () {
      if (!this.txid) return
      
      try {
        // Get keypair for encryption/decryption
        this.keypair = await getKeypair().catch(console.error)
        // If keypair is null or invalid, try to regenerate it
        if (!this.keypair || !this.keypair.privkey || !this.keypair.pubkey) {
          try {
            const { updateOrCreateKeypair } = await import('src/exchange/chat/index.js')
            this.keypair = await updateOrCreateKeypair(false)
          } catch (error) {
            console.error('Failed to regenerate keypair:', error)
            this.networkError = true
            return
          }
        }
        
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
            this.editingMemo = false
          } else {
            // Decrypt memo
            const decryptedNote = await decryptMemo(this.keypair.privkey, currentMemo.note)
            this.transactionMemo = decryptedNote
            this.memoInput = decryptedNote
            this.hasMemo = true
            this.editingMemo = false
          }
        } else {
          this.hasMemo = false
          this.editingMemo = false
        }
      } catch (error) {
        console.error('Error loading memo:', error)
        this.networkError = true
        this.hasMemo = false
        this.editingMemo = false
      }
    },
    async saveMemo () {
      // Double-check the input value from DOM in case v-model hasn't updated
      const domInputValue = this.$refs.memoInputRef?.value || ''
      const memoToSave = domInputValue || this.memoInput
      
      console.log('saveMemo called')
      console.log('- this.memoInput:', this.memoInput)
      console.log('- DOM input value:', domInputValue)
      console.log('- memoToSave:', memoToSave)
      
      if (!this.txid) {
        console.log('Early return - txid is empty')
        return
      }
      
      // Check if memo is empty or just whitespace
      const trimmedMemo = memoToSave.trim()
      if (!trimmedMemo) {
        console.log('Early return - memo is empty or just whitespace')
        return
      }
      
      if (!this.keypair) {
        console.error('Keypair is missing')
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
          trimmedMemo
        )

        console.log('Encrypted memo:', encryptedMemo)
        
        if (!encryptedMemo) {
          console.error('Encryption failed - encryptedMemo is empty')
          this.$q.notify({
            message: this.$t('ErrorEncryptingMemo', {}, 'Error encrypting memo'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 2000
          })
          return
        }

        const data = {
          txid: this.txid,
          note: encryptedMemo
        }
        
        console.log('Data being sent to server:', data)

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
            this.transactionMemo = trimmedMemo
            this.memoInput = trimmedMemo
            this.hasMemo = true
            this.editingMemo = false
            
            console.log('Memo saved successfully:', trimmedMemo)
            
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
    openMemo () {
      this.editingMemo = true
      this.$nextTick(() => {
        if (this.$refs.memoInputRef) {
          this.$refs.memoInputRef.focus()
        }
      })
    },
    onMemoInputChange (event) {
      console.log('Memo input changed:', event.target.value)
      console.log('Current memoInput value:', this.memoInput)
    },
    cancelEditMemo () {
      this.memoInput = this.transactionMemo
      this.editingMemo = false
    },
    async confirmDelete () {
      this.$q.dialog({
        title: this.$t('DeletingThisMemo', {}, 'Deleting this Memo'),
        message: '',
        dark: this.darkMode,
        ok: {
          push: true,
          color: 'primary',
          flat: true
        },
        cancel: {
          push: true,
          color: 'primary',
          flat: true
        },
        persistent: true,
        class: this.darkMode ? 'text-white' : 'text-black'
      }).onOk(async () => {
        try {
          const { deleteMemo } = await import('src/utils/transaction-memos.js')
          await deleteMemo(this.txid)
          this.hasMemo = false
          this.transactionMemo = ''
          this.memoInput = ''
          
          this.$q.notify({
            message: this.$t('MemoDeleted', {}, 'Memo deleted'),
            color: 'positive',
            icon: 'check_circle',
            position: 'top',
            timeout: 2000
          })
        } catch (error) {
          console.error('Error deleting memo:', error)
          this.$q.notify({
            message: this.$t('ErrorDeletingMemo', {}, 'Error deleting memo'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 2000
          })
        }
      })
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
    .memo-display-container {
      display: flex;
      justify-content: center;
      margin-bottom: 12px;
    }

    .memo-content-container {
      cursor: default;
      padding: 12px 20px;
      border-radius: 12px;
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(128, 128, 128, 0.08);
      border: 1px solid rgba(128, 128, 128, 0.2);
      max-width: 100%;
      
      .memo-text {
        flex: 1;
        word-break: break-word;
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .memo-actions {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
    }

    .memo-input {
      &.memo-input-dark {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
      }
      
      &.memo-input-light {
        background-color: rgba(0, 0, 0, 0.05);
        color: black;
      }
    }
  }
</style>

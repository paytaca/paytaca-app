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

      <div class="text-center q-mt-lg">
        <div class="text-grey">{{ $t('ReferenceId')}}</div>
        <div class="text-h4" style="letter-spacing: 6px;">
          {{ txid.substring(0, 6).toUpperCase() }}
        </div>
        <q-separator color="grey"/>
      </div>
      <div class="q-px-xs q-mt-sm text-subtitle1">
        <q-btn
          label="View details"
          class="q-my-sm button"
          @click="openSendSuccessDetailsDialog"
        /><br /><br />
        <div class="text-grey">{{ $t('TransactionId')}}</div>
        <div 
          class="txid-container row items-center justify-center q-gutter-xs"
          :class="getDarkModeClass(darkMode)"
          @click="copyTxid"
        >
          <span style="font-family: monospace;">
            {{ txid.slice(0, 8) }}...{{ txid.slice(-8) }}
          </span>
          <q-icon name="content_copy" size="16px" class="copy-icon" />
        </div>
        <a
          class="button button-text-primary view-explorer-button"
          style="text-decoration: none;"
          :class="getDarkModeClass(darkMode)"
          :href="getExplorerLink(txid)"
          target="_blank"
        >
          {{ $t('ViewInExplorer') }}
        </a>
      </div>
      <div v-if="formattedTxTimestamp" class="text-center text-grey q-mt-lg">
        {{ formattedTxTimestamp }}
      </div>

      <!-- Transaction Memo Section -->
      <div class="row justify-center q-mt-md">
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
import { fetchMemo, createMemo, updateMemo, encryptMemo, decryptMemo } from 'src/utils/transaction-memos.js'
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

<style lang="scss">
  .sent-success-container {
    margin-top: -70px;

    .amount-label {
      font-size: 25px;
      margin-top: -10px;
    }
    .amount-fiat-label {
      font-size: 25px;
      margin-top: -15px;
    }
    .memo-container {
      min-width: 50vw;
      border: 1px solid grey;
      background-color: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        border-color: rgba(128, 128, 128, 0.6);
        transform: translateY(-1px);
      }
    }
    
    .memo-input-container {
      width: 100%;
      
      .q-field {
        margin-bottom: 8px;
      }
    }

    .txid-container {
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: inline-flex;
      margin: 8px auto;
      
      &:hover {
        background: rgba(128, 128, 128, 0.1);
        
        .copy-icon {
          opacity: 1;
        }
      }
      
      .copy-icon {
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }
    }
  }
</style>

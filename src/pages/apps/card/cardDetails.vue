<template>
  <q-layout view="LHh Lpr lFf">
    <q-page-container>
      <div class="row items-center q-pa-md">
        <q-btn 
          flat
          round
          dense
          icon="arrow_back"
          color="primary"
          @click="$router.back()"
        />
        <div class="col">
          <h5 class="text-primary text-weight-bold text-center q-ma-none">Card Management</h5>
        </div>
        <div class="q-pa-xs" style="width: 32px"></div>
      </div>

      <div>
        <MultiWalletDropdown></MultiWalletDropdown>
      </div>

      <q-page v-if="activeCard" class="q-px-md">
        <div class="column items-center q-mb-lg">
          <div class="row items-center q-mb-sm full-width q-gutter-sm">
            <div 
              class="text-subtitle1 q-mr-sm"
              :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
            >
              {{activeCard?.raw?.alias}}
            </div>
            <q-badge rounded color="green" size="xs" />
            <q-btn flat dense icon="edit" size="sm" @click="showEditNameDialog = true"/>
          </div>

          <div 
            class="virtual-card-container flex flex-center shadow-2"
            :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'"
          >
            <div :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'">
              Virtual Card UI / Ad Content
            </div>
          </div>

          <div class="row justify-center full-width q-mt-sm">
            <div class="row items-center">
              <div 
                class="q-mr-sm"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                {{ activeCard.balance }} BCH
              </div>
              <q-btn outline dense label="Cash In" size="sm" class="cash-in-btn q-px-md q-py-xs" style="border-width: 1px" @click="showCashInDialog = true" />
            </div>
          </div>
        </div>

        <div class="tabs-container q-mb-md">
          <div class="tabs-wrapper">
            <div 
              v-for="tab in ['Transactions', 'Manage Merchants', 'Card Replacement', 'Other Settings']"
              :key="tab"
              class="tab-item"
              :class="{ 'tab-active': activeTab === tab }"
              @click="activeTab = tab"
            >
              <span class="tab-label">{{ tab }}</span>
            </div>
          </div>
        </div>

        <div 
          class="content-box flex flex-center"
          :class="$q.dark.isActive ? 'content-box-dark' : 'content-box-light'"
        >
          <TransactionHistory 
            v-if="activeTab === 'Transactions' && activeCard" 
            :card="activeCard"
          />
          <ManageAuthNFTs 
            v-else-if="activeTab === 'Manage Merchants' && activeCard" 
            :card="activeCard"
          />
          <div 
            v-else-if="activeTab === 'Card Replacement' && activeCard"
            class="text-center"
            :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
          >
            Card Replacement content coming soon...
          </div>
          <div 
            v-else-if="activeTab === 'Other Settings' && activeCard"
            class="text-center"
            :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
          >
            Other Settings content coming soon...
          </div>

          <div v-else-if="!activeCard" class="flex flex-center full-height">
            <q-spinner-dots color="primary" size="40px"/>
          </div>
        </div>
      </q-page>

      <q-page v-else class flex flex-center>
        <q-spinner-dots color="primary" size="40px" />
      </q-page>

      <q-dialog v-model="showEditNameDialog">
        <q-card style="min-width: 300px">
          <q-card-section>
            <div class="text-h6" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">Edit Card Name</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="newCardName"
              filled
              maxlength="10"
              counter
              autofocus
              placeholder="Enter new card name"
              :dark="$q.dark.isActive"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" @click="showEditNameDialog = false" />
            <q-btn flat label="Save" color="primary" @click="saveCardName" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="showCashInDialog">
        <q-card class="cash-in-dialog">
          <q-card-section class="row justify-between items-center q-pb-none">
            <div class="text-h6 q-mb-md" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">Cash In</div>
            <q-btn flat round dense icon="close" @click="showCashInDialog = false" />
          </q-card-section>

          <q-card-section class="text-center q-pt-sm">
            
            <div class="qr-container q-mb-md">
              <qr-code 
                :text="getContractAddress(activeCard)"
                :size="180"
              />
            </div>

            <div class="row items-center justify-center q-gutter-sm q-mb-lg">
              <div 
                class="contract-address" 
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-8'"
              >
                {{ formatContractAddress(getContractAddress(activeCard)) }}
              </div>
              <q-btn 
                flat 
                round 
                dense 
                icon="content_copy" 
                size="sm"
                :color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
                @click="copyContractAddress"
              />
            </div>

            <div class="row justify-center q-gutter-md q-mb-lg">
              <q-input
                v-model="cashInAmount"
                type="number"
                filled
                :dark="$q.dark.isActive"
                placeholder="Amount"
                class="amount-input"
                :rules="[val => (val && parseFloat(val) > 0) || 'Amount must be greater than 0']"
                lazy-rules
              />
              <q-select
                v-model="cashInCurrency"
                :options="['Satoshis', 'PHP', 'BCH']"
                filled
                :dark="$q.dark.isActive"
                emit-value
                map-options
                class="currency-select"
              />
            </div>

            <q-btn
              color="primary"
              label="Cash In"
              class="full-width"
              unelevated
              @click="handleCashIn"
            />
          </q-card-section>
        </q-card>
      </q-dialog>
    </q-page-container>
  </q-layout>
</template>

<script>
import {createCardLogic} from './noBackend.js'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import TransactionHistory from './transactionHistory.vue'
import ManageAuthNFTs from './manageAuthNFTs.vue'

export default {
  mixins: [createCardLogic],
  components: {
    TransactionHistory,
    ManageAuthNFTs
  },

  data () {
    return {
      activeCard: null,
      activeTab: 'Transactions',
      showEditNameDialog: false,
      newCardName: '',
      showCashInDialog: false,
      cashInAmount: '',
      cashInCurrency: 'BCH'
    }
  },

  mounted () {
    // Check if a specific tab is requested in query params
    const requestedTab = this.$route.query.tab
    if (requestedTab) {
      // Map query param to tab names
      const tabMap = {
        'transactions': 'Transactions',
        'manage-merchants': 'Manage Merchants',
        'card-replacement': 'Card Replacement',
        'other-settings': 'Other Settings'
      }
      if (tabMap[requestedTab]) {
        this.activeTab = tabMap[requestedTab]
      }
    }
    this.loadSpecificCard()
  },

  methods: {
    loadSpecificCard () {
      const cardId = this.$route.query.id
      // get all cards from localStorage
      const savedCards = localStorage.getItem('mock_subcards')

      if (savedCards) {
        const allCards = JSON.parse(savedCards)
        // find the specifc card
        const found = allCards.find(c => String(c.id) === String(cardId))
        
        if (found) {
          this.activeCard = found
          this.newCardName = found.raw?.alias || ''
        }
        else {
          console.error("Card not found in storage");
          this.$router.push({ name: 'stacked-cards' });
        }
      }   
    },
    saveCardName () {
      if (this.newCardName && this.newCardName.trim()) {
        this.activeCard.raw.alias = this.newCardName.trim()
        
        const savedCards = localStorage.getItem('mock_subcards')
        if (savedCards) {
          const allCards = JSON.parse(savedCards)
          const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
          if (cardIndex !== -1) {
            allCards[cardIndex] = this.activeCard
            localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          }
        }
      }
      this.showEditNameDialog = false
    },
    formatContractAddress (addr) {
      if (!addr) return ''
      const address = typeof addr === 'object' ? addr.contractAddress : addr
      if (!address) return ''
      const len = address.length
      return address.substring(0, 12) + '...' + address.substring(len - 12, len)
    },
    copyContractAddress () {
      const address = this.getContractAddress(this.activeCard)
      if (address) {
        navigator.clipboard.writeText(address)
        this.$q.notify({
          message: 'Contract address copied!',
          color: 'positive',
          position: 'top'
        })
      }
    },
    getContractAddress (card) {
      return card?.contractAddress || this.contractAddress || 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw'
    },
    handleCashIn () {
      if (!this.cashInAmount || parseFloat(this.cashInAmount) <= 0) {
        this.$q.notify({
          message: 'Please enter a valid amount greater than 0',
          color: 'negative',
          position: 'top'
        })
        return
      }

      // Convert to BCH based on selected currency
      // Exchange rates (approximate)
      // 1 BCH = 100,000,000 satoshis
      // 1 BCH ≈ 250,000 PHP (depends on market)
      const exchangeRates = {
        BCH: 1,
        Satoshis: 1 / 100000000, // 1 satoshi = 0.00000001 BCH
        PHP: 1 / 250000 // 1 PHP = 0.000004 BCH
      }
      
      const amountInBCH = parseFloat(this.cashInAmount) * exchangeRates[this.cashInCurrency]

      // Update card balance in localStorage
      const savedCards = localStorage.getItem('mock_subcards')
      if (savedCards && this.activeCard) {
        const allCards = JSON.parse(savedCards)
        const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
        if (cardIndex !== -1) {
          const currentBalance = parseFloat(allCards[cardIndex].balance) || 0
          allCards[cardIndex].balance = (currentBalance + amountInBCH).toFixed(8)
          localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          
          // Update activeCard for display
          this.activeCard.balance = allCards[cardIndex].balance
        }
      }

      this.$q.notify({
        message: `Successfully added ${this.cashInAmount} ${this.cashInCurrency} (~${amountInBCH.toFixed(8)} BCH) to your card!`,
        color: 'positive',
        position: 'top'
      })
      
      this.showCashInDialog = false
      this.cashInAmount = ''
    }
  }

}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>

<template>
  <div :class="$q.dark.isActive ? 'bg-dark' : 'card-page-bg-light'">
    <!-- Loading state while fetching card -->
    <q-page v-if="loading" class="flex flex-center">
        <q-spinner color="primary" size="3em" />
        <div class="text-subtitle1 q-ml-md" :class="textColor">Loading card...</div>
      </q-page>

      <q-page v-else-if="activeCard" class="q-px-md">
        <div style="max-height: calc(100vh - 60px); overflow-y: auto; padding-bottom: 20px;">
          <div class="column items-center">
            <div class="flex flex-center full-width q-mb-md">
            <div 
              class="virtual-card-container shadow-4"
              :class="$q.dark.isActive ? 'virtual-card-dark' : 'virtual-card-light'"
            >
              <!-- Card name + badge + edit - top left -->
              <div class="card-name-container">
                <div class="text-weight-medium ellipsis" style="font-size: 20px; max-width: 130px;">
                  {{ activeCard?.alias }}
                </div>
                <q-badge 
                  rounded 
                  :color="!!activeCard?.isLocked ? 'negative' : 'positive'" 
                  size="xs" 
                  class="card-status-badge cursor-pointer blink-badge"
                >
                  <q-tooltip>{{ !!activeCard?.isLocked ? 'Card is locked' : 'Card is active' }}</q-tooltip>
                </q-badge>
                <q-btn flat dense icon="edit" size="xs" class="text-white" style="opacity: 0.7" @click="showEditNameDialog = true"/>
              </div>

              <!-- Balance - bottom left -->
              <div class="card-balance-container">
                <div class="row items-center no-wrap" style="gap: 6px;">
                  <div style="font-size: 10px; opacity: 0.6; font-weight: 400; letter-spacing: 0.5px;">BALANCE</div>
                  <q-btn
                    flat
                    dense
                    round
                    size="xs"
                    class="text-white"
                    style="opacity: 0.7; margin-left: 2px;"
                    :icon="balanceHidden ? 'visibility_off' : 'visibility'"
                    @click.stop="toggleBalanceVisibility"
                  />
                </div>
                <div class="row items-center no-wrap" style="gap: 6px;">
                  <div class="text-weight-medium" style="font-size: 22px; line-height: 1.2;">
                    {{ getDisplayedBalance() }}
                  </div>
                  <div class="row items-center justify-center" style="width: 24px; height: 24px; border-radius: 8px; background: rgba(255,255,255,0.15);">
                    <q-img src="~assets/bch-logo.png" style="width: 14px; height: 14px;" fit="contain" />
                  </div>
                </div>
              </div>

              <!-- Contract address - top right -->
              <div class="card-contract-container">
                {{ formatContractAddress(activeCard?.cashAddress) }}
              </div>

              <!-- Logo - bottom right -->
              <div class="card-logo-container">
                <q-img src="~assets/paytaca_logo.png" style="width: 36px;" fit="contain" />
              </div>
            </div>
          </div>

          <div class="row justify-center full-width q-mt-sm q-mb-sm">
            <q-btn label="Fund" class="cash-in-btn bg-grad text-white q-px-lg" @click="openCashInDialog" />
          </div>
        </div>

        <div class="tabs-container q-mb-md">
          <div class="tabs-wrapper">
            <div 
              v-for="tab in tabs"
              :key="tab.label"
              class="tab-item"
              :class="{ 'tab-active': activeTab === tab.label }"
              @click="activeTab = tab.label"
            >
              <q-icon :name="tab.icon" size="1.3rem" />
              <span class="tab-label">{{ tab.label }}</span>
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
            :key="activeCard.id"
          />
          <CardSettings v-if="activeTab === 'Card Security'" :active-card="activeCard" @lock-status-changed="onLockStatusChanged"/>
          <div v-else-if="activeTab === 'Order Card'" class="full-width column items-center q-pa-md">
            <div class="full-width q-mb-md" style="max-width: 400px;">
              <JourneyStepper
                :steps="orderJourneySteps"
                :title="$t('Card Delivery Status')"
                :is-dark="$q.dark.isActive"
              />
            </div>
            <div class="full-width" style="max-width: 400px;">
              <OrderCard :card="activeCard" @order-success="onOrderSuccess" />
            </div>
            <q-separator class="full-width q-my-lg" color="primary" style="opacity: 0.2;" />
            <div class="full-width column items-center" style="max-width: 400px;">
              <div class="link-icon-ring q-mb-md">
                <div class="link-icon-inner">
                  <q-icon name="link" size="32px" color="primary" />
                </div>
              </div>
              <div class="text-h6 text-weight-bold q-mb-sm" :class="textColor">Activate Your Card</div>
              <div class="text-body2 q-mb-md text-center" :class="textColorGrey" style="max-width: 360px;">
                Scan the QR code on your card, tap NFC, or enter the Card UID manually to link it.
              </div>
              <q-btn
                label="Activate"
                color="primary"
                unelevated
                rounded
                no-caps
                class="link-cta-btn"
                @click="showActivateCardForm = true"
              />
            </div>
          </div>
          <div v-else-if="!activeCard" class="flex flex-center full-height">
            <q-spinner-dots color="primary" size="40px"/>
          </div>
          <div style="height: 120px;"></div>
          </div>
        </div>
      </q-page>

      <q-page v-else class flex flex-center>
        <q-spinner-dots color="primary" size="40px" />
      </q-page>

      <q-dialog v-model="showEditNameDialog">
        <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 340px; border-radius: 24px;">
          <q-card-section class="q-pa-lg">
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6 text-weight-bold" :class="textColor">Edit Card Name</div>
              <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showEditNameDialog = false" />
            </div>

            <div class="q-mb-md" :class="textColor">
              <span class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'">Current name: </span>
              <span class="text-subtitle1 text-weight-medium">{{ activeCard?.alias }}</span>
            </div>

            <div class="pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 14px; overflow: hidden;">
              <q-input
                v-model="newCardName"
                filled
                maxlength="10"
                counter
                autofocus
                placeholder="Enter new card name"
                :dark="$q.dark.isActive"
                class="edit-name-input"
                @keyup.enter="saveCardName"
              >
                <template v-slot:prepend>
                  <q-icon name="edit" size="1.1rem" color="primary" />
                </template>
              </q-input>
            </div>

            <div class="row q-mt-lg" style="gap: 8px;">
              <q-btn
                flat
                label="Cancel"
                :color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
                class="col"
              rounded
              @click="showEditNameDialog = false"
            />
            <q-btn
              unelevated
              label="Save"
              color="primary"
              class="col bg-grad text-white"
              rounded
                @click="saveCardName"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <q-dialog v-model="showSweepFundsDialog" persistent>
        <q-card style="min-width: 320px">
          <q-card-section>
            <div class="text-h6" :class="textColor">Sweep Funds</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div 
              class="q-mb-md"
              :class="textColorGrey"
            >
              This will transfer all funds ({{ formatBalance(activeCard?.balance) }} BCH) from your card back to your wallet.
              <!-- NEW: Use Card class method -->
              <!-- This will transfer all funds ({{ formatBalance(activeCard?.getBchBalance ? activeCard.getBchBalance() : activeCard?.balance) }} BCH) from your card back to your wallet. -->
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Are you sure you want to sweep all funds?
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showSweepFundsDialog = false" />
            <q-btn flat label="Sweep Funds" color="info" @click="handleSweepFunds" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="showDeleteCardDialog" persistent>
        <q-card style="min-width: 320px">
          <q-card-section>
            <div class="text-h6 text-negative">Delete Card</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div 
              class="q-mb-md"
              :class="textColorGrey"
            >
              Are you sure you want to delete this card? This action cannot be undone.
            </div>
            <div 
              class="text-caption text-negative"
            >
              Warning: Any remaining funds will be lost.
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showDeleteCardDialog = false" />
            <q-btn flat label="Delete Card" color="negative" @click="handleDeleteCard" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <cash-in-dialog v-model="showCashInDialog" :card="activeCard" @close="onCloseCashInDialog"/>
      <ActivateCardForm
        v-if="showActivateCardForm"
        @close="showActivateCardForm = false"
        @activate="onCardActivated"
      />
  </div>
</template>

<script>
import {createCardLogic} from 'src/components/card/createCard.js'
import TransactionHistory from 'src/components/card/TransactionHistory.vue'
import ManageAuthNFTs from 'src/components/card/ManageAuthNFTs.vue'
import CashInDialog from 'src/components/card/CashInDialog.vue'
import CardSettings from 'src/components/card/CardSettings.vue'
import OrderCard from 'src/components/card/OrderCard.vue'
import ActivateCardForm from 'src/components/card/ActivateCardForm.vue'
import JourneyStepper from 'src/components/card/JourneyStepper.vue'
import { satoshiToBch } from 'src/exchange'
import { loadCardUser } from 'src/services/card/user'
import { Card } from 'src/services/card/card'
import { computed } from 'vue'

export default {
  mixins: [createCardLogic],
  components: {
    TransactionHistory,
    ManageAuthNFTs,
    CashInDialog,
    CardSettings,
    OrderCard,
    ActivateCardForm,
    JourneyStepper
  },

  provide () {
    return {
      cardUser: computed(() => this.cardUser)
    }
  },

  data () {
    return {
      cardUser: null,
      activeCard: null,
      loading: false, // Loading state while fetching card from backend
      activeTab: 'Transactions',
      showEditNameDialog: false,
      newCardName: '',
      showCashInDialog: false,
      cashInAmount: '',
      cashInCurrency: 'USD',
      showSweepFundsDialog: false,
      showDeleteCardDialog: false,
      showActivateCardForm: false,
      bchBalance: 0,
      balanceHidden: false,
      orderJourneySteps: [
        { label: 'Order Card', icon: 'shopping_cart', status: 'active' },
        { label: 'Printing', icon: 'print', status: 'pending' },
        { label: 'Delivery', icon: 'local_shipping', status: 'pending' },
        { label: 'Activation', icon: 'link', status: 'pending' },
      ]
    }
  },

  watch: {
    activeTab (newTab) {
      // Save active tab to card storage
      if (this.activeCard?.id) {
        this.CardStorage.setCardProperty(this.activeCard.id, 'activeTab', newTab)
      }
      
      // Update URL query param without navigation
      if (newTab !== this.$route.query.tab) {
        const tabMap = {
          'Transactions': 'transactions',
          'Manage Merchants': 'manage-merchants',
          'Card Security': 'other-settings',
          'Order Card': 'order-card'
        }
        this.$router.replace({ 
          query: { 
            ...this.$route.query, 
            tab: tabMap[newTab] 
          } 
        }).catch(() => {})
      }
      
    }
  },

  computed: {
    tabs () {
      return [
        { label: 'Transactions', icon: 'receipt_long' },
        { label: 'Manage Merchants', icon: 'storefront' },
        { label: 'Card Security', icon: 'shield' },
        { label: 'Order Card', icon: 'local_mall' }
      ]
    },

    selectedCurrency () {
      return this.$store.getters['market/selectedCurrency']
    },

  

  

    hasCardBalance () {
      const balance = parseFloat(this.activeCard?.balance) || 0
      // NEW: Use Card class method: const balance = parseFloat(this.activeCard?.getBchBalance ? this.activeCard.getBchBalance() : (this.activeCard?.balance || 0)) || 0
      return balance > 0
    }
  },

  async mounted () {

    // Load card user once and provide to child components
    this.cardUser = await loadCardUser()

    // Wait for router to be ready
    await this.$router.isReady()
    
    // Try multiple times to get route params (they might not be immediately available)
    let attempts = 0
    const maxAttempts = 10
    
    while ((!this.$route.params.id && !this.$route.query.id && !localStorage.getItem('lastActiveCardId')) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 50))
      attempts++
    }
    
    
    // Load the specific card (from localStorage or backend)
    await this.loadSpecificCard()
    
    // Only proceed with tab logic if we have a valid card
    if (!this.activeCard) {
      return
    }
    
    // Wait for computed properties to be ready
    await this.$nextTick()
    
    // Debug: Check localStorage directly
    const rawCards = localStorage.getItem('mock_subcards')
    const allCards = rawCards ? JSON.parse(rawCards) : []
    const thisCard = allCards.find(c => String(c.id) === String(this.activeCard.id))
    
    // Load saved active tab for this card
    const savedTab = this.CardStorage.getCardProperty(this.activeCard.id, 'activeTab')
    
    // Force tabs to recompute by accessing it
    const availableTabs = this.tabs
    
    if (savedTab && availableTabs && availableTabs.includes(savedTab)) {
      this.activeTab = savedTab
    }
    
    // Check if a specific tab is requested in query params (query param takes priority)
    const requestedTab = this.$route.query.tab
    if (requestedTab) {
      // Map query param to tab names
      const tabMap = {
        'transactions': 'Transactions',
        'manage-merchants': 'Manage Merchants',
        'other-settings': 'Card Security',
        'order-card': 'Order Card'
      }
      if (tabMap[requestedTab] && this.tabs.includes(tabMap[requestedTab])) {
        this.activeTab = tabMap[requestedTab]
      }
    }
    
    // Load the specific card (from localStorage or backend)
    // await this.loadSpecificCard()
    this.getCardBchBalance()
    this.loadBalanceVisibility()

    this.subscribeToCardTransactions()

    this.activeCard.getUtxos()
  },

  methods: {
    async subscribeToCardTransactions () {
      if (!this.activeCard) return
      await this.activeCard.subscribeToTransactions()
    },

    capitalizeFirst (str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    /**
     * Get card name from localStorage
     * Currently uses localStorage only. To add backend support:
     * 1. Add skeleton loader: <q-skeleton v-if="loading" type="text" width="100px" />
     * 2. Use backend: const name = card.name || this.backendData?.raw?.alias
     * @param {Object} card - Card object from localStorage
     * @returns {string} Card name
     */
    getCardName (card) {
      if (!card) return 'Card'
      // Current: localStorage only
      // Backend option: card.name || this.backendData?.raw?.alias
      const name = card.name
      return this.capitalizeFirst(name) || 'Card'
    },

    async loadSpecificCard (fetchFreshCard = false) {
      // Try multiple ways to get the card ID
      let cardId = null
      
      // Method 1: Route params (from /details/:id)
      if (this.$route.params && this.$route.params.id) {
        cardId = this.$route.params.id
      }
      
      // Method 2: Query params
      if (!cardId && this.$route.query && this.$route.query.id) {
        cardId = this.$route.query.id
      }
      
      // Method 3: localStorage backup
      if (!cardId) {
        const savedId = localStorage.getItem('lastActiveCardId')
        if (savedId) {
          cardId = savedId
        }
      }
      
      // Method 4: Parse from URL hash directly (fallback for hash mode)
      if (!cardId && window.location.hash) {
        const hash = window.location.hash
        // Match patterns like #/apps/card/details/123 or #/card/details/123
        const match = hash.match(/\/details\/(\d+)/)
        if (match) {
          cardId = match[1]
        }
        // Also try matching #/card/123 or #/apps/card/123
        const simpleMatch = hash.match(/#\/?(?:apps\/)?card\/(\d+)/)
        if (simpleMatch) {
          cardId = simpleMatch[1]
        }
      }
      
        'route.path': this.$route.path,
        'route.params': this.$route.params,
        'route.query': this.$route.query,
        'route.name': this.$route.name,
        'window.location.hash': window.location.hash,
        'localStorage.lastActiveCardId': localStorage.getItem('lastActiveCardId')
      })
      
      if (!cardId) {
        this.$router.push({ name: 'card-list' })
        return
      }
      
      // Save the card ID to localStorage for persistence across refreshes
      localStorage.setItem('lastActiveCardId', cardId)
      
      this.loading = true
      
      try {
        // Using Vuex getter for localStorage access
        let cardData = this.$store.getters['card/getCardById'](cardId)
        
        if (!cardData || fetchFreshCard) {
          const user = await loadCardUser()
          const fetchedCard = await user.fetchCardByIdentifier(cardId)
          cardData = fetchedCard?.raw ? { ...fetchedCard.raw } : fetchedCard
          if (cardData) {
            this.$store.commit('card/updateCard', cardData)
          }
        }

        const card = cardData?.contract_id
          ? await Card.createInitialized(cardData)
          : await Card.createWithWallet(cardData)

        if (card) {
          // // Ensure all reactive properties exist with defaults
          // const cardWithDefaults = {
          //   isLocked: false,
          //   transactionAlerts: false,
          //   ...card
          // }
          this.activeCard = card
          this.newCardName = card.name || ''
          this.loading = false
          return
        }
        
        this.loading = false
        this.$router.push({ name: 'card-list' });
      } catch (error) {
        this.loading = false
        this.$router.push({ name: 'card-list' });
      }
    },

    onLockStatusChanged(isLocked) {
      this.activeCard.raw.is_locked = isLocked
      this.activeCard.raw.isLocked = isLocked
      this.CardStorage.setCardProperty(this.activeCard.id, 'isLocked', isLocked)
    },

    onCardActivated() {
      this.showActivateCardForm = false;
      this.$q.dialog({
        title: this.$t('Card Activated'),
        message: this.$t('Your Paytaca card has been successfully activated.'),
        ok: {
          label: this.$t('OK'),
          color: 'primary'
        }
      });
    },

    onOrderSuccess() {
      this.orderJourneySteps = [
        { label: 'Order Card', icon: 'shopping_cart', status: 'done' },
        { label: 'Printing', icon: 'print', status: 'active' },
        { label: 'Delivery', icon: 'local_shipping', status: 'pending' },
        { label: 'Activation', icon: 'link', status: 'pending' },
      ];
    },

    onCloseCashInDialog () {
      this.showCashInDialog = false
      this.getCardBchBalance() // Refresh balance after cash-in
    },

    async getCardBchBalance() {
      await this.$store.dispatch('card/fetchCardBalance', this.activeCard.id)
        .then(balance => {
          this.bchBalance = balance
        })
        .catch(error => {
          this.bchBalance = 0
        })
    },

    loadBalanceVisibility () {
      if (!this.activeCard?.id) return
      const key = `card_balance_hidden_${this.activeCard.id}`
      this.balanceHidden = localStorage.getItem(key) === 'true'
    },

    toggleBalanceVisibility () {
      if (!this.activeCard?.id) return
      this.balanceHidden = !this.balanceHidden
      const key = `card_balance_hidden_${this.activeCard.id}`
      localStorage.setItem(key, String(this.balanceHidden))
    },

    getDisplayedBalance () {
      if (this.balanceHidden) return '••••••'
      return this.bchBalance
    },

    async saveCardName () {
      if (this.newCardName && this.newCardName.trim()) {
        const trimmedName = this.newCardName.trim()
        const capitalizedName = this.capitalizeFirst(trimmedName)
        
        // Update the name directly
        // this.activeCard.name = capitalizedName
        this.newCardName = capitalizedName
        
        // Save the edit to the server
        await this.activeCard.update({ alias: capitalizedName })
          .then(response => {
            this.notifySuccess('Card name updated successfully')
          })
          .catch(error => {
            this.notifyError('Failed to update card name. Please try again.')
          })

        // // Save to localStorage - use setCardProperty to ensure card exists
        // this.CardStorage.setCardProperty(this.activeCard.id, 'name', capitalizedName)
        
        // Also save other important properties
        if (this.activeCard.balance !== undefined) {
          this.CardStorage.setCardProperty(this.activeCard.id, 'balance', this.activeCard.balance)
        }
        if (this.activeCard.isLocked !== undefined) {
          this.CardStorage.setCardProperty(this.activeCard.id, 'isLocked', this.activeCard.isLocked)
        }
        if (this.activeCard.transactionAlerts !== undefined) {
          this.CardStorage.setCardProperty(this.activeCard.id, 'transactionAlerts', this.activeCard.transactionAlerts)
        }
        
        
        // Show success notification
        this.notifySuccess('Card name updated successfully')
      }
      this.loadSpecificCard(true)
      this.showEditNameDialog = false
    },

    openCashInDialog () {
      // Set default currency to the currently selected currency
      this.cashInCurrency = this.selectedCurrency?.symbol || 'USD'
      this.cashInAmount = ''
      this.showCashInDialog = true
    },



    handleSweepFunds () {
      if (!this.activeCard) return

      const balance = parseFloat(this.activeCard?.balance) || 0
      // NEW: Use Card class method: const balance = parseFloat(this.activeCard?.getBchBalance ? this.activeCard.getBchBalance() : (this.activeCard?.balance || 0)) || 0

      if (balance <= 0) {
        this.$q.notify({
          message: 'No funds to sweep',
          color: 'warning',
          position: 'top',
          timeout: 1500
        })
        this.showSweepFundsDialog = false
        return
      }

      const updatedCard = this.CardStorage.setCardProperty(this.activeCard.id, 'balance', '0')
      if (updatedCard) {
        this.activeCard.balance = updatedCard.balance
      }

      this.$q.notify({
        message: `Successfully swept ${balance} BCH to your wallet`,
        color: 'positive',
        icon: 'check_circle',
        position: 'top'
      })

      this.showSweepFundsDialog = false
    },

    handleDeleteCard () {
      if (!this.activeCard) return

      const deleted = this.CardStorage.deleteCard(this.activeCard.id)
      
      if (deleted) {
        this.$q.notify({
          message: 'Card has been deleted',
          color: 'positive',
          icon: 'delete',
          position: 'top',
          timeout: 2000
        })
      }

      this.showDeleteCardDialog = false
      this.$router.push({ name: 'card-list' })
    },

    /**
     * Sweep UTXOs from card back to wallet
     * @param card {Card} - Card instance
     */
    async sweep(card) {
      const result = await card.sweep()

      await card.getUtxos()
    },

    /**
     * Burn a Merchant Auth Token to revoke authorization for a specific merchant
     * @param card {Card} - Card instance
     * @param merchant {Object} - merchant details {id, pubkey}
     * @param opts {Object} - options {retryOnFundFailure: boolean}
     */
    async burnMerchantAuthToken(card, merchant, opts = { retryOnFundFailure: true }) {
      try {
        const cardUser = await this.loadCardUser()
        const tokenId = card.raw.category
        const result = await cardUser.burnMerchantAuthToken(tokenId, merchant.id, merchant.pubkey)
        return result
      } catch (error) {
        if (opts?.retryOnFundFailure)
          await this.createFundingUtxoAndCallback(error, this.burnMerchantAuthToken)
      }
    },

    /**
     * Burn a Global Auth Token to revoke all authorizations
     * @param card {Card} - Card instance
     * @param opts {Object} - options {retryOnFundFailure: boolean}
     */
    async burnGlobalAuthToken(card, opts = { retryOnFundFailure: true }) {
      try {
        const cardUser = await this.loadCardUser()
        const tokenId = card.raw.category
        const result = await cardUser.burnGlobalAuthToken(tokenId)
        return result
      } catch (error) {
        if (opts?.retryOnFundFailure)
          await this.createFundingUtxoAndCallback(error, this.burnGlobalAuthToken)
      }
    },

    async createFundingUtxoAndCallback(error, operationCallback) {
      const satsNeeded = this.parseSatoshisNeeded(error.message)
      if (satsNeeded !== null) {
        const cardUser = await this.loadCardUser()
        const result = await cardUser.wallet.createFundingUtxo(satsNeeded)
        await operationCallback({retryOnFundFailure: false})
      }
    },

    /**
     * Mutate Global Auth Token
     * @param {Card} card - Card instance
     * @param {Object} mutation - mutation parameters
     * @param mutation.authorize {boolean} - true to authorize, false to deauthorize
     * @param mutation.spendLimitSats {number} - (optional) spend limit in satoshis
     * @param mutation.broadcast {boolean} - (optional) whether to broadcast the transaction, default: true
     */
    async mutateGlobalAuthToken(card, mutation) {
      if (!mutation) {
        return
      }
      try {
        const result = await card.mutateGlobalAuthToken(mutation)
      } catch(error) {
      }
    },

    /**
     * Mutate Merchant Auth Token
     * @param card 
     * @param mutation 
     * @param mutation.authorize {boolean} - true to authorize, false to deauthorize
     * @param mutation.merchant {Object} - merchant details {id, pubkey}
     * @param mutation.spendLimitSats {number} - (optional) spend limit in satoshis
     * @param mutation.broadcast {boolean} - (optional) whether to broadcast the transaction, default: true
     */
    async mutateMerchantAuthToken(card, mutation) {
      try {
        const result = await card.mutateMerchantAuthToken(mutation)
      } catch(error) {
      }
    },

    /**
     * Mint Merchant Auth Token
     * @param {Card} card - Card instance
     * @param {Object} merchant - merchant details {id, pubkey}
     */
    async mintMerchantAuthToken(card, merchant) {
      const mintParams = {
        authorized: true,
        merchant: {
          id: merchant.id,
          pubkey: merchant.pubkey
        }
      }
      const { mintResult, issueResult } = await card.issueMerchantAuthToken(mintParams)
    },
  },

}
</script>

<style lang="scss" scoped>
  @import "src/css/app-card.scss";

  .blink-badge {
    animation: blink-pulse 1.5s ease-in-out infinite;
  }

  @keyframes blink-pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.85);
    }
  }

  .pt-card.light {
    background: color-mix(in srgb, var(--q-primary) 12%, rgba(255, 255, 255, 0.75)) !important;
  }

  /* Order Card tab styles (ported from home.vue for visual consistency) */
  .link-icon-ring {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--q-primary) 12%, transparent);
    position: relative;
  }

  .link-icon-ring::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--q-primary) 20%, transparent);
    animation: ring-pulse 2s ease-in-out infinite;
  }

  .link-icon-inner {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--q-primary) 15%, transparent);
  }

  @keyframes ring-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.15);
      opacity: 0.4;
    }
  }

  .link-cta-btn {
    min-width: 220px;
    height: 48px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .link-cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--q-primary) 35%, transparent);
  }
</style>

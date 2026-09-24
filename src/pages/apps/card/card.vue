<template>
  <div :class="$q.dark.isActive ? 'bg-dark' : 'card-page-bg-light'">
    <!-- Loading state while fetching card -->
    <q-page v-if="!isLoaded" class="flex flex-center">
      <q-spinner color="primary" size="3em" />
      <div class="text-subtitle1 q-ml-md" :class="textColor">Loading card...</div>
    </q-page>

    <div v-else>
      <q-page v-if="activeCard" class="q-px-md">
        <q-pull-to-refresh @refresh="onPullRefresh">
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
                <div v-if="!balanceHidden && formattedFiatBalance" style="font-size: 13px; opacity: 0.75; line-height: 1.2;">
                  ≈ {{ formattedFiatBalance }}
                </div>
                <div v-if="cardTokenHoldings.length" class="row items-center q-mt-xs" style="gap: 6px;">
                  <q-chip
                    dense
                    clickable
                    text-color="white"
                    style="background: rgba(255,255,255,0.15); font-size: 11px;"
                    icon="paid"
                    :label="`${cardTokenHoldings.length} token${cardTokenHoldings.length > 1 ? 's' : ''}`"
                    @click="activeTab = 'Tokens'"
                  >
                    <q-tooltip>View CashTokens on this card</q-tooltip>
                  </q-chip>
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

              <!-- Version badge -->
              <div v-if="activeCard?.activeContractVersion" class="card-version-badge">
                <q-badge :color="activeCard.isV2Active ? 'positive' : 'grey'" class="text-weight-medium" style="font-size: 9px; padding: 2px 6px;">
                  Active: {{ activeCard.activeContractVersion?.toUpperCase() }}
                </q-badge>
              </div>
            </div>
          </div>

          <!-- V2 Migration Banner -->
          <div
            v-if="showMigrationBanner"
            class="full-width q-mb-sm"
            style="max-width: 400px; margin: 0 auto;"
          >
            <q-banner class="bg-grad text-white" style="border-radius: 14px;">
              <template v-slot:avatar>
                <q-icon :name="v2OwnershipSet ? 'sync_alt' : 'upgrade'" color="white" />
              </template>
              <div class="text-subtitle2">
                {{ v2OwnershipSet ? 'V2 is ready' : 'Upgrade to V2 to pay with tokens' }}
              </div>
              <div class="text-caption" style="opacity: 0.85;">
                {{ v2OwnershipSet
                  ? (hasV1Funds ? 'Move your V1 funds into V2 or switch back to V2' : 'Switch back to V2 to keep your card up to date')
                  : 'V2 supports fungible token payments' }}
              </div>
              <template v-slot:action>
                <q-btn
                  flat
                  color="white"
                  :label="v2OwnershipSet ? 'Manage' : 'Upgrade'"
                  @click="openMigrationDialog"
                />
              </template>
            </q-banner>
          </div>

          <!-- Migration Dialog -->
          <q-dialog v-model="showMigrationDialog" persistent>
            <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 340px; border-radius: 24px;">
              <q-card-section class="q-pa-lg">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-h6 text-weight-bold" :class="textColor">
                    {{ v2OwnershipSet ? 'V2 Migration' : 'Upgrade to V2' }}
                  </div>
                  <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showMigrationDialog = false" />
                </div>

                <div class="q-mb-md" :class="textColorGrey" style="line-height: 1.5;">
                  {{ v2OwnershipSet
                    ? (hasV1Funds
                      ? 'V2 is already set up. Switch back to V2 or move your remaining V1 funds into it.'
                      : 'V2 is already set up. Switch back to V2 to continue using it.')
                    : 'V2 enables fungible token payments. Activate V2 first, then sweep your V1 funds into it.' }}
                </div>

                <q-stepper
                  v-model="migrationStep"
                  vertical
                  color="primary"
                  flat
                  animated
                  class="bg-transparent"
                >
                  <!-- Step 1: Activate V2 -->
                  <q-step
                    :name="1"
                    :title="v2OwnershipSet ? 'V2 ready' : 'Activate V2'"
                    icon="check_circle"
                    :done="v2OwnershipSet || migrationStep > 1"
                  >
                    <template v-if="v2OwnershipSet">
                      <div class="text-caption q-mb-sm" :class="textColorGrey">
                        V2 ownership is already set up. Switch back to V2 to use it.
                      </div>
                      <div class="row q-gutter-sm">
                        <q-btn
                          unelevated
                          :label="activeCard?.isV2Active ? 'V2 is active' : 'Switch to V2'"
                          color="primary"
                          class="bg-grad text-white"
                          rounded
                          :loading="migratingToV2"
                          :disable="!!activeCard?.isV2Active"
                          @click="migrateActivateV2"
                        />
                      </div>
                    </template>
                    <template v-else>
                      <div class="text-caption q-mb-sm" :class="textColorGrey">
                        This sets V2 as the active contract and sets up its ownership. No funds are moved.
                      </div>
                      <div class="row q-gutter-sm">
                        <q-btn
                          unelevated
                          label="Activate V2"
                          color="primary"
                          class="bg-grad text-white"
                          rounded
                          :loading="migratingToV2"
                          :disable="!!activeCard?.isV2Active"
                          @click="migrateActivateV2"
                        />
                      </div>
                      <div v-if="migrationActivateMsg" class="text-caption q-mt-sm" :class="textColorGrey">
                        {{ migrationActivateMsg }}
                      </div>
                    </template>
                  </q-step>

                  <!-- Step 2: Sweep (optional) -->
                  <q-step
                    :name="2"
                    title="Sweep funds (optional)"
                    icon="swap_horiz"
                    :done="false"
                  >
                    <div class="text-caption q-mb-sm" :class="textColorGrey">
                      Move remaining BCH from V1 to your active V2 address. Tokens can be swept from Card Security afterwards.
                    </div>
                    <div class="row q-gutter-sm">
                      <q-btn
                        flat
                        dense
                        label="Skip"
                        color="primary"
                        @click="showMigrationDialog = false"
                      />
                      <q-btn
                        unelevated
                        label="Sweep BCH"
                        color="primary"
                        class="bg-grad text-white"
                        rounded
                        :loading="migrationSweepingBch"
                        :disable="migrationSweepDone"
                        @click="migrateSweepBch"
                      />
                    </div>
                    <div v-if="migrationSweepDone" class="text-caption text-positive q-mt-sm">
                      BCH swept successfully
                    </div>
                    <div v-if="migrationSweepError" class="text-caption text-negative q-mt-sm">
                      {{ migrationSweepError }}
                    </div>
                  </q-step>
                </q-stepper>
              </q-card-section>
            </q-card>
          </q-dialog>

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
              :class="{
                'tab-active': activeTab === tab.label,
                'tab-disabled': tab.disabled
              }"
              @click="onTabClick(tab.label)"
            >
              <q-icon :name="tab.icon" size="1.3rem" />
              <span class="tab-label">{{ tab.label }}</span>
            </div>
          </div>
        </div>

        <div 
          v-if="isLoaded"
          class="content-box flex flex-center"
          :class="$q.dark.isActive ? 'content-box-dark' : 'content-box-light'"
        >
          <TransactionHistory
            v-if="activeTab === 'Transactions' && activeCard"
            ref="historyRef"
            :card="activeCard"
          />
          <ManageAuthNFTs 
            v-else-if="activeTab === 'Manage Merchants' && activeCard" 
            :card="activeCard"
            :key="activeCard.id"
          />
          <CardTokens
            v-else-if="activeTab === 'Tokens'"
            :holdings="cardTokenHoldings"
            :loading="tokensLoading"
            @fund-tokens="openTokenFundDialog"
          />
          <CardSettings v-if="activeTab === 'Card Security'" 
            :key="cardSettingsKey"
            :active-card="activeCard" 
            @lock-status-changed="onLockStatusChanged" 
            @sweep-funds="onSweepFunds"
            @version-changed="onVersionChanged"
            />
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
        </q-pull-to-refresh>
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

      <q-dialog v-model="showDeleteCardDialog" persistent>
        <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
          <q-card-section class="q-pa-lg">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-h6 text-weight-bold text-negative">Delete Card</div>
              <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showDeleteCardDialog = false" />
            </div>

            <div class="q-mb-md" :class="textColorGrey">
              Are you sure you want to delete this card? This action cannot be undone.
            </div>
            <div class="text-caption text-negative">
              Warning: Any remaining funds will be lost.
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-px-lg q-pb-md">
            <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="showDeleteCardDialog = false" />
            <q-btn unelevated label="Delete Card" color="negative" class="bg-grad text-white" rounded @click="handleDeleteCard" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <CashInDialog v-model="showCashInDialog" :card="activeCard" :default-fund-type="cashInFundType" @close="onCloseCashInDialog"/>
      <ActivateCardForm
        v-if="showActivateCardForm"
        @close="showActivateCardForm = false"
        @activate="onCardActivated"
      />
    </div>
  </div>
</template>

<script>
import {createCardLogic} from 'src/components/card/createCard.js'
import CardMixin from 'src/mixins/card/card-mixin.js'
import TransactionHistory from 'src/components/card/TransactionHistory.vue'
import CardTokens from 'src/components/card/CardTokens.vue'
import ManageAuthNFTs from 'src/components/card/ManageAuthNFTs.vue'
import CashInDialog from 'src/components/card/CashInDialog.vue'
import CardSettings from 'src/components/card/CardSettings.vue'
import OrderCard from 'src/components/card/OrderCard.vue'
import ActivateCardForm from 'src/components/card/ActivateCardForm.vue'
import JourneyStepper from 'src/components/card/JourneyStepper.vue'
import { satoshiToBch } from 'src/exchange'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import { loadCardUser } from 'src/services/card/user'
import { Card } from 'src/services/card/card'
import { cardLogger } from 'src/utils/debug-logger.js'

export default {
  mixins: [createCardLogic, CardMixin],
  components: {
    TransactionHistory,
    CardTokens,
    ManageAuthNFTs,
    CashInDialog,
    CardSettings,
    OrderCard,
    ActivateCardForm,
    JourneyStepper
  },

  provides() {
    return {
      user: this.cardUser,
    }
  },

  data () {
    return {
      activeCard: null,
      loading: false, // Loading state while fetching card from backend
      activeTab: 'Card Security', // Default tab
      showEditNameDialog: false,
      newCardName: '',
      showCashInDialog: false,
      cashInAmount: '',
      cashInCurrency: 'USD',
      cashInFundType: 'BCH',
      cardTokenHoldings: [],
      tokensLoading: false,
      showDeleteCardDialog: false,
      showActivateCardForm: false,
      bchBalance: 0,
      balanceHidden: false,
      migratingToV2: false,
      migrationActivateMsg: '',
      showMigrationDialog: false,
      migrationStep: 1,
      migrationSweepingBch: false,
      migrationSweepDone: false,
      migrationSweepError: '',
      v2OwnershipSet: false,
      orderJourneySteps: [
        { label: 'Order Card', icon: 'shopping_cart', status: 'active' },
        { label: 'Printing', icon: 'print', status: 'pending' },
        { label: 'Delivery', icon: 'local_shipping', status: 'pending' },
        { label: 'Activation', icon: 'link', status: 'pending' },
      ],
      cardSettingsKey: 0, // Key to force re-render of CardSettings component
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
          'Tokens': 'tokens',
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
        { label: 'Transactions', icon: 'receipt_long', disabled: false },
        { label: 'Tokens', icon: 'paid', disabled: false },
        { label: 'Manage Merchants', icon: 'storefront', disabled: false },
        { label: 'Card Security', icon: 'shield', disabled: false },
        { label: 'Order Card', icon: 'local_mall', disabled: true }
      ]
    },



    selectedCurrency () {
      return this.$store.getters['market/selectedCurrency']
    },

    selectedMarketCurrency () {
      return this.selectedCurrency?.symbol
    },

    bchPriceInFiat () {
      if (!this.selectedMarketCurrency) return null
      return this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
    },

    formattedFiatBalance () {
      if (this.balanceHidden) return ''
      const balance = parseFloat(this.bchBalance) || 0
      if (!this.bchPriceInFiat) return ''
      return parseFiatCurrency((balance * Number(this.bchPriceInFiat)).toFixed(2), this.selectedMarketCurrency)
    },

    hasCardBalance () {
      const balance = parseFloat(this.activeCard?.balance) || 0
      return balance > 0
    },

    showMigrationBanner () {
      if (!this.activeCard) return false
      return this.activeCard.hasV2Contract && !this.activeCard.isV2Active
    },

    hasV1Funds () {
      return Number(this.bchBalance) > 0
    },

    bchFiatText () {
      if (this.balanceHidden) return ''
      const bchPrice = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      if (!bchPrice) return ''
      const balance = Number(this.bchBalance) || 0
      const fiatValue = balance * Number(bchPrice)
      return parseFiatCurrency(fiatValue.toFixed(2), this.selectedMarketCurrency)
    },

    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency?.symbol || 'USD'
    }
  },

  async mounted () {
    await this.loadData()
    
    // Only proceed with tab logic if we have a valid card
    if (!this.activeCard) {
      return
    }
    
    // Wait for computed properties to be ready
    await this.$nextTick()
        
    // Load saved active tab for this card
    const savedTab = this.CardStorage.getCardProperty(this.activeCard.id, 'activeTab')
    
    // Force tabs to recompute by accessing it
    const availableTabs = this.tabs
    
    if (savedTab && availableTabs && availableTabs.some(tab => tab.label === savedTab)) {
      this.activeTab = savedTab
    }
    
    // Check if a specific tab is requested in query params (query param takes priority)
    const requestedTab = this.$route.query.tab
    if (requestedTab) {
      // Map query param to tab names
      const tabMap = {
        'transactions': 'Transactions',
        'tokens': 'Tokens',
        'manage-merchants': 'Manage Merchants',
        'other-settings': 'Card Security',
        'order-card': 'Order Card'
      }
      if (tabMap[requestedTab] && this.tabs.some(tab => tab.label === tabMap[requestedTab])) {
        this.activeTab = tabMap[requestedTab]
      }
    }
  },

  methods: {
    async loadData () {
      this.isLoaded = false
      try {
        await this.loadUser()
        await this.loadActiveCard()
        this.getCardBchBalance()
        this.fetchCardTokenHoldings()
        this.loadBalanceVisibility()
      } catch (err) {
        cardLogger.error('Error loading card details:', err.message || err)
      } finally {
        this.isLoaded = true
      }
    },

    async loadActiveCard () {
      await this.$router.isReady()  
      const cardId = this.$route.params?.id

      // this.loading = true
      
      try {
        let card = this.$store.getters['card/getCardById'](cardId)
        
        card = await this.user.fetchCardByIdentifier(cardId)
        if (!card) {
          // this.loading = false
          this.$router.push({ name: 'card-list' });
        }

        this.activeCard = card
        this.newCardName = card.alias
        this.v2OwnershipSet = card?.hasV2Contract
          ? await card.isVersionOwnershipSet('v2').catch(() => false)
          : false
      } catch (error) {
        this.$router.push({ name: 'card-list' });
      }
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

    onLockStatusChanged(isLocked) {
      this.activeCard.raw.is_locked = isLocked
      this.activeCard.raw.isLocked = isLocked
      this.CardStorage.setCardProperty(this.activeCard.id, 'isLocked', isLocked)
    },

    onCardActivated() {
      this.showActivateCardForm = false;
      this.$router.push({ name: 'card-list' });
    },

    onOrderSuccess() {
      this.orderJourneySteps = [
        { label: 'Order Card', icon: 'shopping_cart', status: 'done' },
        { label: 'Printing', icon: 'print', status: 'active' },
        { label: 'Delivery', icon: 'local_shipping', status: 'pending' },
        { label: 'Activation', icon: 'link', status: 'pending' },
      ];
    },

    refreshCardHistory () {
      if (!this.activeCard?.id) return
      const ref = this.$refs.historyRef
      if (ref?.refresh) return ref.refresh()
      return this.$store.dispatch('card/fetchCardTransactions', { cardId: this.activeCard.id }).catch(() => {})
    },
    onCloseCashInDialog () {
      this.showCashInDialog = false
      this.getCardBchBalance() // Refresh balance after cash-in
      this.fetchCardTokenHoldings()
      this.refreshCardHistory()
      this.cardSettingsKey++ // Force re-render of CardSettings component to reflect updated balance
    },

    onSweepFunds (info) {
      this.getCardBchBalance({ guardZero: info?.swept === 'tokens' })
      this.fetchCardTokenHoldings()
      this.refreshCardHistory()
    },

    async onVersionChanged () {
      await this.loadActiveCard()
      await Promise.allSettled([this.getCardBchBalance(), this.fetchCardTokenHoldings(), this.refreshCardHistory()])
      this.cardSettingsKey++
    },

    async onPullRefresh (done) {
      try {
        await this.loadActiveCard()
        await Promise.allSettled([this.getCardBchBalance(), this.fetchCardTokenHoldings(), this.refreshCardHistory()])
        this.cardSettingsKey++
      } catch (err) {
        cardLogger.error('Error refreshing card details:', err)
      } finally {
        done()
      }
    },

    async fetchCardTokenHoldings () {
      if (!this.activeCard?.id) return
      this.tokensLoading = true
      try {
        const holdings = await this.activeCard.getFungibleTokenBalances()
        cardLogger.log('Card fungible token balances:', holdings)
        this.cardTokenHoldings = this.normalizeTokenHoldings(holdings)
      } catch (error) {
        cardLogger.error('Fungible balances failed, falling back to /cards/balance/:', error)
        try {
          if (!this.user) return
          const response = await this.user.fetchCardsBalance()
          const entry = response?.results?.find(card => card?.id == this.activeCard.id)
          const holdings = entry?.ct_balance ?? this.activeCard?.raw?.ct_balance ?? this.activeCard?.ct_balance ?? []
          this.cardTokenHoldings = this.normalizeTokenHoldings(holdings)
        } catch (fallbackError) {
          this.cardTokenHoldings = []
        }
      } finally {
        this.tokensLoading = false
      }
    },

    normalizeTokenHoldings (holdings) {
      if (Array.isArray(holdings)) return holdings
      if (holdings && typeof holdings === 'object') {
        return Object.entries(holdings).map(([category, value]) => {
          if (value && typeof value === 'object') return { category, ...value }
          return { category, balance: value }
        })
      }
      return []
    },



    async getCardBchBalance({ guardZero = false } = {}) {
      try {
        let balance = await this.$store.dispatch('card/fetchCardBalance', this.activeCard.id)
        if (guardZero && Number(balance) <= 0 && Number(this.bchBalance) > 0) {
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            const retry = await this.$store.dispatch('card/fetchCardBalance', this.activeCard.id).catch(() => null)
            if (retry == null) continue
            balance = retry
            if (Number(balance) > 0) break
          }
        }
        this.bchBalance = balance
      } catch {
        cardLogger.error('Error refreshing card BCH balance, keeping last known value')
      }
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
      this.loadActiveCard()
      this.showEditNameDialog = false
    },

    onTabClick (label) {
      if (label === 'Order Card') return
      this.activeTab = label
    },

    openCashInDialog () {
      // Set default currency to the currently selected currency
      this.cashInCurrency = this.selectedCurrency?.symbol || 'USD'
      this.cashInAmount = ''
      this.cashInFundType = 'BCH'
      this.showCashInDialog = true
    },

    openTokenFundDialog () {
      this.cashInFundType = 'TOKEN'
      this.showCashInDialog = true
    },

    async migrateSweepBch () {
      if (!this.activeCard?.id) return
      this.migrationSweepingBch = true
      this.migrationSweepError = ''
      try {
        const result = await this.activeCard.sweepFromVersion('v1', 'v2')
        if (result?.success === false) {
          this.migrationSweepError = result?.message || 'No BCH balance to sweep'
          return
        }
        this.migrationSweepDone = true
        this.getCardBchBalance()
      } catch (error) {
        cardLogger.error('Migration sweep failed:', error.message || error)
        this.migrationSweepError = error?.message || 'Sweep failed. Please try again.'
      } finally {
        this.migrationSweepingBch = false
      }
    },

    openMigrationDialog () {
      this.migrationStep = this.v2OwnershipSet ? 2 : 1
      this.migrationSweepDone = false
      this.migrationSweepError = ''
      this.showMigrationDialog = true
    },

    async migrateActivateV2 () {
      if (!this.activeCard?.id) return
      this.migratingToV2 = true
      this.migrationActivateMsg = ''
      try {
        if (this.v2OwnershipSet) {
          await this.$store.dispatch('card/activateCardVersion', {
            cardId: this.activeCard.id,
            version: 'v2',
          })
        } else {
          await this.$store.dispatch('card/setupVersionOwnership', {
            cardId: this.activeCard.id,
            version: 'v2',
            onProgress: (message) => { this.migrationActivateMsg = message },
          })
        }
        await this.loadActiveCard()
        this.migrationStep = 2
        this.migrationSweepDone = false
        this.migrationSweepError = ''
        this.$q.notify({
          type: 'positive',
          message: this.$t('CardUpgradedToV2', {}, 'Card upgraded to V2 successfully'),
          timeout: 3000,
        })
        this.getCardBchBalance()
        this.fetchCardTokenHoldings()
        this.refreshCardHistory()
      } catch (error) {
        cardLogger.error('Failed to activate V2:', error.message || error)
        this.$q.notify({
          type: 'negative',
          message: error?.message || this.$t('FailedToUpgradeV2', {}, 'Failed to upgrade to V2. Please try again.'),
          timeout: 5000,
        })
      } finally {
        this.migratingToV2 = false
      }
    },

    handleDeleteCard () {
      if (!this.activeCard) return

      const deleted = this.CardStorage.deleteCard(this.activeCard.id)
      
      if (deleted) {
        this.$q.notify({
          message: 'Card has been deleted',
          color: 'positive',
          icon: 'delete',
          position: 'bottom',
          timeout: 2000
        })
      }

      this.showDeleteCardDialog = false
      this.$router.push({ name: 'card-list' })
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

<style lang="scss">
@import "src/css/app-card.scss";
</style>

<style lang="scss" scoped>
  .pt-card.light {
    background: color-mix(in srgb, var(--q-primary) 12%, rgba(255, 255, 255, 0.75)) !important;
  }
  .card-version-badge {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 1;
  }
</style>

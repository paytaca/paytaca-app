<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
    <q-page-container>

      <!-- Skeleton loading state -->
      <div v-if="!isLoaded" class="full-width">
        <div class="q-px-md q-mt-md">
          <q-skeleton type="text" width="120px" height="28px" />
        </div>
        <div class="flex flex-center full-width q-mt-lg">
          <div class="wallet-container" style="position: relative; height: 520px;">
            <div
              v-for="n in 3"
              :key="n"
              class="stacked-card"
              :style="getSkeletonCardStyle(n-1)"
            >
              <div class="card-handle"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loaded state -->
      <div v-else class="full-width">
        <div class="flex flex-center full-width q-mt-sm">
          <div class="wallet-container">
            <div class="new-card-btn-container">
              <div :style="{ fontSize: '20px', fontWeight: '500', color: $q.dark.isActive ? '#ffffff' : '#1a1a2e' }">
                My Cards
              </div>
              <div class="plus-btn-circle">
                <q-btn
                  dense
                  round
                  flat
                  :color="$q.dark.isActive ? 'white' : 'dark'"
                  icon="add"
                  size="md"
                  @click="onOpenCreateCardForm"
                />
              </div>
            </div>
            <div v-if="showSwipeHint && displayedCards.length > 0" class="swipe-overlay" @click="dismissSwipeHint">
              <div class="swipe-overlay-content">
                <div class="swipe-arrow-container">
                  <q-icon name="arrow_forward" size="28px" />
                </div>
                <div class="swipe-overlay-text">Swipe right to view the card's details</div>
              </div>
            </div>
            <div
              v-for="(card, index) in displayedCards"
              :key="card.id"
              class="stacked-card"
              :class="{ 'swipe-hint': index === 0, 'is-dragging': currentCardId === card.id }"
              :style="getCardStyle(index)"
              @mousedown="startDrag($event, card)"
              @touchstart="startDrag($event, card)"
              @mousemove="onDrag($event, card)"
              @touchmove="onDrag($event, card)"
              @mouseup="endDrag(card)"
              @touchend="endDrag(card)"
              @mouseleave="endDrag(card)"
              @keyup.right="goToCardDetails(card)"
              tabindex="0"
            >
              <!-- Grabbable handle at top -->
              <div class="card-handle">
                <div class="handle-indicator"></div>
              </div>

              <!-- Top-left: Card name -->
              <div class="card-name-container">
                <div class="text-weight-medium ellipsis" style="font-size: 20px; max-width: 130px;">
                  {{ getCardDisplayName(card) }}
                </div>
              </div>

              <!-- Bottom-left: Balance -->
              <div class="card-balance-container">
                <div v-if="balancesLoading">
                  <q-skeleton type="text" width="70px" height="16px" />
                </div>
                <div v-else>
                  <div :style="{ fontSize: '10px', opacity: '0.6', fontWeight: '400', letterSpacing: '0.5px' }">BALANCE</div>
                  <div class="row items-center no-wrap" style="gap: 6px;">
                    <div class="text-weight-medium" style="font-size: 22px; line-height: 1.2;">
                      {{ satoshiToBch(getCardBalance(card.id)?.bch) }}
                    </div>
                    <div class="row items-center justify-center" style="width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.15);">
                      <q-img src="~assets/bch-logo.png" style="width: 14px; height: 14px;" fit="contain" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Top-right: Contract address -->
              <div class="card-contract-container">
                {{ formatContractAddress(card.cashAddress) }}
              </div>

              <!-- Bottom-right: Logo -->
              <div class="card-logo-container">
                <q-img src="~assets/paytaca_logo.png" style="width: 36px;" fit="contain" />
              </div>
            </div>

            <div v-if="subCards.length > 3" class="text-center q-mt-md">
              <q-btn
                flat
                no-caps
                :color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
                @click="showAllCards"
                style="font-size: 14px;"
              >
                View all {{ subCards.length }} cards
                <q-icon name="chevron_right" size="18px" class="q-ml-xs" />
              </q-btn>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Create Card Dialog -->
      <CreateCardForm v-if="showCreateCardForm" @onClose="onCloseCreateCardForm" :idempotencyKey="idempotencyKey"/>
      <ResumeCreateCardDialog 
        v-if="showResumeCreateCardDialog" 
        @resumeAttempt="onResumeCardAttempt" 
        @deleteAttempt="onDeleteCardAttempt" 
        @cancelAttempt="onCancelCardAttempt"
        />
    </q-page-container>
  </q-layout>
</template>

<script>
import CreateCardForm from 'src/components/card/CreateCardForm.vue';
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import CardPageHeader from 'src/components/card/CardPageHeader.vue';
import CreateCardAttemptMixin from 'src/mixins/card/create-card-attempt-mixin';
import ResumeCreateCardDialog from 'src/components/card/ResumeCreateCardDialog.vue';
import { loadCardUser } from 'src/services/card/user.js';
import { satoshiToBch } from 'src/exchange';
import { bus } from 'src/wallet/event-bus';
import { CardStorage } from 'src/components/card/createCard.js';

export default {
  mixins: [CreateCardAttemptMixin],
  components : {
    MultiWalletDropdown,
    CardPageHeader,
    CreateCardForm,
    ResumeCreateCardDialog
  },

  data () {
    return {
      swipeStates: {},
      isDragging: false,
      currentCardId: null,
      startX: 0,
      currentX: 0,
      // showCreateCardDialog: false,
      newCardName: '',
      isMinting: false,
      // Backend data fetching disabled
      // loadingCards: true,
      // backendDataMap: {} // Map of cardId -> backend data
      cardBalances: [],
      // true while card balances are being fetched from backend
      balancesLoading: true,
      isLoaded: false,
      showSwipeHint: true
    }
  },

  computed: {
    hiddenCount () {
      return this.subCards.length - 3
    },

    subCards () {
      return this.$store.getters['card/cards'] || []
    },

    displayedCards () {
      return ([...this.subCards].sort((a, b) => b.id - a.id)).slice(0, 3)
    },

    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-black'
    }
  },

  async mounted () {
    await this.loadData()
    this.isLoaded = true
    this.$nextTick(() => {
      setTimeout(() => this.dismissSwipeHint(), 5000)
      window.addEventListener('touchstart', this.dismissSwipeHint, { once: true })
      window.addEventListener('mousedown', this.dismissSwipeHint, { once: true })
    })
  },

  methods: {
    satoshiToBch,
    dismissSwipeHint () {
      this.showSwipeHint = false
      window.removeEventListener('touchstart', this.dismissSwipeHint)
      window.removeEventListener('mousedown', this.dismissSwipeHint)
    },
    async loadData () {
      await this.loadCardUser()
      await this.checkExistingCreateCardAttempt()
      await this.fetchCards()
      this.fetchCardsBalance()
    },

    async loadCardUser () {
      await loadCardUser().then(user => {
        this.user = user
      }).catch(err => {
        console.error('Error loading card user:', err)
        this.user = null
      })   
    },

    async fetchCards () {
      return this.$store.dispatch('card/fetchCards')
    },

    async fetchCardsBalance () {
      // show skeletons while fetching
      this.balancesLoading = true

      if (!this.user || this.subCards.length === 0) {
        this.balancesLoading = false
        return
      }

      try {
        this.cardBalances = (await this.user.fetchCardsBalance()).results
      } catch (err) {
        console.error('Error fetching card balances:', err)
      } finally {
        this.balancesLoading = false
      }
    },

    getCardBalance (cardId) {
      const card = this.cardBalances?.find(card => {
        return card.id === cardId
      })
      const temp = {
        bch: card?.bch_balance ?? '0',
        cashtoken: card?.ct_balance ?? []
      }
      return temp
    },
    /*
    async fetchCardsBackendData () {
      if (this.subCards.length === 0) {
        this.loadingCards = false
        return
      }
      
      this.loadingCards = true
      
      try {
        // Fetch backend data for each card
        const promises = this.subCards.map(async (card) => {
          try {
            const cardInstance = await Card.createInitialized({ raw: { id: card.id } })
            const bchUtxos = await cardInstance.getBchUtxos()
            const bchBalanceSats = bchUtxos.reduce((sum, utxo) => sum + BigInt(utxo.satoshis || 0), 0n)
            const bchBalance = (Number(bchBalanceSats) / 100000000).toFixed(8)
            
            this.backendDataMap[card.id] = {
              balance: bchBalance,
              contractAddress: cardInstance.raw?.contract_id
            }
          } catch (error) {
            console.error(`Failed to fetch data for card ${card.id}:`, error)
            this.backendDataMap[card.id] = null
          }
        })
        
        await Promise.all(promises)
      } catch (error) {
        console.error('Failed to fetch cards backend data:', error)
      } finally {
        this.loadingCards = false
      }
    },
    */

    capitalizeFirst (str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    /* Get card display name - checks localStorage first for saved name, then falls back to backend alias
     * This ensures edited names persist across the app
     */
    getCardDisplayName (card) {
      if (!card || !card.id) return 'Card'
      
      // Check localStorage for saved name first
      const savedName = CardStorage.getCardProperty(card.id, 'name')
      if (savedName) {
        return this.capitalizeFirst(savedName)
      }
      
      // Fall back to backend alias or name
      return this.capitalizeFirst(card.alias || card.name || 'Card')
    },

    /* NEW: Helper method to get card BCH balance using Card class
     * Uses card.getBchBalance() which returns card.raw.bch_balance from backend
     * Falls back to card.balance from localStorage if method not available
     * 
     * Usage: {{ getCardBchBalance(card) }} in template
     * 
     * getCardBchBalance (card) {
     *   if (!card) return '0.00'
     *   try {
     *     // Use getBchBalance() from Card class
     *     const balance = card.getBchBalance?.() ?? card.balance
     *     return typeof balance === 'number' ? balance.toFixed(2) : (balance || '0.00')
     *   } catch (error) {
     *     console.error('Error getting card balance:', error)
     *     return card?.balance || '0.00'
     *   }
     * },
     */

    getCardStyle (index) {
      const card = this.displayedCards[index]
      const cardId = card?.id
      const translateX = this.swipeStates[cardId] || 0
      const isDraggingThisCard = this.currentCardId === cardId
      
      const cardSpacing = 85
      const totalCards = this.displayedCards.length
      const buttonHeight = 280
      const cardHeight = 220
      const visibleArea = 70 // handle (30px) + card info area (~40px)
      const hiddenArea = cardHeight - visibleArea // 110px hidden behind button
      
      // Base position for newest card: 170px from bottom
      const baseOffset = buttonHeight - hiddenArea
      // As cards are added, older cards move up by 70px so their info remains visible
      const bottomOffset = baseOffset + index * cardSpacing

      return {
        bottom: `${bottomOffset}px`,
        zIndex: isDraggingThisCard ? 100 : (totalCards - index),
        position: 'absolute',
        width: '90%',
        left: '5%',
        transform: `translateX(${translateX}px)`,
        background: this.$q.dark.isActive 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        height: '220px',
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        cursor: isDraggingThisCard ? 'grabbing' : 'grab',
        color: 'white',

        transition: isDraggingThisCard
          ? 'none'
          : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',

        filter: `brightness(${1 - index * 0.1})`
      }
    },

    getSkeletonCardStyle (index) {
      const cardSpacing = 85
      const buttonHeight = 280
      const cardHeight = 220
      const visibleArea = 70
      const hiddenArea = cardHeight - visibleArea
      const baseOffset = buttonHeight - hiddenArea
      const bottomOffset = baseOffset + index * cardSpacing

      return {
        bottom: `${bottomOffset}px`,
        zIndex: 10 - index,
        position: 'absolute',
        width: '90%',
        left: '5%',
        background: this.$q.dark.isActive 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        height: '220px',
        pointerEvents: 'none'
      }
    },

    startDrag (evt, card) {
      console.log('startDrag called for card:', card?.id)
      const cardId = card?.id
      if (!cardId) {
        console.log('startDrag early return - no cardId')
        return
      }

      evt.preventDefault()
      
      this.isDragging = true
      this.currentCardId = cardId
      
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX
      this.startX = clientX
      this.currentX = this.swipeStates[cardId] || 0
      
      console.log('startDrag initialized - startX:', this.startX, 'currentX:', this.currentX)
      
      // Add global event listeners for dragging outside the element
      document.addEventListener('mousemove', this.onGlobalMove)
      document.addEventListener('mouseup', this.onGlobalEnd)
      document.addEventListener('touchmove', this.onGlobalMove, { passive: false })
      document.addEventListener('touchend', this.onGlobalEnd)
    },

    onDrag (evt, card) {
      if (!this.isDragging || this.currentCardId !== card?.id) return
      evt.preventDefault()
      
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX
      const deltaX = clientX - this.startX
      
      // Only allow right swipe (positive delta)
      const newX = Math.max(0, this.currentX + deltaX)
      this.swipeStates[card.id] = newX
    },

    onGlobalMove (evt) {
      if (!this.isDragging || !this.currentCardId) return
      
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX
      const deltaX = clientX - this.startX
      
      // Only allow right swipe (positive delta)
      const newX = Math.max(0, this.currentX + deltaX)
      this.swipeStates[this.currentCardId] = newX
    },

    endDrag (card) {
      console.log('endDrag called for card:', card?.id)
      if (!this.isDragging || this.currentCardId !== card?.id) {
        console.log('endDrag early return - isDragging:', this.isDragging, 'currentCardId:', this.currentCardId, 'card.id:', card?.id)
        return
      }
      
      this.isDragging = false
      
      // Remove global event listeners
      document.removeEventListener('mousemove', this.onGlobalMove)
      document.removeEventListener('mouseup', this.onGlobalEnd)
      document.removeEventListener('touchmove', this.onGlobalMove)
      document.removeEventListener('touchend', this.onGlobalEnd)

      const swipeX = this.swipeStates[card.id] || 0
      console.log('Swipe distance:', swipeX)

      // if swipe distance is enough, navigate
      if (swipeX > 150) {
        console.log('Swipe distance > 150, calling goToCardDetails')
        this.goToCardDetails(card)
      }
      else {
        console.log('Swipe distance < 150, resetting card position')
        // brings card back to initial position
        this.swipeStates[card.id] = 0
      }
      
      this.currentCardId = null
    },

    onGlobalEnd () {
      console.log('onGlobalEnd called, currentCardId:', this.currentCardId)
      if (!this.currentCardId) {
        console.log('onGlobalEnd early return - no currentCardId')
        return
      }
      
      const swipeX = this.swipeStates[this.currentCardId] || 0
      console.log('onGlobalEnd swipe distance:', swipeX)
      
      this.isDragging = false
      
      // Remove global event listeners
      document.removeEventListener('mousemove', this.onGlobalMove)
      document.removeEventListener('mouseup', this.onGlobalEnd)
      document.removeEventListener('touchmove', this.onGlobalMove)
      document.removeEventListener('touchend', this.onGlobalEnd)

      // if swipe distance is enough, navigate
      if (swipeX > 150) {
        console.log('onGlobalEnd: swipe > 150, finding card...')
        const card = this.displayedCards.find(c => c.id === this.currentCardId)
        console.log('onGlobalEnd: found card:', card)
        if (card) this.goToCardDetails(card)
      }
      else {
        console.log('onGlobalEnd: swipe < 150, resetting position')
        // brings card back to initial position
        this.swipeStates[this.currentCardId] = 0
      }
      
      this.currentCardId = null
    },

    formatContractAddress (address) {
      if (!address) return ''
      const addr = typeof address === 'object' ? address.contractAddress : address
      if (!addr) return ''
      const str = String(addr)
      if (str.length <= 9) return str
      return str.slice(0, 16) + '...' + str.slice(-5)
    },

    goToCardDetails (card) {
      console.log('goToCardDetails called with card:', card)
      if (card && card.id) {
        console.log('Navigating to card-details with id:', card.id)
        this.$router.push({ name: 'card-details', params: {id: card.id} })
          .then(() => console.log('Navigation to card-details successful'))
          .catch(err => console.error('Navigation to card-details failed:', err))
      } else {
        console.warn('goToCardDetails: card or card.id is missing')
      }
    },

    showAllCards () {
      this.$router.push({ name: 'all-cards' })
    },

    closeDialog () {
      this.showCreateCardDialog = false
      this.newCardName = ''
      this.isMinting = false
    },

    async createCard () {
      if (!this.newCardName || !this.newCardName.trim()) {
        this.notifyError('Please enter a card name')
        return
      }

      // Show minting state
      this.isMinting = true

      // Simulate minting delay (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create new card with 0 balance
      const newCard = {
        id: Date.now(),
        name: this.newCardName.trim(),  // Add name property for display
        raw: { alias: this.newCardName.trim() },
        balance: '0.0000', // New card has 0 BCH balance
        status: 'Active',
        contractAddress: this.contractAddress || 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw',
        // TODO: Replace with card_instance.raw.cash_address or card_instance.raw.token_address from Card class
        isLocked: false,
        cardReplacementStatus: 'none'
      }

      // Save to localStorage using CardStorage
      const createdCard = this.CardStorage.createCard(newCard);

      // Update the displayed cards
      this.subCards = this.CardStorage.getCards();

      // Reset dialog state
      this.closeDialog()

      // Show success notification
      this.$q.notify({
        message: 'Card created successfully!',
        color: 'positive',
        icon: 'check_circle',
        position: 'top',
        timeout: 1500
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "src/css/app-card.scss";

  .new-card-btn-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
  }

  .plus-btn-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid currentColor;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
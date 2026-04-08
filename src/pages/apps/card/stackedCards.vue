<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
    <q-page-container>
      <CardPageHeader />

      <div class="q-px-md q-mt-md">
        <!-- SKELETON LOADER for "My Cards" title: <q-skeleton v-if="loadingCards" type="text" width="100px" /> -->
        <div class="text-subtitle1 text-weight-bold" :class="textColor">My Cards</div>
        <q-separator class="q-mt-xs" :color="$q.dark.isActive ? 'grey-8' : 'grey-4'" />
      </div>

      <div class="flex flex-center full-width">
        <div class="wallet-container">
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
            <!-- Grabbable handle at top with info -->
            <div class="card-handle" :class="$q.dark.isActive ? 'bg-dark' : ''">
              <div class="handle-indicator" :class="$q.dark.isActive ? 'bg-grey-5' : ''"></div>
            </div>
            <!-- Card info positioned right below handle -->
            <div class="card-info row justify-between items-center no-wrap">
              <!-- 
                SKELETON LOADER for card stack items when loading backend data:
                <div v-if="loadingCards" class="full-width row justify-between">
                  <q-skeleton type="text" width="80px" />
                  <q-skeleton type="text" width="60px" />
                </div>
              -->
              <div 
                class="text-weight-bold text-subtitle2 ellipsis" 
                style="max-width: 120px; font-size: 13px;"
                :class="textColor"
              >
                <!-- SKELETON LOADER for card name: <q-skeleton v-if="loadingCards" type="text" width="100px" /> -->
                {{ capitalizeFirst(card.name) }}
              </div>
              <div 
                class="text-weight-bold text-subtitle2" 
                style="font-size: 13px;"
                :class="textColor"
              >
                <!-- SKELETON LOADER for card balance: <q-skeleton v-if="loadingCards" type="text" width="70px" /> -->
                {{ formatBalance(card.balance) }} BCH
                <!-- NEW: Use Card class getBchBalance() method -->
                <!-- {{ formatBalance(card?.getBchBalance ? card.getBchBalance() : card?.balance) }} BCH -->
              </div>
            </div>
          </div>

          <div
            class="front-wallet-card flex flex-center cursor-pointer"
            :class="$q.dark.isActive ? 'bg-dark' : ''"
            @click="showCreateCardDialog = true"
          >
            <q-card-section class="text-center slot-content">
              <div 
                class="text-h6 q-mb-sm"
                :class="textColor"
              >
                Add a new card
              </div>
              <q-icon name="add" size="56px" :color="$q.dark.isActive ? 'white' : 'dark'" />
            </q-card-section>
          </div>

          <div 
            v-if="subCards.length > 3"
            class="see-all-container text-center q-mt-lg"
          >
            <q-btn
              flat
              no-caps
              class="see-all-btn full-width"
              @click="showAllCards"
            >
              <div class="row items-center no-wrap">
                <span class="text-weight-bold">View all {{ subCards.length }} cards</span>
                <q-icon name="expand_more" size="20px" class="q-ml-xs" />
              </div>
            </q-btn>
          </div>  
        </div>
      </div>
      
      <!-- Create Card Dialog -->
      <q-dialog v-model="showCreateCardDialog" persistent>
        <q-card style="min-width: 350px" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'">
          <!-- Dialog Header -->
          <q-card-section class="row items-center">
            <div class="text-h6" :class="textColor">Create New Card</div>
            <q-space />
            <q-btn icon="close" flat round dense :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" @click="closeDialog" />
          </q-card-section>

          <q-separator :dark="$q.dark.isActive" />

          <!-- Normal Content -->
          <q-card-section v-if="!isMinting">
            <q-input
              v-model="newCardName"
              label="Card Name *"
              :dark="$q.dark.isActive"
              :rules="[
                val => !!val || 'Card name is required',
                val => val.length <= 10 || 'Maximum 10 characters'
              ]"
              @keyup.enter="createCard"
              autofocus
              outlined
              maxlength="10"
              counter
              hint="Max of 10 characters allowed"
            >
              <template v-slot:prepend>
                <q-icon name="credit_card" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" />
              </template>
            </q-input>
          </q-card-section>

          <!-- Minting Loading State -->
          <q-card-section v-else class="text-center q-pa-lg">
            <q-icon
              name="token"
              size="64px"
              :color="$q.dark.isActive ? 'primary' : 'primary'"
              class="q-mb-md"
            />
            <div 
              class="text-h6 q-mb-sm"
              :class="textColor"
            >
              Minting your card
            </div>
            <div 
              class="text-caption"
              :class="textColorGrey"
            >
              Please wait while we create your new card...
            </div>
            <q-linear-progress indeterminate color="primary" class="q-mt-md" />
          </q-card-section>

          <!-- Action Buttons (only show when not minting) -->
          <q-card-actions v-if="!isMinting" align="right" class="q-pa-md">
            <q-btn 
              flat 
              label="Cancel" 
              :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" 
              @click="closeDialog" 
            />
            <q-btn 
              label="Done" 
              color="primary" 
              :disable="!newCardName || !newCardName.trim() || newCardName.length > 10"
              @click="createCard"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

    </q-page-container>
  </q-layout>
</template>

<script>
import {createCardLogic} from './noBackend.js'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import CardPageHeader from './CardPageHeader.vue';

export default {
  mixins: [createCardLogic],
  components : {
    MultiWalletDropdown,
    CardPageHeader,
  },

  data () {
    return {
      swipeStates: {},
      isDragging: false,
      currentCardId: null,
      startX: 0,
      currentX: 0,
      showCreateCardDialog: false,
      newCardName: '',
      isMinting: false
      // Backend data fetching disabled
      // loadingCards: true,
      // backendDataMap: {} // Map of cardId -> backend data
    }
  },

  computed: {
    displayedCards () {
      const sorted = [...this.subCards].sort((a, b) => b.id - a.id)
      return sorted.slice(0, 3)
    },

    hiddenCount () {
      return this.subCards.length - 3
    }
  },

  mounted () {
    // when the page loads, fetch the cards in localStorage
    this.fetchCards()
    // TODO: Switch to backend - use await this.getCards() instead
    
    // If no cards exist, redirect to card homepage
    if (this.subCards.length === 0) {
      this.$router.push({ name: 'app-card' })
    }
    
    // Fetch backend data for all cards - DISABLED
    // this.fetchCardsBackendData()
    
    /* NEW: Fetch real balances from backend using Card class
     * Uncomment to enable real balance fetching:
     * 
     * async fetchCardBalances () {
     *   if (this.subCards.length === 0) return
     *   
     *   try {
     *     const { Card } = await import('src/services/card/card')
     *     
     *     for (const card of this.subCards) {
     *       try {
     *         const cardInstance = await Card.createInitialized(card)
     *         
     *         // Get BCH balance from server
     *         const bchBalance = cardInstance.getBchBalance()
     *         card.balance = bchBalance.toString()
     *         
     *         // Get Token balance
     *         const tokenBalance = cardInstance.getTokenBalance()
     *         console.log(`Card ${card.id} Token balance:`, tokenBalance)
     *         
     *         // Optionally get real-time balance from blockchain
     *         // const contractBalance = await cardInstance.getContractBalance()
     *         // console.log(`Card ${card.id} Contract balance:`, contractBalance)
     *       } catch (error) {
     *         console.error(`Error fetching balance for card ${card.id}:`, error)
     *       }
     *     }
     *   } catch (error) {
     *     console.error('Error fetching card balances:', error)
     *   }
     * }
     * 
     * // Call the method
     * this.fetchCardBalances()
     */
  },

  methods: {
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
      
      const cardSpacing = 70
      const totalCards = this.displayedCards.length
      const buttonHeight = 280
      const cardHeight = 180
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
        background: this.$q.dark.isActive ? '#1d1d1d' : 'white',
        border: this.$q.dark.isActive ? '2px solid #424242' : '2px solid #9e9e9e',
        borderRadius: '15px',
        height: '180px',
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        cursor: isDraggingThisCard ? 'grabbing' : 'grab',

        transition: isDraggingThisCard
          ? 'none'
          : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',

        filter: `brightness(${1 - index * 0.1})`
      }
    },

    startDrag (evt, card) {
      const cardId = card?.id
      if (!cardId) return

      evt.preventDefault()
      
      this.isDragging = true
      this.currentCardId = cardId
      
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX
      this.startX = clientX
      this.currentX = this.swipeStates[cardId] || 0
      
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
      if (!this.isDragging || this.currentCardId !== card?.id) return
      
      this.isDragging = false
      
      // Remove global event listeners
      document.removeEventListener('mousemove', this.onGlobalMove)
      document.removeEventListener('mouseup', this.onGlobalEnd)
      document.removeEventListener('touchmove', this.onGlobalMove)
      document.removeEventListener('touchend', this.onGlobalEnd)

      const swipeX = this.swipeStates[card.id] || 0

      // if swipe distance is enough, navigate
      if (swipeX > 150) {
        this.goToCardDetails(card)
      }
      else {
        // brings card back to initial position
        this.swipeStates[card.id] = 0
      }
      
      this.currentCardId = null
    },

    onGlobalEnd () {
      if (!this.currentCardId) return
      
      const swipeX = this.swipeStates[this.currentCardId] || 0
      
      this.isDragging = false
      
      // Remove global event listeners
      document.removeEventListener('mousemove', this.onGlobalMove)
      document.removeEventListener('mouseup', this.onGlobalEnd)
      document.removeEventListener('touchmove', this.onGlobalMove)
      document.removeEventListener('touchend', this.onGlobalEnd)

      // if swipe distance is enough, navigate
      if (swipeX > 150) {
        const card = this.displayedCards.find(c => c.id === this.currentCardId)
        if (card) this.goToCardDetails(card)
      }
      else {
        // brings card back to initial position
        this.swipeStates[this.currentCardId] = 0
      }
      
      this.currentCardId = null
    },

    goToCardDetails (card) {
      if (card && card.id) {
        this.$router.push({ name: 'card-details', query: {id: card.id} })
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
  @import "./createCard.scss";
</style>
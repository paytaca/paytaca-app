<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
    <q-page-container>

      <div class="q-px-md q-mt-md">
        <!-- SKELETON LOADER for "My Cards" title: <q-skeleton v-if="loadingCards" type="text" width="100px" /> -->
        <div style="font-size: 16px; font-weight: bold; color: #000000;">My Cards</div>
        <q-separator class="q-mt-xs" :color="$q.dark.isActive ? 'grey-8' : 'grey-4'" />
      </div>

      <div class="flex flex-center full-width">
        <div class="wallet-container">
          <div
            v-if="isLoaded"
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
                style="max-width: 120px; font-size: 13px; color: inherit;"
              >
                <!-- SKELETON LOADER for card name: <q-skeleton v-if="loadingCards" type="text" width="100px" /> -->
                {{ capitalizeFirst(card.alias) }}
              </div>
              <div 
                class="text-weight-bold text-subtitle2" 
                style="font-size: 13px; color: inherit;"
              >
                <!-- SKELETON LOADER for card balance: <q-skeleton v-if="loadingCards" type="text" width="70px" /> -->
                {{ satoshiToBch(getCardBalance(card.id)?.bch) }} BCH
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
                :style="{ color: $q.dark.isActive ? '#ffffff' : '#000000' }"
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
              <div class="row items-center no-wrap" :style="{ color: $q.dark.isActive ? '#ffffff' : '#000000' }">
                <span class="text-weight-bold">View all {{ subCards.length }} cards</span>
                <q-icon name="expand_more" size="20px" class="q-ml-xs" />
              </div>
            </q-btn>
          </div>  
        </div>
      </div>
      
      <!-- Create Card Dialog -->
      <CreateCardForm v-if="showCreateCardDialog" @onClose="showCreateCardDialog=false"/>

    </q-page-container>
  </q-layout>
</template>

<script>
import CreateCardForm from 'src/components/card/CreateCardForm.vue';
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import CardPageHeader from 'src/components/card/CardPageHeader.vue';
// import { createCardLogic } from 'src/components/card/createCard.js';
import { loadCardUser } from 'src/services/card/user.js';
import { satoshiToBch } from 'src/exchange';

export default {
  // mixins: [createCardLogic],
  components : {
    MultiWalletDropdown,
    CardPageHeader,
    CreateCardForm,
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
      isMinting: false,
      // Backend data fetching disabled
      // loadingCards: true,
      // backendDataMap: {} // Map of cardId -> backend data
      cardBalances: [],
      isLoaded: false
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
  },

  methods: {
    satoshiToBch,
    async loadData () {
      await this.loadCardUser()
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
      if (!this.user || this.subCards.length === 0) return

      try {
        this.cardBalances = (await this.user.fetchCardsBalance()).results
      } catch (err) {
        console.error('Error fetching card balances:', err)
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
</style>
<template>
  <q-layout view="lHh Lpr lFf">
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

      <div class="q-px-md q-mt-md">
        <div class="text-subtitle1 text-weight-bold" :class="$q.dark.isActive ? 'text-grey-4' : 'text-dark'">My Cards</div>
        <q-separator class="q-mt-xs" :color="$q.dark.isActive ? 'grey-8' : 'grey-4'" />
      </div>

      <div class="flex flex-center full-width">
        <div class="wallet-container">
          <div
            v-for="(card, index) in displayedCards"
            :key="card.id"
            class="stacked-card"
            :class="{ 'swipe-hint': index === displayedCards.length -1, 'is-dragging': currentCardId === card.id }"
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
              <div 
                class="text-weight-bold text-subtitle2 ellipsis" 
                style="max-width: 120px; font-size: 13px;"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                {{ card.raw?.alias }}
              </div>
              <div 
                class="text-weight-bold text-subtitle2" 
                style="font-size: 13px;"
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
              >
                {{ card.balance }} BCH
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
                :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
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
            <div class="text-h6" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">Create New Card</div>
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
              :rules="[val => !!val || 'Card name is required']"
              @keyup.enter="createCard"
              autofocus
              outlined
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
              :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
            >
              Minting your card
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
            >
              Please wait while we create your new virtual card...
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
              :disable="!newCardName || !newCardName.trim()"
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

export default {
  mixins: [createCardLogic],
  components : {
    MultiWalletDropdown,
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
    }
  },

  computed: {
    displayedCards () {
      // Show the 3 newest cards with newest at the front
      // Sort by id ASCENDING (oldest first) so newest gets highest z-index
      // This puts the newest card visually at the front of the stack
      const sorted = [...this.subCards].sort((a, b) => a.id - b.id)
      // Take last 3 (newest) if there are more than 3
      return sorted.slice(-3)
    },

    hiddenCount () {
      return this.subCards.length - 3
    }
  },

  mounted () {
    // when the page loads, fetch the cards in localStorage
    this.fetchCards()
  },

  methods: {
    getCardStyle (index) {
      const card = this.displayedCards[index]
      const cardId = card?.id
      // Increased spacing to show more of each card (70px instead of 45px)
      const offset = index * 70
      const translateX = this.swipeStates[cardId] || 0
      const isDraggingThisCard = this.currentCardId === cardId

      return {
        top: `${offset}px`,
        zIndex: isDraggingThisCard ? 100 : (index + 1),
        position: 'absolute',
        width: '90%',
        left: '5%',
        background: this.$q.dark.isActive ? '#1d1d1d' : 'white',
        border: this.$q.dark.isActive ? '2px solid #424242' : '2px solid #9e9e9e',
        borderRadius: '15px',
        height: '180px',
        transform: `translateX(${translateX}px)`,
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        cursor: isDraggingThisCard ? 'grabbing' : 'grab',

        transition: isDraggingThisCard
          ? 'none'
          : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',

        filter: `brightness(${1-index * 0.1})`
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
        this.$q.notify({
          message: 'Please enter a card name',
          color: 'negative',
          icon: 'error',
          position: 'top'
        })
        return
      }

      // Show minting state
      this.isMinting = true

      // Simulate minting delay (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create new card with 0 balance
      const newCard = {
        id: Date.now(),
        raw: { alias: this.newCardName.trim() },
        balance: '0.00', // New card has 0 BCH balance
        status: 'Active',
        contractAddress: this.contractAddress || 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw',
        isLocked: false,
        cardReplacementStatus: 'none'
      }

      // Save to localStorage
      const savedData = localStorage.getItem('mock_subcards')
      const currentCards = savedData ? JSON.parse(savedData) : []
      currentCards.push(newCard)
      localStorage.setItem('mock_subcards', JSON.stringify(currentCards))

      // Update the displayed cards
      this.subCards = currentCards

      // Reset dialog state
      this.closeDialog()

      // Show success notification
      this.$q.notify({
        message: 'Card created successfully!',
        color: 'positive',
        icon: 'check_circle',
        position: 'top',
        timeout: 2000
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss";
</style>
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
            @click="$router.push({name: 'app-card'})"
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
      currentX: 0
    }
  },

  computed: {
    displayedCards () {
      return this.subCards.slice(0,3)
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
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss";
</style>
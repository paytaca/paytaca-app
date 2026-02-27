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

      <div>
        My cards
      </div>

      <div class="flex flex-center full-width">
        <div class="wallet-container">
          <div
            v-for="(card, index) in displayedCards"
            :key="card.id"
            class="stacked-card shadow-5"
            :class="{ 'swipe-hint': index === displayedCards.length -1 }"
            :style="getCardStyle(index)"
            v-touch-pan.horizontal.prevent.mouse="index === (displayedCards.length - 1) ? handleSwipe : null"
            @keyup.right="index === (displayedCards.length - 1) ? goToCardDetails() : null"
            tabindex="0"
          >
            <div class="row justify-between items-start q-px-md q-pt-sm">
              <div class="text-weight bold text-black text-subtitle2">{{ card.raw?.alias }}</div>
              <div class="text-weight-bold text-black text-subtitle2">{{ card.balance }} BCH</div>
            </div>
          </div>

          <q-card
            flat
            bordered
            class="front-wallet-card flex flex-center shadow-10 cursor-pointer"
            @click="$router.push({name: 'app-card'})"
          >
            <q-card-section class="text-center">
              <div class="text-h6 q-mb-sm">Add a new card</div>
              <q-icon name="add" size="56px" />
            </q-card-section>
          </q-card>

          <div 
            v-if="subCards.length > 3"
            class="see-all-container text-center q-mt-xl"
            @click="showAllCards"
          >
            <q-icon name="keyboard_double_arrow_up" size="sm" color="primary" />
            <div class="text-caption text-primary text-weight-bold">See all ({{ hiddenCount }} more)</div>
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
      swipeX: 0,
      isPanning: false,
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
      const isFrontCard = index === (this.displayedCards.length -1)
      const offset = index * 45
      const translateX = isFrontCard ? this.swipeX : 0 

      return {
        top: `${offset}px`,
        zIndex: index + 1,
        position: 'absolute',
        width: '90%',
        left: '5%',
        background: 'white',
        border: '2px solid black',
        borderRadius: '15px',
        height: '180px',
        transform: `translateX(${translateX}px)`,
        
        transition: this.isPanning
          ? 'none'
          : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',

        filter: `brightness(${1-index * 0.1})`
      }
    },

    handleSwipe (details) {
      if (details.isFirst) {
        this.isPanning = true
      }

      // follow finger/cursor
      if (this.isPanning && details.offset.x > 0) {
        this.swipeX = details.offset.x
      }

      if (details.isFinal) {
        this.isPanning = false

        // if swipe distance is enough, navigate
        if (this.swipeX > 150) {
          this.goToCardDetails()
        }
        else {
          // brings card back to initial position
          this.swipeX = 0
        }
      }

      
    },

    goToCardDetails () {
      const frontCard = this.displayedCards[this.displayedCards.length -1]

      if (frontCard && frontCard.id) {
        this.$router.push({ name: 'card-details', query: {id: frontCard.id} })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>
<template>
  <q-page :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
    <div class="q-pa-md" style="min-height: 100vh;">
        <div class="text-subtitle1 text-weight-bold q-mb-md" :class="textColor">
          My Cards ({{ subCards.length }})
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="3em" />
          <div class="text-subtitle1 q-ml-md" :class="textColor">Loading cards...</div>
        </div>

        <div v-else-if="subCards.length === 0" class="text-center q-pa-xl">
          <q-icon name="credit_card" size="64px" color="grey" />
          <div class="text-h6 text-grey q-mt-md">No cards yet</div>
          <q-btn 
            color="primary" 
            label="Add a card" 
            class="q-mt-md"
            @click="$router.push({name: 'app-card'})"
          />
        </div>

        <div v-else-if="!loading && subCards.length > 0" class="cards-grid">
          <div
            v-for="card in sortedCards"
            :key="card.id"
            class="card-grid-item cursor-pointer"
            @click="goToCardDetails(card)"
          >
            <div class="card-grid-info">
              <div class="card-name text-weight-bold ellipsis">
                {{ capitalizeFirst(card.name) }}
              </div>
              <div class="card-balance text-weight-bold">
                {{ formatBalance(card.balance) }} BCH
              </div>
            </div>
          </div>
        </div>
    </div>
  </q-page>
</template>

<script>
import { createCardLogic } from 'src/components/card/createCard.js'
import { loadCardUser } from 'src/services/card/user.js';

export default {
  mixins: [createCardLogic],

  data () {
    return {
      user: null,
      loading: false,
    }
  },

  computed: {
    // Sort cards with oldest first (ascending by id)
    sortedCards () {
      return [...this.subCards].sort((a, b) => a.id - b.id)
    }
  },

  async mounted () {
    await this.loadUser()
    await this.fetchBackendCards()
    
    // If no cards exist, redirect to card homepage
    if (this.subCards.length === 0) {
      this.$router.push({ name: 'app-card' })
    }
  },

  methods: {
    async loadUser () {
      try {
        this.user = await loadCardUser()
        console.log('Loaded card user for all cards page:', this.user)
      } catch (err) {
        console.error('Error loading card user:', err)
        this.user = null
      }
    },

    async fetchBackendCards () {
      if (!this.user) {
        console.log('No user loaded, falling back to localStorage')
        this.fetchCards() // Fallback to localStorage
        return
      }

      this.loading = true
      try {
        const cards = await this.user.fetchCards()
        console.log('Fetched backend cards for all cards page:', cards?.length || 0, 'cards')
        
        if (cards && cards.length > 0) {
          // Convert backend cards to format compatible with localStorage structure
          this.subCards = cards.map(backendCard => ({
            id: backendCard.id,
            name: backendCard.alias || backendCard.name || `Card ${backendCard.id}`,
            balance: backendCard.bch_balance || '0',
            // Include all other backend properties
            ...backendCard
          }))
        } else {
          // Fallback to localStorage if no backend cards
          this.fetchCards()
        }
      } catch (err) {
        console.error('Error fetching backend cards:', err)
        // Fallback to localStorage on error
        this.fetchCards()
      } finally {
        this.loading = false
      }
    },

    capitalizeFirst (str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    goToCardDetails (card) {
      if (card && card.id) {
        this.$router.push({ name: 'card-details', params: {id: card.id} })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/css/app-card.scss";
</style>

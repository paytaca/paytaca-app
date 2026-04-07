<template>
<<<<<<< Updated upstream
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
=======
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
    <q-page-container>
      <CardPageHeader />
>>>>>>> Stashed changes

      <div>
        <MultiWalletDropdown></MultiWalletDropdown>
      </div>

<<<<<<< Updated upstream
      <div class="q-pa-md">
        <div class="text-subtitle1 text-weight-bold q-mb-md" :class="$q.dark.isActive ? 'text-grey-4' : 'text-dark'">
=======
      <div class="q-pa-md" style="min-height: 100vh;">
        <!-- SKELETON LOADER for "My Cards" title: <q-skeleton v-if="loading" type="text" width="150px" /> -->
        <div class="text-subtitle1 text-weight-bold q-mb-md" :class="textColor">
>>>>>>> Stashed changes
          My Cards ({{ subCards.length }})
        </div>

        <div v-if="subCards.length === 0" class="text-center q-pa-xl">
          <q-icon name="credit_card" size="64px" color="grey" />
          <div class="text-h6 text-grey q-mt-md">No cards yet</div>
          <q-btn 
            color="primary" 
            label="Add a card" 
            class="q-mt-md"
            @click="$router.push({name: 'app-card'})"
          />
        </div>

        <div v-else class="cards-grid">
<<<<<<< Updated upstream
=======
          <!--
            SKELETON LOADER for cards grid when loading backend data:
            <div v-if="loading" class="cards-grid">
              <div v-for="n in 6" :key="n" class="card-grid-item">
                <q-skeleton type="rect" height="80px" class="full-width" />
              </div>
            </div>
          -->
>>>>>>> Stashed changes
          <div
            v-for="card in sortedCards"
            :key="card.id"
            class="card-grid-item cursor-pointer"
            @click="goToCardDetails(card)"
          >
            <div class="card-grid-info">
              <div class="card-name text-weight-bold ellipsis">
<<<<<<< Updated upstream
                {{ card.raw?.alias }}
              </div>
              <div class="card-balance text-weight-bold">
                {{ card.balance }} BCH
=======
                <!-- SKELETON LOADER for card name: <q-skeleton v-if="loading" type="text" width="120px" /> -->
                {{ capitalizeFirst(card.name) }}
              </div>
              <div class="card-balance text-weight-bold">
                <!-- SKELETON LOADER for card balance: <q-skeleton v-if="loading" type="text" width="80px" /> -->
                {{ card.balance || '0.00' }} BCH
>>>>>>> Stashed changes
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </q-page-container>
  </q-layout>
</template>

<script>
import {createCardLogic} from './noBackend.js'
<<<<<<< Updated upstream
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
=======
// import { Card } from 'src/services/card/card'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import CardPageHeader from './CardPageHeader.vue';
>>>>>>> Stashed changes

export default {
  mixins: [createCardLogic],
  components : {
    MultiWalletDropdown,
<<<<<<< Updated upstream
=======
    CardPageHeader,
  },

  data () {
    return {
      // Backend data fetching disabled
      // loading: true,
      // backendDataMap: {} // Map of cardId -> backend data
    }
>>>>>>> Stashed changes
  },

  computed: {
    // Sort cards with oldest first (ascending by id)
    sortedCards () {
      return [...this.subCards].sort((a, b) => a.id - b.id)
    }
  },

  mounted () {
    this.fetchCards()
<<<<<<< Updated upstream
  },

  methods: {
=======
    // TODO: Switch to backend - use await this.getCards() instead
    
    // If no cards exist, redirect to card homepage
    if (this.subCards.length === 0) {
      this.$router.push({ name: 'app-card' })
    }
    
    // Fetch backend data for all cards - DISABLED
    // this.fetchCardsBackendData()
  },

  methods: {
    /*
    async fetchCardsBackendData () {
      if (this.subCards.length === 0) {
        this.loading = false
        return
      }
      
      this.loading = true
      
      try {
        // Fetch backend data for each card
        const promises = this.subCards.map(async (card) => {
          try {
            const cardInstance = await Card.createInitialized({ raw: { id: card.id } })
            const bchUtxos = await cardInstance.getBchUtxos()
            const bchBalanceSats = bchUtxos.reduce((sum, utxo) => sum + BigInt(utxo.satoshis || 0), 0n)
            const bchBalance = (Number(bchBalanceSats) / 100000000).toFixed(8)
            
            this.backendDataMap[card.id] = {
              balance: bchBalance
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
        this.loading = false
      }
    },
    */

    capitalizeFirst (str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

>>>>>>> Stashed changes
    goToCardDetails (card) {
      if (card && card.id) {
        this.$router.push({ name: 'card-details', query: {id: card.id} })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "./createCard.scss";
</style>

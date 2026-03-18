<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <CardPageHeader />

      <div>
        <MultiWalletDropdown></MultiWalletDropdown>
      </div>

      <div class="q-pa-md">
        <div class="text-subtitle1 text-weight-bold q-mb-md" :class="$q.dark.isActive ? 'text-grey-4' : 'text-dark'">
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
          <div
            v-for="card in sortedCards"
            :key="card.id"
            class="card-grid-item cursor-pointer"
            @click="goToCardDetails(card)"
          >
            <div class="card-grid-info">
              <div class="card-name text-weight-bold ellipsis">
                {{ card.raw?.alias }}
              </div>
              <div class="card-balance text-weight-bold">
                {{ card.balance }} BCH
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
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import CardPageHeader from './CardPageHeader.vue';

export default {
  mixins: [createCardLogic],
  components : {
    MultiWalletDropdown,
    CardPageHeader,
  },

  computed: {
    // Sort cards with oldest first (ascending by id)
    sortedCards () {
      return [...this.subCards].sort((a, b) => a.id - b.id)
    }
  },

  mounted () {
    this.fetchCards()
  },

  methods: {
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

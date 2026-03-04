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

        <div v-else class="cards-list">
          <q-card
            v-for="card in subCards"
            :key="card.id"
            flat
            bordered
            class="card-item q-mb-md cursor-pointer"
            :class="$q.dark.isActive ? 'bg-dark' : ''"
            @click="goToCardDetails(card)"
          >
            <q-card-section class="row items-center justify-between">
              <div>
                <div class="text-subtitle1 text-weight-bold" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">
                  {{ card.raw?.alias }}
                </div>
                <div class="text-caption text-grey">Card ID: {{ card.id }}</div>
              </div>
              <div class="text-subtitle1 text-weight-bold" :class="$q.dark.isActive ? 'text-white' : 'text-dark'">
                {{ card.balance }} BCH
              </div>
            </q-card-section>
          </q-card>
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

.card-item {
  border-radius: 12px;
  transition: all 0.2s ease;
  background: #1d1d1d !important;

  &:hover {
    background: rgba(0, 122, 255, 0.2) !important;
    border-color: rgba(0, 122, 255, 0.5);
  }
}

.body--light .card-item {
  background: white !important;

  &:hover {
    background: rgba(0, 122, 255, 0.1) !important;
    border-color: rgba(0, 122, 255, 0.3);
  }
}
</style>

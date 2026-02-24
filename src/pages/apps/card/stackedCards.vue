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
            v-for="(card, index) in subCards"
            :key="card.id"
            class="stacked-card shadow-5"
            :style="getCardStyle(index)"
          >
            <div class="row justify-between items-center full-height q-px-md">
              <div class="text-weight bold">{{ card.raw.alias }}</div>
              <div class="text-weight-bold">{{ card.balance }} BCH</div>
            </div>
          </div>

          <q-card
            flat
            bordered
            class="front-wallet-card flex flex-center shadow-10"
            @click="$router.push({name: 'app-card'})"
          >
            <q-card-section class="text-center">
              <div class="text-h6 q-mb-sm">Add a new card</div>
              <q-icon name="add" size="56px" />
            </q-card-section>
          </q-card>

          <div class="see-all-container text-center q-mt-xl">
            <q-icon name="keyboard_double_arrow_up" size="sm" />
            <div class="text-caption">See all</div>
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

  mounted () {
    // when the page loads, fetch the cards in localStorage
    this.fetchCards()
  },

  methods: {
    getCardStyle (index) {
      // pushes each card down
      // last card will be at the bottom of the 'peeking' stack
      const offset = index * 40
      return {
        top: `${offset}px`,
        zIndex: index + 1,
        position: 'absolute',
        width: '100%',
        background: 'white',
        border: '2px solid black',
        borderRadius: '15px',
        height: '160px'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>
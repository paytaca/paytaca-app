<template>
  <q-layout view="LHh Lpr lFf">
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

      <q-page padding class="primary">
        <div class="row items-center q-mb-lg">
          <div class="text-h6 q-ml-md">{{activeCard?.raw?.alias}} Details</div>
        </div>
        
        <q-card flat bordered class="q-pa-md bg-white shadow-2" style="border-radius: 20px;">
          <div class="column items-center q-py-lg">
            <q-icon name="credit_card" size="100px" color="primary" />
            <div class="text-h5 text-weight-bold q-mt-md text-grey-7">{{ activeCard?.raw?.alias || 'no alias' }}</div>
            <div class="text-subtitle1 text-grey-7">{{ activeCard?.balance }}</div>
          </div>

          <q-separator q-my-md />

          <q-list>
            <q-item clickable v-ripple>
              <q-item-section avatar><q-icon name="edit" /></q-item-section>
              <q-item-section class="text-grey-7">Rename Card</q-item-section>
            </q-item>

            <q-item clickable v-ripple>
              <q-item-section><q-icon name="lock" /></q-item-section>
              <q-item-section class="text-grey-7">Freeze Card</q-item-section>
            </q-item>

            <q-item clickable v-ripple class="text-negative">
              <q-item-section><q-icon name="delete" color="negative" /></q-item-section>
              <q-item-section>Remove from Wallet</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import {createCardLogic} from './noBackend.js'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';

export default {
  mixins: [createCardLogic],
 
  data () {
    return {
      activeCard: null,
    }
  },

  mounted () {
    this.loadSpecificCard()
  },

  methods: {
    loadSpecificCard () {
      const cardId = this.$route.query.id
      // get all cards from localStorage
      const savedCards = localStorage.getItem('mock_subcards')

      if (savedCards) {
        const allCards = JSON.parse(savedCards)
        // find the specifc card
        const found = allCards.find(c => String(c.id) === String(cardId))
        
        if (found) {
          this.activeCard = found
        }
        else {
          console.error("Card not found in storage");
          this.$router.push({ name: 'stacked-cards' });
        }
      }

      
      
    }
  }

}
</script>
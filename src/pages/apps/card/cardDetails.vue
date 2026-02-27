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

      <q-page v-if="activeCard" class="q-px-md">
        <div class="column items-center q-mb-lg">
          <div class="row items-center q-mb-sm full-width q-gutter-sm">
            <div class="text-subtitle1 q-mr-sm">{{activeCard?.raw?.alias}}</div>
            <q-badge rounded color="green" size="xs" />
            <q-btn flat dense icon="edit" size="sm"/>
          </div>

          <div class="virtual-card-container flex flex-center shadow-2">
            <div class="text-grey-6">Virtual Card UI / Ad Content</div>
          </div>

          <div class="row justify-center full-width q-mt-sm">
            <div class="row items-center">
              <div class="q-mr-sm">{{ activeCard.balance }} BCH</div>
              <q-btn outline dense label="Cash In" size="sm" />
            </div>
          </div>
        </div>

        <div class="row q-gutter-q-sm justify-between q-mb-md">
          <q-btn 
            v-for="tab in ['Transactions', 'Manage Merchants', 'Card Replacement', 'Other Settings']"
            :key="tab"
            outline
            square
            :label="tab"
            :color="activeTab === tab ? 'primary' : 'white'"
            :class="{ 'bg-blue-1': activeTab === tab }"
            class="text-caption q-px-sm"
            @click="activeTab = tab"
          />
        </div>

        <div class="content-box flex flex-center">
          <div class="text-center text-grey-7">
            Content varies based on clicked tab<br>
            <strong>{{ activeTab }}</strong>
          </div>
        </div>
      </q-page>

      <q-page v-else class flex flex-center>
        <q-spinner-dots color="primary" size="40px" />
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
      activeTab: null,
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


<style lang="scss" scoped>
  @import "./createCard.scss"
</style>
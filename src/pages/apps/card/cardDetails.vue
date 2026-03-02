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
            <q-btn flat dense icon="edit" size="sm" @click="showEditNameDialog = true"/>
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
          <TransactionHistory 
            v-if="activeTab === 'Transactions' && activeCard" 
            :card="activeCard"
          />
          <div v-else-if="activeTab === 'Manage Merchants'" class="flex flex-center full-height">
            <div>Manage Merchants Content</div>
          </div>

          <div v-else-if="!activeCard" class="flex flex-center full-height">
            <q-spinner-dots color="primary" size="40px"/>
          </div>
        </div>
      </q-page>

      <q-page v-else class flex flex-center>
        <q-spinner-dots color="primary" size="40px" />
      </q-page>

      <q-dialog v-model="showEditNameDialog">
        <q-card style="min-width: 300px">
          <q-card-section>
            <div class="text-h6">Edit Card Name</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="newCardName"
              filled
              maxlength="10"
              counter
              autofocus
              placeholder="Enter new card name"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" @click="showEditNameDialog = false" />
            <q-btn flat label="Save" color="primary" @click="saveCardName" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-page-container>
  </q-layout>
</template>

<script>
import {createCardLogic} from './noBackend.js'
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import TransactionHistory from './transactionHistory.vue'

export default {
  mixins: [createCardLogic],
  components: {TransactionHistory},

  data () {
    return {
      activeCard: null,
      activeTab: 'Transactions',
      showEditNameDialog: false,
      newCardName: ''
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
          this.newCardName = found.raw?.alias || ''
        }
        else {
          console.error("Card not found in storage");
          this.$router.push({ name: 'stacked-cards' });
        }
      }   
    },
    saveCardName () {
      if (this.newCardName && this.newCardName.trim()) {
        this.activeCard.raw.alias = this.newCardName.trim()
        
        const savedCards = localStorage.getItem('mock_subcards')
        if (savedCards) {
          const allCards = JSON.parse(savedCards)
          const cardIndex = allCards.findIndex(c => String(c.id) === String(this.activeCard.id))
          if (cardIndex !== -1) {
            allCards[cardIndex] = this.activeCard
            localStorage.setItem('mock_subcards', JSON.stringify(allCards))
          }
        }
      }
      this.showEditNameDialog = false
    }
  }

}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>
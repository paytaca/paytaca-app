<template>
  <q-layout>
    <div class="q-mb-l">
      <p class="text-primary text-weight-bold text-h5 text-center">Create Card</p>
    </div>
     
    <div>
      <MultiWalletDropdown></MultiWalletDropdown>
    </div>

    <!-- Cards and Creating Cards -->
    <div class="q-mt-xl flex q-gutter-x-lg">
      <p class="text-weight-bold text-h5">Cards</p>
      <q-btn size="16px" roud color="teal" icon="mdi-plus" ></q-btn>
    </div>

    <div class="q-mt-md row items-start q-gutter-md">
      <q-card class="my-card">
        <q-card-section>
          <q-list bordered separator>
            <q-item 
              v-for="card in cardsList"
              :key="card.id"
              
              >
                <q-item-section>
                  <q-item-label>{{ card.id }}</q-item-label>
                  <q-item-label caption>ID: {{ card.name }}</q-item-label>
                </q-item-section>

            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </div>

  </q-layout>
  
</template>

<script>
  import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';

  export default {
    name: 'CardsList',

    components: {
      MultiWalletDropdown,
    },

    data() {
      return {
        cardsList: [],
        
      }
    },

    methods: {
      fetchCards () {
        this.cardsList = map(card => ({
          id: card.id,
          name: card.name
        }))
      }, 

      loadCards () {
        this.cardsList = [
          { id: 1, name: 'Card 1'},
          { id: 2, name: 'Card 2'}
        ]
      }
    },

    mounted () {
      this.cardsList
    }

  }
</script>
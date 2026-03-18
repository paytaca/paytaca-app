import router from 'src/router/index';
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import { getMerchantList } from 'src/services/card/merchants';

export { getMerchantList };

export const createCardLogic = {
      
  data () {
    return {
      createCardDialog: false,
      newCardName: '',
      subCards: [],
      contractAddress: 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw', // dummy
      hasOrderedPhysicalCard: false
    }
  },

  components: {
    MultiWalletDropdown,
  },

  async mounted () {
    console.log("GO!")
  },

  computed: {
    heroStyle () {
      return {
        background: 'linear-gradient(135deg, #027be3 0%, #26a69a 50%, #9c27b0 100%)',
        borderRadius: '24px',
        minHeight: '500px',
        width: '100%',
        maxWidth: '1100px',
        overflow: 'hidden'
      }
    },

  },

  methods: {
    formatContractAddress(address) {
      if (!address) return ''
      const addr = typeof address === 'object' ? address.contractAddress : address
      if (!addr) return ''
      const str = String(addr)
      if (str.length <= 9) return str
      return str.slice(0, 16) + '...' + str.slice(-5)
    },

    checkExistingCards () {
      const savedCards = localStorage.getItem('mock_subcards')
      const cards = savedCards ? JSON.parse(savedCards) : []

      // if user has existing cards and we are at the cards home page, redirect to stackedCards.vue
      if (cards.length > 0 && this.$route.name === 'app-card'){
        this.$router.push({ name: 'stacked-cards'})
      }
    },

    openCreateCardDialog(){
      this.newCardName = ''
      this.createCardDialog = true
    },

    // UI test only, pulls from browser memory
    fetchCards () {
      const savedCards = localStorage.getItem('mock_subcards')
      this.subCards = savedCards ? JSON.parse(savedCards) : []
    },
    
    async handleCreateCard(){
      if(!this.newCardName){
        this.$q.notify({message: 'Please enter a Card name', color: 'negative'})
        return
      }  
      // create mock card object
      const newCard = {
        id: Date.now(),
        raw: {alias: this.newCardName},
        balance: (Math.random() * 10).toFixed(2), // random balance
        status: 'Active',
        contractAddress: this.contractAddress
      }

      // save to localStorage
      const savedData = localStorage.getItem('mock_subcards')
      const currentCards = savedData ? JSON.parse(savedData) : []
      currentCards.push(newCard)
      localStorage.setItem('mock_subcards', JSON.stringify(currentCards))

      // reset UI state
      this.createCardDialog = false
      
      // redirect
      this.$router.push({name: 'stacked-cards'})

      this.newCardName = ''
    },

    navigateToCardDetails(card, tab = 'transactions') {
      this.$router.push({
        name: 'card-details',
        query: { 
          id: card.id,
          tab: tab
        }
      })
    },

  }
}
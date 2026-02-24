import router from 'src/router/index';
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';

export const createCardLogic = {
      
  data () {
    return {
      createCardDialog: false,
      newCardName: '',
      subCards: [],
      // contractAddress: 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw', // dummy
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
        status: 'Active'
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

  }
}
import router from 'src/router/index';
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import { getMerchantList } from 'src/services/card/merchants';
import { Card } from 'src/services/card/card';

export { getMerchantList };

// CardStorage utility for localStorage CRUD operations
const STORAGE_KEY = 'mock_subcards';

export const CardStorage = {
  /**
   * Get all cards from localStorage
   * @returns {Array} Array of card objects
   */
  getCards() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  /**
   * Save all cards to localStorage
   * @param {Array} cards - Array of card objects
   */
  saveCards(cards) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  },

  /**
   * Get a single card by ID
   * @param {string|number} cardId - Card ID
   * @returns {Object|null} Card object or null
   */
  getCardById(cardId) {
    const cards = this.getCards();
    return cards.find(c => String(c.id) === String(cardId)) || null;
  },

  /**
   * Create a new card
   * @param {Object} card - Card object to create
   * @returns {Object} Created card
   */
  createCard(card) {
    const cards = this.getCards();
    cards.push(card);
    this.saveCards(cards);
    return card;
  },

  /**
   * Update a card by ID
   * @param {string|number} cardId - Card ID
   * @param {Object|Function} updates - Object with updates or update function
   * @returns {Object|null} Updated card or null if not found
   */
  updateCard(cardId, updates) {
    const cards = this.getCards();
    const index = cards.findIndex(c => String(c.id) === String(cardId));
    if (index === -1) return null;
    
    if (typeof updates === 'function') {
      updates(cards[index]);
    } else {
      Object.assign(cards[index], updates);
    }
    
    this.saveCards(cards);
    return cards[index];
  },

  /**
   * Delete a card by ID
   * @param {string|number} cardId - Card ID
   * @returns {boolean} True if deleted, false if not found
   */
  deleteCard(cardId) {
    const cards = this.getCards();
    const index = cards.findIndex(c => String(c.id) === String(cardId));
    if (index === -1) return false;
    
    cards.splice(index, 1);
    this.saveCards(cards);
    return true;
  },

  /**
   * Update a specific property of a card
   * @param {string|number} cardId - Card ID
   * @param {string} property - Property name
   * @param {*} value - Property value
   * @returns {Object|null} Updated card or null if not found
   */
  setCardProperty(cardId, property, value) {
    return this.updateCard(cardId, { [property]: value });
  },

  /**
   * Increment a numeric card property
   * @param {string|number} cardId - Card ID
   * @param {string} property - Property name
   * @param {number} amount - Amount to add
   * @returns {Object|null} Updated card or null if not found
   */
  incrementCardProperty(cardId, property, amount) {
    return this.updateCard(cardId, card => {
      const current = parseFloat(card[property]) || 0;
      card[property] = (current + amount).toFixed(8);
    });
  }
};

export const createCardLogic = {
      
  data () {
    return {
      createCardDialog: false,
      newCardName: '',
      subCards: [],
      contractAddress: 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw', // dummy
      hasOrderedPhysicalCard: false,
      CardStorage, // Expose CardStorage utilities to components
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

    // Dark mode computed properties for classes
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'
    },
    
    textColorGreyLight () {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'
    },
    
    bgColor () {
      return this.$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'
    },

  },

  methods: {
    capitalizeFirst (str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    formatContractAddress(address) {
      if (!address) return ''
      const addr = typeof address === 'object' ? address.contractAddress : address
      if (!addr) return ''
      const str = String(addr)
      if (str.length <= 9) return str
      return str.slice(0, 16) + '...' + str.slice(-5)
    },

    checkExistingCards () {
      const cards = CardStorage.getCards();

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
      this.subCards = CardStorage.getCards();
    },
    
    async handleCreateCard(){
      if(!this.newCardName){
        this.notifyError('Please enter a Card name')
        return
      }

      this.$q.loading.show({
        message: 'Creating card on blockchain...'
      })

      try {
        const capitalizedName = this.capitalizeFirst(this.newCardName)
        
        // Initialize Card with wallet and services
        const card = await Card.createInitialized({})
        
        // Create the card on blockchain
        await card.create(capitalizedName)
        
        // Save card data to localStorage for UI reference
        const cardData = {
          id: card.raw?.id,
          uid: card.raw?.uid,
          raw: card.raw,
          balance: '0.00',
          status: 'Active',
          contractAddress: card.raw?.contract_id || this.contractAddress
        }
        
        CardStorage.createCard(cardData);
        
        this.notifySuccess('Card created successfully on blockchain!')
        
        // reset UI state and redirect
        this.createCardDialog = false
        this.newCardName = ''
        this.$router.push({name: 'stacked-cards'})
        
      } catch (error) {
        console.error('Card creation failed:', error)
        this.notifyError(error.message || 'Failed to create card on blockchain')
      } finally {
        this.$q.loading.hide()
      }
    },

    openCreateCardDialog(){
      this.newCardName = ''
      this.createCardDialog = true
    },

    // UI test only, pulls from browser memory
    fetchCards () {
      this.subCards = CardStorage.getCards();
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

    // Notification helper methods
    notifySuccess(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'positive',
        icon: opts.icon || 'check',
        position: opts.position || 'top',
        timeout: opts.timeout || 2000,
        ...opts
      })
    },

    notifyError(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'negative',
        icon: opts.icon || 'error',
        position: opts.position || 'top',
        timeout: opts.timeout || 3000,
        ...opts
      })
    },

    notifyWarning(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'warning',
        icon: opts.icon || 'warning',
        position: opts.position || 'top',
        timeout: opts.timeout || 3000,
        ...opts
      })
    },

    notifyInfo(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'info',
        icon: opts.icon || 'info',
        position: opts.position || 'top',
        timeout: opts.timeout || 2000,
        ...opts
      })
    },

  }
}
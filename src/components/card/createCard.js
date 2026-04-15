
import { loadCardUser } from 'src/services/card/user';
import { getMerchantList } from 'src/services/card/merchants';

// CardStorage utility for localStorage CRUD operations - used for UI state persistence
// NOTE: Keeping 'mock_subcards' for backward compatibility with existing cards
const STORAGE_KEY = 'mock_subcards';

export const CardStorage = {
  /**
   * Normalize card balance to 4 decimal places
   * @param {string|number} balance - Raw balance value
   * @returns {string} Formatted balance with 4 decimal places
   */
  normalizeBalance(balance) {
    if (!balance || balance === '0' || balance === 0) return '0.0000'
    const num = parseFloat(balance)
    if (isNaN(num)) return '0.0000'
    return num.toFixed(4)
  },

  /**
   * Get all cards from localStorage
   * @returns {Array} Array of card objects
   */
  getCards() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const cards = JSON.parse(saved);
    // Normalize all card balances to 4 decimal places
    return cards.map(card => ({
      ...card,
      balance: this.normalizeBalance(card.balance)
    }));
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
};

/**
 * Base card logic mixin - contains reusable utilities and methods
 * shared across card components
 */
export const createCardLogic = {
  setup() {
    return {}
  },

  data() {
    return {
      subCards: [],
      CardStorage, // Expose CardStorage utilities to components
      contractAddress: 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw', // Default contract address
    }
  },

  computed: {
    heroStyle() {
      return {
        background: 'linear-gradient(135deg, #027be3 0%, #26a69a 50%, #9c27b0 100%)',
        borderRadius: '24px',
        minHeight: '500px',
        width: '100%',
        maxWidth: '1100px',
        overflow: 'hidden'
      }
    },

    // Dark mode computed properties for UI classes
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-grey-10'
    },
    
    textColorGrey() {
      return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'
    },
    
    textColorGreyLight() {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'
    },
    
    bgColor() {
      return this.$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'
    }
  },

  methods: {
    loadCardUser,
    getMerchantList,

    /**
     * Fetch cards for the current user and update local state
     */
    async getCards() {
      const cardUser = await this.loadCardUser()
      console.log('Card User loaded:', cardUser)
      const cards = await cardUser.fetchCards()
      this.subCards = cards
      console.log('Fetched Cards:', cards)
      return cards
    },

    /**
     * Refresh merchant list from API
     * Note: This fetches ALL verified merchants without location filtering
     * For location-based merchant list, use manageAuthNFTs.vue instead
     */
    async refreshMerchants() {
      // This is a base implementation - components can override
      try {
        const data = await getMerchantList({ limit: 0, offset: 0 })
        console.log('Merchants loaded:', data.results?.length || 0, 'merchants')
        return data.results || []
      }
      catch (error) {
        console.error("Error fetching merchants: ", error)
        return []
      }
    },

    /**
     * Fetch cards from localStorage (UI testing mode)
     * Updates this.subCards with the stored cards
     */
    fetchCards() {
      this.subCards = CardStorage.getCards();
    },

    /**
     * Helper method to parse satoshis needed from error message
     */
    parseSatoshisNeeded(message) {
      const patterns = [
        /(\d+)\s+satoshis\s+needed/i,
        /needed\s*\((\d+)\)/i
      ];

      for (const pattern of patterns) {
        const match = message.match(pattern)
        if (match) return Number(match[1])
      }

      return null;
    },

    // Helper methods - centralized for consistent UX
    capitalizeFirst(str) {
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

    formatBalance(balance) {
      if (!balance || balance === '0' || balance === 0) return '0.0000'
      const num = parseFloat(balance)
      if (isNaN(num)) return '0.0000'
      return num.toFixed(4)
    },

    checkExistingCards() {
      // In production, this checks backend. For now, uses localStorage as cache
      const cards = CardStorage.getCards();

      // if user has existing cards and we are at the cards home page, redirect to stackedCards.vue
      if (cards.length > 0 && this.$route.name === 'app-card'){
        this.$router.push({ name: 'card-list' })
      }
    },

    navigateToCardDetails(card, tab = 'transactions') {
      this.$router.push({
        name: 'card-details',
        params: { 
          id: card.id
        },
        query: {
          tab: tab
        }
      })
    },

    // Notification helper methods - centralized for consistent UX
    notifySuccess(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'positive',
        icon: opts.icon || 'check',
        position: opts.position || 'top',
        timeout: opts.timeout || 1500,
        ...opts
      })
    },

    notifyError(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'negative',
        icon: opts.icon || 'error',
        position: opts.position || 'top',
        timeout: opts.timeout || 2000,
        ...opts
      })
    },

    notifyWarning(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'warning',
        icon: opts.icon || 'warning',
        position: opts.position || 'top',
        timeout: opts.timeout || 2000,
        ...opts
      })
    },

    notifyInfo(message, opts = {}) {
      this.$q.notify({
        message,
        color: 'info',
        icon: opts.icon || 'info',
        position: opts.position || 'top',
        timeout: opts.timeout || 1500,
        ...opts
      })
    },
  }
}

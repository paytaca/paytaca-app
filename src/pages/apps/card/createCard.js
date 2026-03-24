
import Card from 'src/services/card/card.js';
import { loadCardUser, fetchCardByIdentifier, getAuthToken } from 'src/services/card/user';
import { getMerchantList } from 'src/services/card/merchants';

// CardStorage utility for localStorage CRUD operations - used for UI state persistence
const STORAGE_KEY = 'card_ui_state';

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
};

export const createCardLogic = {
      
    setup () {
      // Return reactive references that will be populated asynchronously
      return {}
    },

    data () {
      return {
        createCardDialog: false,
        subCards: [],
        contractAddress: 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw', // dummy
        CardStorage, // Expose CardStorage utilities to components
        hasOrderedPhysicalCard: false,
        // Merchant data - will be populated from real API
        merchantList: [],
        merchantsLoading: false,
        // For inputs
        newCardName: '',
        // Cash In
        showCashInDialog: false, 
        selectedCurrency: 'PHP',
        // Spend Limit
        showSpendLimitDialog: false,    
        // Merchants - in managing auth nft
        showManageAuthNFTdialog: false,
        merchantSearch: '',
        selectedMerchants: '',
        genericAuthEnabled: false,
      }
    },
    
    async mounted () {
      console.log("GO!")
      this.$nextTick(() => {
        this.initMap()
      })
      
      try {
        await this.getCards()
        const card = this.subCards[0]
        const merchants = await getMerchantList()
        console.log('Merchants fetched:', merchants)
        const merchant = merchants.results[0]
        console.log('merchant:', merchant)
        // const spendResult = await this.spend(card, merchant, 1000)
        // console.log('spendResult:', spendResult)
        await this.connectToWebsocket()
      } catch (error) {
        console.error('Error during mounted lifecycle:', error.response || error)
      }
    },

    computed: {
      cardOptions () {
        return this.subCards.map(card => ({
          label: card.name,
          value: card.id
        }))
      },

      filteredTransactions () {
        // filter by search text
        let results = this.transactions.filter(merch => {
          if (!this.transactionSearch) return true
          
          return merch.name.toLowerCase().includes(this.transactionSearch.toLowerCase())
        })

        // sort the filtered results
        return [...results].sort((a, b) => {
          let modifier = this.sortOrder === 'desc' ? -1 : 1

          if (this.sortKey === 'amount') {
            return (a.amount - b.amount) * modifier
          }

          if (this.sortKey === 'date') {
            // Date sort (converts strings to timestamp for comparison)
            return (new Date(a.date) - new Date(b.date)) * modifier
          }

          return 0
        })
      },

      allMerchants () {
        // Return the merchant list fetched from API
        return this.merchantList || []
      },

      filteredMerchants () {
        const search = this.merchantSearch.toLowerCase().trim()
        if (!search) return this.allMerchants

        return this.allMerchants.filter(merchant => {
          const nameMatch = merchant.name && merchant.name.toLowerCase().includes(search)
          const addressMatch = merchant.address && merchant.address.toLowerCase().includes(search)
          return nameMatch || addressMatch
        })
      },

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

      walletBalance() {
        const asset = this.$store.getters['assets/getAssets'][0]
        return asset?.spendable || 0
      },

      // Dark mode computed properties for UI classes
      textColor () {
        return this.$q.dark.isActive ? 'text-white' : 'text-grey-10'
      },
      
      textColorGrey () {
        return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'
      },
      
      textColorGreyLight () {
        return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-6'
      },
      
      bgColor () {
        return this.$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'
      }
    },

    beforeUnmount() {
      console.log('Component is about to be unmounted. Cleaning up...')
      if (this.ws) {
        this.ws.close()
      }
    },

    methods: {
      loadCardUser,

      // Websocket connection to listen for tag scans in real-time. 
      // TODO: move this to Paytaca POS app, this is only here for testing purposes
      async connectToWebsocket() {
        const cardUser = await loadCardUser()
        const walletHash = cardUser.raw.wallet_hash
        const authToken = await getAuthToken()

        const wsUrl = `ws://localhost:8000/ws/tag?wallet_hash=${walletHash}&token=${authToken}`
        console.log('Connecting to WebSocket at:', wsUrl)
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log("WebSocket connection established");
          this.ws.send("start_listening")
          this.ws.send("status")
          setTimeout(() => {
            this.ws.send("stop_listening")
          }, 5000)
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received tag data:", data);
          } catch (e) {
            console.log("Received non-JSON message:", event.data);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket closed:", event.reason);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      },
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

      // Merchant methods - fetch real merchant data from API
      async refreshMerchants() {
        this.merchantsLoading = true
        try {
          const data = await getMerchantList({ limit: 100, page: 1})
          this.merchantList = data.results || data || []
          console.log('Merchants loaded:', this.merchantList)
        }
        catch (error) {
          console.error("Error fetching merchants: ", error)
          this.merchantList = []
        }
        finally {
          this.merchantsLoading = false
        }
      },

      addMerchantToList (merchant) {
        // check if already added to prevent duplicates
        const exists = this.selectedMerchants.some(m => m.id === merchant.id)

        if (!exists) {
          this.selectedMerchants.push({
            ...merchant,
            isEnabled: false // default merchant toggle is disabled
          })
        }

        // clear search to hide dropdown results
        this.merchantSearch = ''
      },

      removeMerchant (index) {
        this.selectedMerchants.splice(index, 1)
      },

      /**
       * 
       * Mutate Global Auth Token
       * @param {Card} card - Card instance
       * @param {Object} mutation - mutation parameters
       * @param mutation.authorize {boolean} - true to authorize, false to deauthorize
       * @param mutation.spendLimitSats {number} - (optional) spend limit in satoshis
       * @param mutation.broadcast {boolean} - (optional) whether to broadcast the transaction, default: true
       */
      async mutateGlobalAuthToken(card, mutation) {
        if (!mutation) {
          console.error('Mutation parameter is required')
          return
        }
        try {
          const result = await card.mutateGlobalAuthToken(mutation)
          console.log('Mutate Global Auth Token result:', result)
        } catch(error) {
          const satsNeeded = this.parseSatoshisNeeded(error.message)
          if (satsNeeded !== null) {
            console.error("Insufficient funds in contract:", error.message)
          } else {
            console.error(error)
          }
        }
      },

      /**
       * Mutate Merchant Auth Token
       * @param card 
       * @param mutation 
       * @param mutation.authorize {boolean} - true to authorize, false to deauthorize
       * @param mutation.merchant {Object} - merchant details {id, pubkey}
       * @param mutation.spendLimitSats {number} - (optional) spend limit in satoshis
       * @param mutation.broadcast {boolean} - (optional) whether to broadcast the transaction, default: true
       */
      async mutateMerchantAuthToken(card, mutation) {
        try {
          const result = await card.mutateMerchantAuthToken(mutation)
          console.log('Mutate Merchant Auth Token result:', result)
        } catch(error) {
          const satsNeeded = this.parseSatoshisNeeded(error.message)
          if (satsNeeded !== null) {
            console.error("Insufficient funds in contract:", error.message)
          } else {
            console.error(error)
          }
        }
      },

      /**
       * Mint Merchant Auth Token
       * @param {Card} card - Card instance
       * @param {Object} merchant - merchant details {id, pubkey}
       */
      async mintMerchantAuthToken(card, merchant) {
        const mintParams = {
          authorized: true,
          merchant: {
            id: merchant.id,
            pubkey: merchant.pubkey
          }
        }
        const { mintResult, issueResult } = await card.issueMerchantAuthToken(mintParams)
        console.log('Mint Result:', mintResult)
        console.log('Issue Result:', issueResult)
      },

      /**
       * Delete this later, this function belongs in the paytaca POS app.
       * This is here only for testing purposes
       */
      async spend(card, merchant, amountSats = 1000) {
        console.log('card:', card)
        const proof = {
          // uid: card.uid,
          mac: "a3ff3b94857b1eafffff4d4fc68e7379", // dummy
          counter: 1,
        }
        const spendResult = await card.spend(
          merchant.id,
          merchant.receiving_address,
          amountSats,
          proof
        )
        console.log('spendResult:', spendResult)
      },

      /**
       * Sweep UTXOs from card back to wallet
       * @param card {Card} - Card instance
       */
      async sweep(card) {
        const result = await card.sweep()
        console.log('sweep result:', result)

        await card.getUtxos().then(utxos => {
          console.log('Card UTXOs (after sweep):', utxos)
        })
      },

      /**
       * Burn a Merchant Auth Token to revoke authorization for a specific merchant
       * @param card {Card} - Card instance
       * @param merchant {Object} - merchant details {id, pubkey}
       * @param opts {Object} - options {retryOnFundFailure: boolean}
       */
      async burnMerchantAuthToken(card, merchant, opts = { retryOnFundFailure: true }) {
        try {
          const cardUser = await this.loadCardUser()
          const tokenId = card.raw.category
          const result = await cardUser.burnMerchantAuthToken(tokenId, merchant.id, merchant.pubkey)
          return result
        } catch (error) {
          console.error('Error burning merchant auth token:', error)
          if (opts?.retryOnFundFailure)
            await this.createFundingUtxoAndCallback(error, this.burnMerchantAuthToken)
        }
      },

      /**
       * Burn a Global Auth Token to revoke all authorizations
       * @param card {Card} - Card instance
       * @param opts {Object} - options {retryOnFundFailure: boolean}
       */
      async burnGlobalAuthToken(card, opts = { retryOnFundFailure: true }) {
        try {
          const cardUser = await this.loadCardUser()
          const tokenId = card.raw.category
          const result = await cardUser.burnGlobalAuthToken(tokenId)
          return result
        } catch (error) {
          console.error('Error burning global auth token:', error)
          if (opts?.retryOnFundFailure)
            await this.createFundingUtxoAndCallback(error, this.burnGlobalAuthToken)
        }
      },

      async createFundingUtxoAndCallback(error, operationCallback) {
        console.error(error)
        const satsNeeded = this.parseSatoshisNeeded(error.message)
        console.log('Satoshis needed for operation:', satsNeeded)
        if (satsNeeded !== null) {
          const cardUser = await this.loadCardUser()
          const result = await cardUser.wallet.createFundingUtxo(satsNeeded)
          console.log('Funding UTXO created:', result)
          console.log('Retrying operation...')
          await operationCallback({retryOnFundFailure: false})
        }
      },

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

      // Open dialog
      openCreateCardDialog(){
        this.newCardName = ''
        this.createCardDialog = true
      },

      async handleCreateCard(){
        if(!this.newCardName){
          this.notifyError('Please enter a Card name')
          return
        }

        // check - one card per user/wallet
        if (this.subCards && this.subCards.length >= 1) {
          this.q.notify({
            message: 'You already have an active card. Only one card is allowed per wallet.',
            color: 'warning',
            icon: 'warning'
          })
          return
        }

        try {
          this.$q.loading.show({ message: 'Minting your card on the blockchain...' })

          // initializing the card helper
          const card = await Card.createInitialized()
          const estimatedFees = card.estimateCreateCardSatsRequirement()
          const balanceSats = BigInt(Math.floor(this.walletBalance * 1e8))
          if (balanceSats < estimatedFees) {
            this.$q.notify({
              message: `Insufficient balance. You need at least ${Number(estimatedFees) / 1e8} BCH to create a card.`,
              color: 'negative'
            })
            return
          }

          await card.create(this.newCardName)
          this.createCardDialog = false; // close dialog

          this.$q.notify({
            message: 'Card created successfully!',
            color: 'positive',
          });
          this.getCards() // refresh cards to get real data from blockchain
        } catch (error) {
          console.error('Final Workflow Error: ', error)
          this.notifyError('Failed to create card. Please check your balance.')
        } finally {
          this.$q.loading.hide()
        }
      },
      
      notifyStatus(name, action, color, icon){
        this.$q.notify({
          message: `Card "${name}" has been ${action}`,
          color: color,
          icon: icon
        })
      },

      // Helper methods from noBackend.js - added for UI component compatibility
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
        // In production, this checks backend. For now, uses localStorage as cache
        const cards = CardStorage.getCards();

        // if user has existing cards and we are at the cards home page, redirect to stackedCards.vue
        if (cards.length > 0 && this.$route.name === 'app-card'){
          this.$router.push({ name: 'stacked-cards'})
        }
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
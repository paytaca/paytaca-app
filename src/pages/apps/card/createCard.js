
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
//import { createCard } from 'src/services/card/backend/api';
import HeaderNav from 'components/header-nav'
import Card from 'src/services/card/card.js';
import { loadCardUser } from 'src/services/card/user';
import { selectedCurrency } from 'src/store/market/getters';
import { getMerchantList } from 'src/services/card/merchants';

  export const createCardLogic = {
      
    setup () {
      const merchantList = getMerchantList()
      return {merchantList}
    },

    components: {
      MultiWalletDropdown,
    },

    data() {
      return {
        createCardDialog: false,
        subCards: [],
        contractAddress: 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw', // dummy
        // For inputs
        newCardName: '',
        // View card dialog
        viewCardDialog: false,
        selectedCard: null,
        // Menu state
        cardMenu: {
          visible: false,
          anchorOrigin: 'top right',
          selfOrigin: 'top right',
          card: null
        },
        // Cash In
        showCashInDialog: false, 
        tempAmount: 0,
        activeCard: null,
        cashInamount: null,
        selectedCurrency: 'PHP',
        // Transaction History
        showTransactionHistoryDialog: false,
        showSpendLimitDialog: false,
        tempSpendLimitAmount: 0,
        isSweep: false,
        // Order form
        showForm: false,
        map: null,
        marker: null,
        formData: {
          fullName: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        },
        // Merchants - in managing auth nft
        showManageAuthNFTdialog: false,
        merchantSearch: '',
        selectedMerchants: '',
        genericAuthEnabled: false,
        allMerchants: [],
        // Card Replacement
        cardReplacementDialog: false,
        selectedCardToReplace: null,
      }
    },
    
    async mounted () {
      console.log("GO!")
      this.$nextTick(() => {
        this.initMap()
      })
      
      try {
        await this.getCards()
      } catch (error) {
        console.error('Error during mounted lifecycle:', error.response || error)
      }
    },

    computed: {
      allMerchants () {
        return this.merchantList.merchants
      },

      filteredMerchants () {
        const search = this.merchantSearch.toLowerCase().trim()
        if (!search) return []

        return this.allMerchants.filter(merchant => {
          merchant.name.toLowerCase().includes(search) ||
          merchant.address.toLowerCase.includes(search)
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
        const cards = await cardUser.fetchCards()
        this.subCards = cards
        console.log('Fetched Cards:', cards)
        return cards
      },

      // Merchant methods
      async refreshMerchants() {
        try {
          const data = await this.getMerchantList({ limit: 100, page: 1})
          this.allMerchants = data.results || data
        }
        catch (error) {
          console.error("Error fetching merchants: ", error)
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
      async spend(amountSats = 1000) {
        const card = await this.getCard()
        const toAddress = card.wallet.address()
        const selectedMerchant = await this.getMerchant()
        const spendResult = await card.spend(
          selectedMerchant.id,
          toAddress,
          amountSats,
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
          const match = message.match(pattern);
          if (match) return Number(match[1]);
        }

        return null;
      },

      // Open dialog
      openCreateCardDialog(){
        this.newCardName = '';
        this.createCardDialog = true;
      },

      cardReplacement(){
        this.cardReplacementDialog = true
      },

      toggleSelection (card) {
        // if clicking the same card, deselect it
        // otherwise, select the new card
        if (this.selectedCardToReplace && this.selectedCardToReplace.id === card.id){
          this.selectedCardToReplace = null
        }
        else {
          this.selectedCardToReplace = card
        }
        this.$q.notify({
          message: `Selected card: ${this.selectedCardToReplace ? this.selectedCardToReplace.name : 'None'}`
        })
      },

      isCardSelected (card) {
        return this.selectedCardToReplace && this.selectedCardToReplace.name === card.name
      },

      async handleCardReplacement () {
        if(!this.selectedCardToReplace){
          this.$q.notify({
            message: 'Please select a card to replace first',
            color: 'warning'
          })
          this.cardReplacementDialog = true
          return
        }

        const cardToReplace = this.selectedCardToReplace

        this.$q.loading.show({
          message: `Deactivating ${cardToReplace.name}...`
        })

        try{
          // card.deactivateCard(id)
          // await card.replaceMerchantCard(cardToReplace.id)

          await new Promise(resolve => setTimeout(resolve, 1500))
          this.subCards = this.subCards.filter(c => c.id !== cardToReplace.id)

          // Success
          this.$q.notify({
            message: `${cardToReplace.name} has been successfully deactivated.`,
            color: 'positive',
            icon: 'check_circle'
          })

          // Open the 'order physical card' form automatically
          // reset selection
          this.selectedCardToReplace = null
          this.cardReplacementDialog = false

          this.showForm = true
        } catch(error){
          console.error('Replacement failed: ', error)
          this.$q.notify({
            message: 'Could not process replacement. Please try again.',
            color: 'negative'
          })
        } finally {
          this.$q.loading.hide()
        }
      },

      formatContractAddress(card) {
        const contractAddressLength = this.contractAddress.length
        const formatted = this.contractAddress.substring(0, 4) + "..." + this.contractAddress.substring(contractAddressLength - 5, contractAddressLength)
        return formatted
      },
      
      async handleCreateCard(){
        if(!this.newCardName){
          this.$q.notify({message: 'Please enter a Card name', color: 'negative'})
          return;
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
          this.$q.notify({
            message: 'Failed to create card. Please check your balance.',
            color: 'negative'
          })
        } finally {
          this.$q.loading.hide()
        }
      },

      editCardName(card){
        this.$q.dialog({
          title: 'Edit Alias',
          message: 'Maximum of 10 characters allowed',
          prompt: {
            model: card.name,
            type: 'text',
            attrs: {
              maxLength: 10, 
            },
            isValid: val => val.length <= 10 && val.length > 0
          },
          cancel: true,
          persistent: true
        }).onOk(data => {
          if (data.length <= 10){
            card.name = data;
          }
        })
      },

      viewCard(card){
        this.selectedCard = card;
        this.viewCardDialog = true;
      },

      copyToClipboard(text){
        navigator.clipboard.writeText(text).then(() => {
          this.$q.notify({
            message: 'Copied to clipboard',
            color: 'positive',
            position: 'top'
          });
        }).catch(() => {
          this.$q.notify({
            message: 'Failed to copy',
            color: 'negative',
            position: 'top'
          });
        });
      },

      handleCashIn(card) {   
        this.viewCardDialog = false; 
        this.activeCard = card;
        this.tempAmount = 0;
        this.showCashInDialog = true;
      },

      confirmCashIn() {
        const amount = parseFloat(this.tempAmount);

        if (!amount || amount <= 0) {
          this.$q.notify({
            message: 'Please enter a valid amount',
            color: 'negative',
            icon: 'warning'
          });
          return;
        }

        this.cashInAmount = amount;
        this.showCashInDialog = false;
        
        console.log(`Cashing in ${this.cashInAmount} ${this.selectedCurrency} for card:`, this.activeCard);
        
        // Call actual Cash in function
      },

      openCardMenu(evt, card){
        this.cardMenu.card = card;
        this.cardMenu.visible = true;
        
        this.$nextTick(() => {
          this.cardMenu.anchorOrigin = 'top right';
          this.cardMenu.selfOrigin = 'top right';
        })
        
      },

      manageAuthNFTs(card) {
        this.selectedCard = card;
        this.merchantSearch = '';
        this.genericAuthEnabled = card.hasGenericAuth || false;

        this.showManageAuthNFTdialog = true;
        this.cardMenu.visible = false;
        this.$q.notify({
          message: `Managing Auth NFTs for ${card.name}`,
          color: 'primary',
          icon: 'settings'
        })
      },

      viewTransactionHistory(card) {
        this.selectedCard = card;
        this.showTransactionHistoryDialog = true;
        this.transactionSearch = '';
      },

      editSpendLimit(card){
        this.selectedCard = card;
        this.tempSpendLimitAmount = card.spendLimitAmount || 0
        this.showSpendLimitDialog = true;
      },

      async updateSpendLimit(){
        const amount = parseFloat(this.tempSpendLimitAmount)

        if(isNaN(amount) || amount <= 0){
          this.$q.notify({
            message: 'Please enter a valid spend limit amount',
            color: 'negative',
            icon: 'warning'
          })
          return
        }

        // Check against balance
        if(amount > this.selectedCard.balance){
          this.$q.notify({
            message: 'Spend limit cannot exceed card balance',
            color: 'negative',
            icon: 'warning'
          })
          return
        }

        // if valid, update the card
        this.selectedCard.spendLimitAmount = amount
        console.log(`Set spend limit of ${amount} for card: `, this.selectedCard)
        this.showSpendLimitDialog = false
        this.$q.notify({
          message: 'Spend limit updated successfully',
          color: 'positive'
        })
      },

      toggleLock(card) {
        const isLocked = card.status === 'Locked'

        this.$q.dialog({
          title: isLocked ? 'Unlock Card' : 'Lock Card',
          message: isLocked
            ? `Are you sure you want unlock "${card.name}"? This will enable all transactions.`
            : `Are you sure you want to lock "${card.name}"? This will disable all transactions.`,
          cancel: true,
          persistent: true,
          ok: {
            label: isLocked ? 'Unlock now' : 'Proceed',
            color: isLocked? 'positive' : 'negative',
            unelevated: true
          },
          cancel: {
            label: 'Cancel',
            flat: true,
            color: 'grey'
          }
        }).onOk(() => {
          if(isLocked){
            card.status = 'Active'
            this.notifyStatus(card.name, 'unlocked', 'positive', 'lock_open')
          }
          else{
            this.$q.dialog({
              message: `Do you want to sweep funds? This will send all ${card.name}'s funds to your wallet.'`,
              cancel: true, 
              persistent: true,
              ok: {
                label: 'Sweep',
                color: 'positive',
              },
              cancel: {
                label: 'Cancel',
                flat: true,
                color: 'grey',
              }         
            }).onOk(() => {
                this.isSweep = true;
                card.balance = 0;
            })
            card.status = 'Locked'
            this.notifyStatus(card.name, 'locked', 'negative', 'lock')
          }
        }).onCancel(() => {
          console.log('User cancelled the lock action.')
        })
      },

      notifyStatus(name, action, color, icon){
        this.$q.notify({
          message: `Card "${name}" has been ${action}`,
          color: color,
          icon: icon
        })
      },

      async onSubmit(){
        this.$q.loading.show({message: 'Processing your order...'})

        try {
          await new Promise(resolve => setTimeout(resolve, 2000))

          this.$q.notify({
            color: 'positive',
            message: 'Physical card order placed!',
            icon: 'check'
          })

          this.resetForm()
        }
        catch (error){
          this.$q.notify({
            color: 'negative',
            message: 'Something went wrong'
          })
        } 
        finally {
          this.$q.loading.hide()
        }
      },

      resetForm(){
        this.formData = {
          fullName: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        }

        this.$nextTick(() => {
          if (this.$refs.orderForm){
            this.$refs.orderForm.resetValidation()
          }
        })
      },

      initMap () {
        // check if container exists
        if (!this.$refs.mapContainer) return

        // initialize map
        this.map = L.map(this.$refs.mapContainer).setView([7.123, 124.845], 13)

        // OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map)

        // draggable marker
        this.marker = L.marker([7.123, 124.845], {draggable: true}).addTo(this.map)

        // listener - when user stops dragging, fetch address
        this.marker.on('dragend', this.handleMarkerDrag)
      },

      async handleMarkerDrag (event) {
        const { lat, lng } = event.target.getLatLng()

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          )
          const data = await response.json()
          const addr = data.address

          this.$q.notify({
            message: `Full address data: ${addr}`,
            color: 'warning'
          })

          // response mapping to formData
          this.formData = {
            ...this.formData,
            city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
            state: addr.state || addr.region || addr.province || '',
            zip: addr.zip || addr.postcode || '',
            country: addr.country || '',
          }
          
          this.$q.notify({
            message: `Location set to ${this.formData.city}`,
            icon: 'check', 
            color: 'positive'
          })
        }
        catch (error) {
          this.$q.notify({
            message: 'Geocoding failed',
            color: 'negative'
          })
        }
      },

      async activateForm () {
        this.showForm = true
        await this.$nextTick()

        if (!this.map) {
          this.initMap()
        }
        else {
          setTimeout(() => {
            this.map.invalidateSize()
          }, 300)
        }
      },

    }

    

  }
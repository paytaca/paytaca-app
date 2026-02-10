
 
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
//import { createCard } from 'src/services/card/backend/api';
import HeaderNav from 'components/header-nav'
import Card from 'src/services/card/card.js';
import { loadCardUser } from 'src/services/card/auth';
import { selectedCurrency } from 'src/store/market/getters';

  export const createCardLogic = {
    
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
        // Manage Auth NFT
        showManageAuthNFTdialog: false,
        genericAuthEnabled: false,
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
        // Merchants
        merchantSearch: '',
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
        // const cardUser = await loadCardUser()
        // const cards = await cardUser.fetchCards()
        // if (cards.length === 0) {
        //   console.warn('No cards found for the user.')
        //   return
        // }

        // const card = cards[cards.length - 1] // get the last card for testing
        // console.log('Loaded Cards:', cards)
        // console.log('Using Card:', card)

        // await card.getAuthNfts().then(authNfts => {
        //   console.log('Card Auth NFTs:', authNfts)
        // })

        // const merchants = await card.getMerchantList()
        // if (merchants.results.length === 0) {
        //   console.warn('No merchants found in the merchant list.')
        //   return
        // }
        
        // for merchant search in Manage Auth NFT dialog
        // if (merchants && merchants.results) {
        //   this.allMerchants = merchants.results
        // }

        // const selectedMerchant = merchants.results[0] // for testing, pick the first merchant

        // console.log('Merchants:', merchants)
        // console.log('Selected Merchant:', selectedMerchant)
        //---------------------------------------------------
        // // Example: Minting and issuing merchant auth token
        // const mintParams = {
        //   authorized: true,
        //   merchant: {
        //     id: selectedMerchant.id,
        //     pubkey: selectedMerchant.pubkey
        //   }
        // }
        // const { mintResult, issueResult } = await card.issueMerchantAuthToken(mintParams)
        // console.log('Mint Result:', mintResult)
        // console.log('Issue Result:', issueResult)

        // // Example: Mutate global auth token 
        // // (needs contract funded with some BCH for gas fees)
        // await card.mutateGlobalAuthToken({
        //   authorize: false,
        //   expirationBlock: null, // Optional: can omit if not changing
        //   spendLimitSats: 50000, // Optional: can omit if not changing
        //   broadcast: false // Change to true to broadcast to blockchain
        // })

        // // Example: Mutate merchant auth token 
        // // (needs contract funded with some BCH for gas fees)
        // await card.mutateMerchantAuthToken({
        //   authorize: false,
        //   merchant: {
        //     id: selectedMerchant.id,
        //     pubkey: selectedMerchant.pubkey
        //   },
        //   expirationBlock: null, // Optional: can omit if not changing
        //   spendLimitSats: 50000, // Optional: can omit if not changing
        //   broadcast: false // Change to true to broadcast to blockchain
        // })
        // ------------------------------------------
        // await card.getAuthNfts().then(authNfts => {
        //   console.log('Card Auth NFTs after mutation:', authNfts)
        // })

      } catch (error) {
        // console.error('Error during mounted lifecycle:', error)
      }

    },

    computed: {
      // merchant search in manage auth nfts
      filteredMerchants () {
        if (!this.merchantSearch) return []

        const search = this.merchantSearch.toLowerCase()
        return this.allMerchants.filter(merchant => {
          return merchant.name.toLowerCase().includes(search)
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
      }
    },

    methods: {
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
          // const card = await Card.createInitialized()
          // // execute workflow from card.js
          // await card.create()
          // const tokenId = card.tokenId

          // // load user from card/auth
          // const user = await loadCardUser()
          // const cards = await user.fetchCards()
          // console.log('Card User: ', user)

          // find the specific card we just created in the list
          // const mintedCard = cards.find(c => c.tokenId === tokenId)
          // let actualBalance = 0
          // let contractAddress = 'Pending'

          // if (mintedCard) {
          //   // fetch real balance
          //   const tokenUtxos = await mintedCard.getTokenUtxos()
          //   // calculate sum of token amounts in Utxos
          //   actualBalance = tokenUtxos.reduce((total, utxo) => {
          //     return total + Number(utxo.token.amount)
          //   }, 0)

          //   const contract = await mintedCard.getContract()
          //   contractAddress = contract.address
          // }

          // print and fetch info for each card
          // for(const cardItem of cards){
          //   const tokenUtxos = await cardItem.getTokenUtxos();
          //   const bchUtxos = await cardItem.getBchUtxos();
          //   const contract = await cardItem.getContract()

          //   console.log('=====Card Details=====')
          //   console.log('Card: ', cardItem);
          //   console.log('Card ID: ', cardItem.tokenId)
          //   console.log('Card tokenUtxos:', tokenUtxos);
          //   console.log('Card bchUtxos:', bchUtxos);
          //   console.log('Card contract:', contract);
          // }

          // Create new subcard object
          const newCard = {
            // id: result.tokenId,
            name: this.newCardName,
            // contractAddress: contractAddress,
            // balance: actualBalance,
            status: 'Active' // by default
          }

          // Update UI state ; Insert before the create card button
          this.subCards.push(newCard);
          this.createCardDialog = false; // close dialog
          this.$q.notify({
            message: `Card "${newCard.name}" created successfully!`,
            color: 'positive',
          });
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

          this.$q.dialog({
            title: 'Order confirmed',
            color: 'positive',
            message: 'You order has been placed. We will notify you once it is out for delivery.',
            icon: 'check',
            ok: {
              label: 'Got it',
              color: 'primary'
            },
            persistent: true
          }).onOk(() => {
            this.resetForm()
          })

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

        this.showForm = false
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

          // response mapping to formData
          this.formData = {
            ...this.formData,
            city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
            state: addr.state || addr.region || addr.province || '',
            zip: addr.zip || addr.postcode || '',
            country: addr.country || '',
          }
          
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


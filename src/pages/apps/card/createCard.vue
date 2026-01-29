<template>
  <q-layout>
  
    <div class="q-ml-l">
      <p class="text-primary text-weight-bold text-h5 text-center">Card Management</p>
    </div>
     
    <div>
      <MultiWalletDropdown></MultiWalletDropdown>
    </div>

    <transition
      appear
      enter-active-class="animated fadeIn"
      leave-active-class="animated fadeOut"
    >
      <div class="q-mt-lg q-ml-lg">
        
        <!-- Header -->
        <div class="text-h6 q-mb-md q-mt-md row items-center">
          <q-icon name="credit_card" class="q-mr-sm" color="primary" />
          My Cards
        </div>

        <!-- Cards Grid -->
        <div class="row q-col-gutter-md" style="max-width: 2500px; max-height: 300px;">
          <!-- Existing Subcards -->
            <div v-for="card in subCards" :key="card.id" class="col-12 col-sm-2">
              <q-card bordered flat class="bg-white full-height">
                <!-- Card header: Name + Icons -->
                <q-card-section class="row items-center justify-between q-pa-sm bg-blue-2">
                  <div class="text-weight-bold text-subtitle1 text-black ellipsis" style="max-width: 150px;">{{ card.name }}</div>
                  
                  <div class="row items-center q-gutter-sm">
                    <!-- Edit Icon -->
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      size="sm"
                      color="primary"
                      @click="editCardName(card)"
                    >
                      <q-tooltip>Edit Card Name</q-tooltip>
                    </q-btn>

                    <!-- View Icon -->
                     <q-btn
                        flat
                        dense
                        round
                        icon="visibility"
                        color="primary"
                        @click="viewCard(card)"
                     />
                    <!-- Triple Dot Icon -->
                     <q-btn
                        flat
                        dense
                        round
                        icon="more_vert"
                        color="primary"
                        @click="openCardMenu($event, card)"
                     >
                        <q-tooltip>Card Options</q-tooltip>
                        <!-- Card Options Menu -->
                        <q-menu
                            anchor="top right"
                            self="top right"
                            transition-show="scale"
                            transition-hide="scale"
                        >
                          <q-list padding style="min-width: 150px">
                              <q-item clickable v-ripple @click="manageAuthNFTs(card)">
                                <q-item-section>Manage Auth NFTs</q-item-section>
                              </q-item>

                              <q-item clickable v-ripple @click="viewTransactionHistory(card)">
                                <q-item-section>Transaction History</q-item-section>
                              </q-item>

                              <q-item clickable v-ripple @click="toggleLock(card)">
                                <q-item-section :class="card.status === 'Locked' ? 'text-positive' : 'text-negative'">
                                  {{ card.status === 'Locked' ? 'Unlock Card' : 'Lock Card' }}
                                </q-item-section>
                              </q-item>
                            </q-list>
                        </q-menu>
                      </q-btn>
                  </div>
                </q-card-section>

                <q-separator color="primary" size="1px"/>

                <!-- Card Info -->
                 <q-card-section>
                    <div class="text-caption text-grey">
                      Balance:
                      <span class="text-h5 text-black"> {{ card.balance.toLocalString() }} BCH</span>
                    </div>

                    <div class="text-caption text-grey">
                      Address:
                      <span class="text-caption text-black ellipsis"> 
                        {{ card.contractAddress ? formatContractAddress(card.contractAddress) : 'Fetching...' }} 
                      </span>
                    </div>

                    <div class>
                      <div class="text-caption text-weight-bold">Status:</div>
                      <q-badge
                        :color="card.status === 'Locked' ? 'negative' : 'positive'"
                        class="q-ml-xs"
                        :label="card.status || 'Active'"
                      />
                    </div>
                 </q-card-section>

              </q-card>
            </div>

            <!-- Create Card Button opens dialog -->
             <div class="col-12 col-sm-2">
                <q-card
                  bordered
                  flat
                  class="bg-grey-1 flex flex-center cursor-pointer full-height"
                  @click="openCreateCardDialog"
                >
                  <q-card-section class="text-center">
                    <q-icon
                      name="add_circle_outline"
                      size="48px"
                      color="primary"
                    />
                    <div class="text-caption q-mt-sm text-primary text-center">
                      Create Card
                    </div>
                  </q-card-section>
                </q-card>
             </div>

        </div>
      </div>
    </transition> 

    <!-- Order physical card form to be component -->
     <div class="q-pa-md" style="max-width: 800px;">
        <q-card flat bordered class="[$q.dark.isActive ? 'bg-grey-10' : 'bg-blue-1', order-card-container]">
          <q-card-section>
            <div class="row items-center q-col-gutter-md">

              <div class="col-12 col-md-5 text-center">
                <div class="text-h6 text-weight-bold q-mb-sm" :class="$q.dark.isActive ? 'text-blue-2' : 'text-primary'">
                  Order your physical card
                </div>
                <q-icon  
                  name="style"
                  size="100px"
                  :color="$q.dark.isActive ? 'blue-2' : 'primary'"
                  class="q-mb-md"
                />
              </div>

              <div class="col-12 col-md-7">
                <q-form ref="orderForm" @submit="onSubmit" class="q-gutter-y-sm">
                  <q-input 
                    outlined
                    :dark="$q.dark.isActive"
                    v-model="formData.fullname"
                    label="Full Name"
                    dense
                    lazy-rules
                    :rules="[val => !!val || 'Name is required']"
                  />

                  <div class="row q-col-gutter-sm">
                    <q-input 
                      outlined
                      :dark="$q.dark.isActive"
                      v-model="formData.city"
                      label="City"
                      class="col-6"
                      dense
                      lazy-rules
                      :rules="[val => !!val || 'City is required']"
                    />
                    <q-input
                      outlined
                      :dark="$q.dark.isActive"
                      v-model="formData.state"
                      label="State/Province"
                      class="col-6"
                      dense
                      lazy-rules
                      :rules="[val => !!val || 'State/Province is required']"
                    />
                    <q-input 
                      outlined
                      :dark="$q.dark.isActive"
                      v-model="formData.zip"
                      label="ZIP/Postal Code"
                      class="col-6"
                      dense
                      lazy-rules
                      :rules="[val => !!val || 'Zip code is required']"
                    />
                    <q-input
                      outlined
                      :dark="$q.dark.isActive"
                      v-model="formData.country"
                      label="Country"
                      class="col-6"
                      dense
                      lazy-rules
                      :rules="[val => !!val || 'Country is required']"
                    />
                  </div>

                  <div class="q-mt-md">
                    <q-btn 
                      label="Order Now"
                      :color="$q.dark.isActive ? 'blue-7' : 'blue-9'"
                      type="submit"
                      class="full-width text-bold"
                      unelevated
                    />
                  </div>

                  <div class="text-caption text-center q-mt-xs" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-8'">
                    Standard Shipping: 7-10 business days.
                  </div>

                </q-form>
              </div>

            </div>
          </q-card-section>

        </q-card>
     </div>
  </q-layout>

  <!-- CREATE CARD POP-UP BOX -->
  <q-dialog
    v-model="createCardDialog"
    persistent
    transition-show="fade"
    transition-hide="fade"
    backdrop-filter="blur(6px)"
  >
    <q-card
      class="create-card-dialog"
      flat
    >
      <!-- Dialog Header -->
       <q-card-section class="row items-center q-pb-sm">
          <div class="text-h6 text-weight-bold text-center">
            Create Card
          </div>

          <q-space />

          <q-btn 
            icon="close"
            flat
            round
            dense
            @click="createCardDialog = false"
          />

        </q-card-section>

       <q-separator />

       <!-- Dialog Content -->
       <q-card-section>
          <q-input 
            v-model="newCardName" 
            label="Card Name" 
            outlined 
            dense 
            hint="Max of 15 characters allowed"
            counter
            maxlength="15"
            :rules="[
              val => (val && val.length > 0) || 'Name is required',
              val => val.length <= 15 || 'Maximum 15 characters'
            ]"
          ></q-input>
       </q-card-section>

       <q-separator />

        <!-- Dialog Actions -->
        <q-card-actions align="right">
            <q-btn 
              flat
              label="Cancel"
              color="grey-7"
              @click="createCardDialog = false"
            />
            <q-btn 
              unelevated
              label="Create"
              color="primary"
              :disable="!newCardName || newCardName.length > 15"
              @click="handleCreateCard"
            />
         </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- VIEW CARD POP-UP -->
   <q-dialog
      v-model="viewCardDialog"
      persistent
      transition-show="fade"
      transition-hide="fade"
      backdrop-filter="blur(6px)"
   >
      <q-card class="view-card-dialog" flat>

        <!-- Dialog Header: Card Name -->
         <q-card-section class="row items-center q-pb-sm justify-between">
            <div class="text-h6 text-weight-bold text-center">
              {{ selectedCard?.name }}
            </div>

            <q-btn
              icon="close"
              flat
              round
              dense
              @click="viewCardDialog = false"
            />
         </q-card-section>

         <q-separator/>

         <!-- QR CODE -->
          <q-card-section class="q-pt-md q-pb-md flex flex-center">
              <qr-code 
                v-if="selectedCard"
                :text="selectedCard.contractAddress"
                :size="150"
              />
          </q-card-section>

          <!-- Contract Address with Copy Icon -->
           <q-card-section class="row justify-center items-center text-nowrap q-gutter-sm" style="letter-spacing: 1px;">
              <div class="text-white">{{ formatContractAddress(selectedCard)}}</div>
              <q-btn
                flat
                round
                dense
                icon="content_copy"
                @click="copyToClipboard(selectedCard.contractAddress)"
              />
           </q-card-section>

           <!-- Cash-in button -->
            <q-card-section class="row justify-center q-mt-md">
                <q-btn
                    label="Cash In"
                    color="primary"
                    unelevated
                    @click="handleCashIn(selectedCard)"
                  />
            </q-card-section>
      </q-card>
   </q-dialog>


   <!-- CASH IN POP UP -->
   <q-dialog v-model="showCashInDialog" persistent>
      <q-card style="min-width: 350px" class="br-15 q-pa-sm">
        <q-card-section>
          <div class="text-h6">Cash In</div>
        </q-card-section>

        <q-card-section class="row q-col-gutter-sm items-center">
          <div class="col-8">
            <q-input
              v-model.number="tempAmount"
              type="number"
              label="Amount"
              outlined
              dense
              autofocus
            />
          </div>
          
          <div class="col-4">
            <q-select
              v-model="selectedCurrency"
              :options="['PHP', 'BCH', 'satoshis']"
              outlined
              dense
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Confirm" @click="confirmCashIn" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Manage Auth NFT Pop-up -->
     <q-dialog v-model="showManageAuthNFTdialog" persistent>
        <q-card style="min-width: 300px" class="br-15 q-pa-sm">
            <q-card-section>
              <div class="text-h6">Manage Auth NFTs</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
              <q-input
                v-model="merchantSearch" label="Search for Merchant" outlined dense class="q-mb-md"
              />

              <div class="row items-center justify-between q-pa-md border-outlined">
                <div class="text-subtitle2">Generic Auth NFT</div>
                <q-toggle
                  v-model="genericAuthEnabled"
                  color="primary"
                  keep-color
                />
              </div>
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat label="Close" color="primary" v-close-popup />
            </q-card-actions>
            
        </q-card>
     </q-dialog>

     <!-- Transaction History Popup-->
     <q-dialog v-model="showTransactionHistory" persistent>
        <q-card style="min-width: 300px" class="br-15 q-pa-sm">
          <q-card-section>
              <div class="text-h6">Transaction History</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
              <q-input v-model="transactionSearch" label="Search" outlined dense class="q-mb-md"/>
          </q-card-section>

          <q-card-section>
            Contents
          </q-card-section>

          <q-card-actions align="right">
              <q-btn flat label="Close" color="primary" v-close-popup />
          </q-card-actions>
        </q-card>
     </q-dialog>
</template>

<script>
 
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
//import { createCard } from 'src/services/card/backend/api';
import HeaderNav from 'components/header-nav'
import Card from 'src/services/card/card.js';
import { loadCardUser } from 'src/services/card/auth';
import { selectedCurrency } from 'src/store/market/getters';

  
  export default {
    
    components: {
      MultiWalletDropdown,
    },

    data() {
      return {
        createCardDialog: false,
        subCards: [],
        contractAddress: 'bchtest:p02aanptmywrtmwt75mckrekkpnrwm0lxc7w6d0ljq4w97mu9uguzfdqshmp8', // dummy
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
        merchantSearch: '',
        genericAuthEnabled: false,
        // Transaction History
        showTransactionHistory: false,
        isSweep: false,
        // Order form
        formData: {
          fullName: '',
          city: '',
          country: ''
        },
      }
    },
    
    async mounted () {
      console.log("GO!")

      try {
        const cardUser = await loadCardUser()
        const cards = await cardUser.fetchCards()
        if (cards.length === 0) {
          console.warn('No cards found for the user.')
          return
        }

        const card = cards[cards.length - 1] // get the last card for testing
        console.log('Loaded Cards:', cards)
        console.log('Using Card:', card)

        await card.getAuthNfts().then(authNfts => {
          console.log('Card Auth NFTs:', authNfts)
        })

        const merchants = await card.getMerchantList()
        if (merchants.results.length === 0) {
          console.warn('No merchants found in the merchant list.')
          return
        }

        const selectedMerchant = merchants.results[0] // for testing, pick the first merchant

        console.log('Merchants:', merchants)
        console.log('Selected Merchant:', selectedMerchant)

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

        await card.getAuthNfts().then(authNfts => {
          console.log('Card Auth NFTs after mutation:', authNfts)
        })

      } catch (error) {
        console.error('Error during mounted lifecycle:', error)
      }
    },

    methods: {
      // Open dialog
      openCreateCardDialog(){
        this.newCardName = '';
        this.createCardDialog = true;
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
          // execute workflow from card.js
          await card.create()
          const tokenId = card.tokenId

          // load user from card/auth
          const user = await loadCardUser()
          const cards = await user.fetchCards()
          console.log('Card User: ', user)

          // find the specific card we just created in the list
          const mintedCard = cards.find(c => c.tokenId === tokenId)
          let actualBalance = 0
          let contractAddress = 'Pending'

          if (mintedCard) {
            // fetch real balance
            const tokenUtxos = await mintedCard.getTokenUtxos()
            // calculate sum of token amounts in Utxos
            actualBalance = tokenUtxos.reduce((total, utxo) => {
              return total + Number(utxo.token.amount)
            }, 0)

            const contract = await mintedCard.getContract()
            contractAddress = contract.address
          }

          // print and fetch info for each card
          for(const cardItem of cards){
            const tokenUtxos = await cardItem.getTokenUtxos();
            const bchUtxos = await cardItem.getBchUtxos();
            const contract = await cardItem.getContract()

            console.log('=====Card Details=====')
            console.log('Card: ', cardItem);
            console.log('Card ID: ', cardItem.tokenId)
            console.log('Card tokenUtxos:', tokenUtxos);
            console.log('Card bchUtxos:', bchUtxos);
            console.log('Card contract:', contract);
          }

          // Create new subcard object
          const newCard = {
            id: result.tokenId,
            name: this.newCardName,
            contractAddress: contractAddress,
            balance: actualBalance,
            status: 'Active' // by default
          }

          // Update UI state ; Insert before the create card button
          this.subCards.push(newCard);
          this.createCardDialog = false; // close dialog
          this.$q.notify({
            message: `Card "${newCard.name}" created successfully with ${newCard.balance} BCH!`,
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
          title: 'Edit Card Name',
          message: 'Maximum of 15 characters allowed',
          prompt: {
            model: card.name,
            type: 'text',
            attrs: {
              maxLength: 15, 
            },
            isValid: val => val.length <= 15 && val.length > 0
          },
          cancel: true,
          persistent: true
        }).onOk(data => {
          if (data.length <= 15){
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
        this.showTransactionHistory = true;
        this.transactionSearch = '';
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
          country: ''
        }

        this.$nextTick(() => {
          if (this.$refs.orderForm){
            this.$refs.orderForm.resetValidation()
          }
        })
      }

    }

  }
</script>

<style lang="scss" scoped>
  .create-card-dialog {
    width: 500px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    border-radius: 18px;
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      0 0 40px rgba(33, 150, 243, 0.25);
    overflow: hidden;
  }

  .view-card-dialog {
    width: 400px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    border-radius: 18px;
    overflow: hidden;
  }

  .order-card-container {
    border-radius: 16px;
    border: 1px dashed #1976d2;
  }
</style>
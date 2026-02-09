<template>
  <q-layout>
  
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
        <div class="row q-col-gutter-md justify-start items-stretch">
          <!-- Existing Subcards -->
            <div v-for="card in subCards" :key="card.id" class="col-auto">
              <q-card bordered flat class="subcard-item fixed-card-size bg-white column justify-between">
                <!-- Card header: Name + Icons -->
                <q-card-section class="row items-center justify-between q-pa-sm">
                  <div class="text-weight-bold text-subtitle1 text-black ellipsis" style="max-width: 100px;">{{ card.name }}</div>
                  
                  <q-icon
                    name="circle"
                    size="10px"
                    :class="['q-ml-xs', card.status === 'Locked' ? 'text-negative' : 'status-blink']"
                  >
                    <q-tooltip>{{ card.status || 'Active' }}</q-tooltip>
                  </q-icon>

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
                      <q-tooltip>Edit alias</q-tooltip>
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
                    
                     <q-btn
                        flat
                        dense
                        round
                        icon="settings"
                        color="primary"
                        @click="openCardMenu($event, card)"
                     >
                        <q-tooltip>Settings and Options</q-tooltip>
        
                        <q-menu
                            anchor="top right"
                            self="top right"
                            transition-show="scale"
                            transition-hide="scale"
                        >
                          <q-list padding style="min-width: 150px">
                              <q-item clickable v-ripple @click="manageAuthNFTs(card)" v-close-popup>
                                <q-item-section>Manage Auth NFTs</q-item-section>
                              </q-item>

                              <q-item clickable v-ripple @click="viewTransactionHistory(card)" v-close-popup>
                                <q-item-section>Transaction History</q-item-section>
                              </q-item>

                              <q-item clickable v-ripple @click="editSpendLimit(card)" v-close-popup>
                                <q-item-section>Spend Limit</q-item-section>
                              </q-item>

                              <q-item clickable v-ripple @click="toggleLock(card)" v-close-popup>
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
                      <span class="text-h5 text-black"> {{ card.balance }} BCH</span>
                    </div>

                 </q-card-section>

              </q-card>
            </div>

            <!-- Create Card Button opens dialog -->
             <div class="col-auto">
                <q-card
                  bordered
                  flat
                  class="bg-grey-1 fixed-card-size cursor-pointer transition-hover"
                  @click="openCreateCardDialog"
                >
                  <q-card-section class="text-center q-pa-lg">
                    <q-icon
                      name="add_circle_outline"
                      size="56px"
                      color="primary"
                      class="q-mb-sm"
                    />
                    <div class="text-subtitle-1 text-weight-bold text-primary text-center">
                      Create Card
                    </div>
                  </q-card-section>
                </q-card>
             </div>

             <!-- Card Replacement -->
             <div class="col-auto">
                <q-card
                  bordered
                  flat
                  class="bg-grey-1 fixed-card-size cursor-pointer transition-hover"
                  @click="cardReplacementDialog=true"
                >
                  <q-card-section class="text-center q-pa-lg">
                    <q-icon
                      name="swap_horiz"
                      size="56px"
                      color="primary"
                      class="q-mb-sm"
                    />
                    <div class="text-subtitle-1 text-weight-bold text-primary text-center">
                      Card Replacement
                    </div>
                  </q-card-section>
                </q-card>
             </div>

        </div>
      </div>
    </transition> 

    <!-- Order physical card form to be component -->
     <div class="q-pa-md flex flex-center full-width">
        <div
          class="order-hero-container shadow-10"
          :style="heroStyle"
        >
          <div class="row full-height">
            
            <div class="col-12 col-md-7 q-pa-lg flex flex-center">
              <div class="full-width" style="max-width: 500px">
                
                <div class="text-white q-mb-md">
                  <div class="text-h3 text-weight-bold line-height-tight">
                    Your new physical Paytaca card awaits.
                  </div>
                  <p class="opacity-80 q-mt-sm">Global payments, physical style.</p>
                </div>

                <div class="col-12 col-md-5 flex flex-center q-pa-lg bg-white-opacity-10">
                  <q-img
                    src="~assets/paytaca-card.png"
                    class="card-floating"
                    style="width: 80%; max-width: 350px;"
                  />
                </div>

                <transition mode="out-in" enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
                  <div v-show="!showForm" class="text-center">
                    <q-btn 
                      label="Get Started" 
                      color="white" 
                      text-color="primary" 
                      class="q-px-xl text-bold"
                      unelevated
                      rounded
                      @click="activateForm"
                    />
                  </div>
                </transition>

                  <div v-show="showForm" class="bg-white q-pa-md rounded-borders shadow-2">
                    <div class="row items-center justify-between q-mb-sm">
                      <div class="text-subtitle1 text-bold text-primary">Shipping Details</div>
                      <q-btn icon="close" flat round dense color="grey" @click="showForm = false" />
                    </div>

                    <q-form @submit="onSubmit" class="q-col-gutter-sm">
                      <pre class="text-black">{{ formData }}</pre>
                      <q-input outlined dense v-model="formData.fullName" label="Full Name" />
                      
                      <div class="row q-col-gutter-sm">
                        <div class="col-6 text-primary">
                          <q-input outlined dense v-model="formData.city" label="City" />
                        </div>
                        <div class="col-6">
                          <q-input outlined dense v-model="formData.state" label="State" />
                        </div>
                        <div class="col-6">
                          <q-input outlined dense v-model="formData.zip" label="Zip" />
                        </div>
                        <div class="col-6">
                          <q-input outlined dense v-model="formData.country" label="Country" />
                        </div>
                        
                        <!-- Users will pin location and it will dynamically fill the required fields (City, State, Zip, and Country) -->
                        <div ref="mapContainer" class="q-mt-md" style="height: 300px; width: 100%; border-radius: 8px; border: 1px solid #ddd;"></div>
                        <div class="text-caption text-grey-7 q-mt-xs">
                          <q-icon name="place" color="primary"/>
                          Pin your location to auto-fill address fields.
                        </div>  
                      </div>
                      <q-btn label="Confirm Order" color="primary" type="submit" class="full-width q-mt-md" unelevated />
                    </q-form>
                  </div>

              </div>
            </div>
          </div>
        </div>
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
            Edit Card's Name
            <div class="text-caption text-center">Provide an alias for your card</div>
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
            label="Name" 
            outlined 
            dense 
            hint="Max of 10 characters allowed"
            counter
            maxlength="10"
            :rules="[
              val => (val && val.length > 0) || 'Name is required',
              val => val.length <= 10 || 'Maximum 10 characters'
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
              :disable="!newCardName || newCardName.length > 10"
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

         <!-- Card design -->
          <q-card-section class="flex flex-center">
            <q-img
              src="~assets/paytaca-card.png"
              style="width: 80%; max-width: 350px;"
            />
          </q-card-section>
          
         <!-- QR CODE -->
          <q-card-section class="q-pt-md q-pb-md flex flex-center">
              < QR CODE >
              <qr-code 
                v-if="selectedCard && selectedCard.contractAddress"
                :text="String(selectedCard.contractAddress)"
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

           <!-- Spend Limit -->
            <q-card-section class="row justify-start q-gutter-xs q-py-sm">
                <div class="text-subtitle2 text-grey-5">Spend Limit:</div>
                <div class="text-subtitle2 text-white text-weight-bold">
                  {{ selectedCard?.spendLimitAmount ? selectedCard.spendLimitAmount + ' BCH' : 'No Limit Set' }}
                </div>
            </q-card-section>

           <!-- Card Status  -->
            <q-card-section class="row justify-start q-gutter-xs q-py-sm">
              <div class="text-subtitle2 text-grey-5">Card Status:</div>
              <div class="text-subtitle2 text-white text-weight-bold">
                {{  selectedCard.status }}
              </div> 

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
                v-model="merchantSearch" 
                label="Search for Merchant" 
                outlined 
                dense 
                class="q-mb-md"
              />

              <q-list
                v-if="filteredMerchants.length > 0" 
                bordered
                separator
                class="q-mb-md"
              >
                <q-item
                  v-for="merchant in filteredMerchants"
                  :key="merchant.id"
                  clickable
                  v-ripple
                  @click="selectMerchant(merchant)"
                >
                  <q-item-section>
                    <q-item-label>{{ merchant.name }}</q-item-label>
                    <q-item-label caption>{{ merchant.address }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div 
                v-else-if="merchantSearch.length > 0"
                class="text-caption text-grey q-mb-md"
              >
                No merchants found.
              </div>

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
     <q-dialog v-model="showTransactionHistoryDialog" persistent>
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

     <!-- Spend Limit Pop-up -->
     <q-dialog v-model="showSpendLimitDialog" persistent>
        <q-card style="min-width: 300px" class="br-15 q-pa-sm">
          <q-card-section>
            <div class="text-h6">Spend Limit</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model.number="tempSpendLimitAmount"
              type="number"
              label="Spend Limit Amount"
              outlined
              dense
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" v-close-popup />
            <q-btn flat label="Save" color="primary" @click="updateSpendLimit" v-close-popup />
          </q-card-actions>
        </q-card>
     </q-dialog>

     <!-- Card Replacement Dialog -->
     <q-dialog v-model="cardReplacementDialog" persistent>
        <q-card style="min-width: 300px" class="br-15 q-pa-sm">
          <q-card-section>
            <div class="text-h6">Card Replacement</div>
            <div class="text-subtitle3">Permanently remove and replace your card.</div>
          </q-card-section>

          <q-separator/>

          <q-card-section>
              <div class="q-mb-sm text-weight-medium">Choose the card you want to replace:</div>
              <div class="row q-col-gutter-sm justify-start">
                <div
                  v-for="card in subCards"
                  :key="card.id"
                  class="col-6 col-sm-4"
                >
                  <q-card
                    bordered
                    flat
                    class="cursor-pointer transition-hover q-pa-sm text-center"
                    :class="isCardSelected(card) ? 'selected-card-active' : 'unselected-card'"
                    @click="toggleSelection(card)"
                  >
                    <div class="text-subtitle2 text-weight-bold text-black ellipsis">
                      {{ card.name }}
                    </div>

                    <div class="row items-center justify-center q-mt-xs">
                      <q-icon
                        name="circle"
                        size="8px"
                        :class="card.status === 'Locked' ? 'text-negative' : 'status-blink'"
                      />
                      <span class="text-caption q-ml-xs text-grey-7">{{ card.status }}</span>
                    </div>

                    <div
                      v-if="isCardSelected(card)"
                      class="absolute-top-right q-pa-xs"
                    >
                      <q-btn
                        round
                        dense
                        unelevated
                        size="xs"
                        color="primary"
                        icon="sync"
                      >
                        <q-tooltip>Select card for replacement</q-tooltip>
                      </q-btn>

                    </div>
                  </q-card>
                </div>
              </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" v-close-popup />
            <q-btn flat label="Proceed" color="primary" @click="handleCardReplacement"/>
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
            message: 'Please enter a a valid spend limit amount',
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
            state: addr.state = addr.state || addr.region || addr.province || '',
            zip: addr.zip = addr.postcode || '',
            country: addr.country = addr.country || '',
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
</script>

<style lang="scss" scoped>
  @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

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

  .line-height-tight {
    line-height: 1.1;
  }

  .opacity-80 {
    opacity: 0.8;
  }

  .rounded-borders {
    border-radius: 12px;
  }
  .card-floating {
  
    animation: float 6s ease-in-out infinite;
    border-radius: 20px;
  }

  @keyframes float {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(2deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }

  .form-container {
    max-width: 450px;
    animation: slideInUp 0.3s ease-out;
  }

  :deep(.q-field--outlined .q-field__control:before) {
    border: 1px solid var(--q-primary) !important;
    opacity: 1 !important; 
  }
 
  :deep(.q-field--outlined.q-field--focused .q-field__control:after) {
    border-color: var(--q-primary) !important;
    border-width: 2px; 
  }

  :deep(.q-field--outlined .q-field__label) {
    color: var(--q-primary);
  }

  .status-blink {
    color: #21ba45; 
    animation: pulse-green 2s infinite;
  }

  @keyframes pulse-green {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(0.8);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .fixed-card-size {
    width: 250px;   
    height: 150px;  
    transition: transform 0.2s ease-in-out;
  }

  .border-primary {
    border: 2px solid var(--q-primary) !important;
  }

  .transition-hover:hover {
    background-color: #f0f4ff !important;
  }

  .unselected-card {
    background-color: white !important;
    color: #9e9e9e;
  }

  .selected-card-active {
    background-color: white !important; 
    border: 1px solid #027be3 !important;
  }

 
</style>
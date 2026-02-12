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
                  <div class="text-weight-bold text-subtitle1 text-black ellipsis" style="max-width: 100px;">{{ card.raw.alias }}</div>
                  
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
                      Balance: <span class="text-black"> {{ Number(card.raw.bch_balance.balance) / 1e8 }} BCH</span>
                    </div>
                    <div class="text-black"> {{ card.raw.ct_balance.utxos.length }} NFTs</div>

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
                      <q-input outlined dense v-model="formData.fullName" label="Full Name *" input-class="text-black" :rules="[val => !!val || 'Full name is required']" lazy-rules/>
                      
                      <div class="row q-col-gutter-sm">
                        <div class="col-6">
                          <q-input outlined dense v-model="formData.city" label="City *" input-class="text-black" :rules="[val => !!val || 'City is required']" lazy-rules/>
                        </div>
                        <div class="col-6">
                          <q-input outlined dense v-model="formData.state" label="State *" input-class="text-black" :rules="[val => !!val || 'State is required']" lazy-rules/>
                        </div>
                        <div class="col-6">
                          <q-input outlined dense v-model="formData.zip" label="Zip *" input-class="text-black" :rules="[val => !!val || 'Zip code is required']" lazy-rules/>
                        </div>
                        <div class="col-6">
                          <q-input outlined dense v-model="formData.country" label="Country *" input-class="text-black" :rules="[val => !!val || 'Country is required']" lazy-rules/>
                        </div>
                        
                        <!-- Users will drag marker and it will dynamically fill the required fields (City, State, Zip, and Country) -->
                        <div ref="mapContainer" class="q-mt-md" style="height: 300px; width: 100%; border-radius: 8px; border: 1px solid #ddd;"></div>
                        <div class="text-caption text-grey-7 q-mt-xs">
                          <q-icon name="place" color="primary"/>
                          Drag the marker to your location to auto-fill address fields.
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
     <q-dialog v-model="showManageAuthNFTdialog" @show="refreshMerchants" persistent>
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
  import { createCardLogic } from './createCard.js';

  export default {
    mixins: [createCardLogic]
  }

</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>


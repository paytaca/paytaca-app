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
  
        <div class="q-pa-md flex flex-center full-width">
          <div class="order-hero-container shadow-10" :style="heroStyle">
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

                  <!-- Create Card button -->
                  <div class="col-auto">
                    <q-card
                      bordered
                      flat
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
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cards Display -->
        
      </div>
    </transition> 

    <!-- Order physical card form to be component -->
     
  </q-layout>

  <!-- CREATE CARD DIALOG -->
  <createCardDialog />
  
  <!-- VIEW CARD DIALOG -->
   
  <!-- CASH IN DIALOG -->
  

  <!-- Manage Auth NFT Dialog -->
     

  <!-- Transaction History Dialog -->
     

  <!-- Spend Limit Dialog -->
     

  <!-- Card Replacement Dialog -->
     

</template>

<script>
  
import { createCardLogic } from './createCard.js';
import createCardDialog from './createCardDialog.vue';

  export default {
    mixins: [createCardLogic],
    components: {
      createCardDialog
    }
  }

</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>


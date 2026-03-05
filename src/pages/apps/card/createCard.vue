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
                      Your new Paytaca card awaits.
                    </div>
                    <p class="opacity-80 q-mt-sm">Global payments, Paytaca style.</p>
                  </div>

                  <div class="col-12 col-md-5 flex flex-center q-pa-lg bg-white-opacity-10">
                    <q-img
                      src="~assets/paytaca-card.png"
                      class="card-floating"
                      style="width: 80%; max-width: 350px;"
                    />
                  </div>

                  <!-- Create Card button -->
                  <div class="full-width flex justify-center q-mt-md">
                    <div class="col-auto">
                      <q-card
                        bordered
                        flat
                        class="bg-transparent fixed-card-size"
                        @click="openCreateCardDialog"
                      >
                        <q-card-section class="text-center q-pa-lg">
                          <q-icon
                            name="add_circle_outline"
                            size="56px"
                            color="white"
                            class="q-mb-sm"
                          />
                          <div class="text-subtitle-1 text-weight-bold text-primary text-center text-white">
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
        </div>

        <!-- Cards Display -->
        
      </div>
    </transition> 

    <!-- Order card form-->
     
  </q-layout>

  <!-- CREATE CARD DIALOG -->
  <createCardDialog 
    v-model="createCardDialog"
    v-model:newCardName="newCardName"
    @handleCreateCard="handleCreateCard"
  />
 
     

</template>

<script>

import createCardDialog from './createCardDialog.vue';

// import { createCardLogic } from './createCard.js'; --restore this after testing
import {createCardLogic} from './noBackend.js'


  export default {
    mixins: [createCardLogic],
    components: {
      createCardDialog,
    },

    mounted () {
      // check if cards exists as soon as the component loads
      this.checkExistingCards()
    }
  }

</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>


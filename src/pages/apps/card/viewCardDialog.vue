<template>
 
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
        <!-- TODO: Replace with card.raw.cash_address or card.raw.token_address from Card class for QR code -->
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
        <!-- TODO: Replace with card.raw.cash_address or card.raw.token_address from Card class -->
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
  
</template>

<script>
  import { createCardLogic } from './createCard.js';

  export default {
    mixins: [createCardLogic]
  }
</script>
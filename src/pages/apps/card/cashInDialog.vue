<template>
 
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
  
</template>

<script>
  import { createCardLogic } from './createCard.js';

  export default {
    mixins: [createCardLogic]
  }
</script>
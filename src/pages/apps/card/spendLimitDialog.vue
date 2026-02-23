<template>
  
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
  
</template>

<script>
  import { createCardLogic } from './createCard.js';

  export default {
    mixins: [createCardLogic]
  }
</script>
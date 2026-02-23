<template>
  
  <q-dialog v-model="showTransactionHistoryDialog" persistent>
    <q-card style="min-width: 300px" class="br-15 q-pa-sm">
      <q-card-section>
          <div class="text-h6">Transaction History</div>
      </q-card-section>

      <q-card-section class="q-pb-none">
        <q-select
          v-model="selectedCard"
          :options="cardOptions"
          label="Select Card"
          outlined
          dense
          emit-value
          map-options
          class="q-mb-sm"
        >
          <template v-slot:prepend>
            <q-icon name="credit_card" color="primary" />
          </template>

          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-italic text-grey">
                No cards found
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </q-card-section>

      <q-card-section class="q-pt-none">
          <q-input v-model="transactionSearch" label="Search..." outlined dense class="q-mb-md"/>
      </q-card-section>

      <q-card-section class="row items-center q-mb-none">
        <div class="text-subtitle1 text-weight-bold">Contents</div>
        <q-space />
        <div class="row q-gutter-x-sm">
          <q-btn
            flat
            dense
            size="sm"
            :color="sortKey === 'date' ? 'primary' : 'grey-7'"
            label="Date"
            @click="toggleSort('date')"
          >
            <q-icon 
              :name="sortKey === 'date' ? (sortOrder === 'asc' ? 'expand_less' : 'expand_more') : 'unfold_more' "
              size="xs"
              class="q-ml-xs"
            />
          </q-btn>

          <q-btn
            flat
            dense
            size="sm"
            :color="sortKey === 'amount' ? 'primary' : 'grey-7'"
            label="Amount"
            @click="toggleSort('amount')"
          >
            <q-icon 
              :name="sortKey === 'amount' ? (sortOrder === 'asc' ? 'expand_less' : 'expand_more') : 'unfold_more' "
              size="xs"
            />
          </q-btn>
        </div>
      </q-card-section>

      <!-- filter merchants in transaction search -->
      <q-card-section class="scroll" style="height: 300px; max-height: 50vh;">
        <div v-if="filteredTransactions && filteredTransactions.length > 0">
          <q-list separator>
            <q-item v-for="merch in filteredTransactions" :key="merch.id" class="q-px-none">
              <q-item-section>
                <q-item-label>{{ merch.name }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="text-weight-bold" :class="merch.amount > 0 ? 'text-positive' : 'text-negative' ">
                  {{ merch.amount > 0 ? '+' : '' }}{{ merch.amount }}
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div v-else class="text-center q-pa-lg text-grey">
          <q-icon name="history" size="lg" class="q-mb-sm" />
          <div>No transactions found</div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
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
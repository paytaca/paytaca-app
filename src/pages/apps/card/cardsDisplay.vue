<template>

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
        
        :class="['bg-grey-1 fixed-card-size transition-hover',
                  (subCards && subCards.length >= 1) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                ]"
        @click="subCards?.length >= 1 ? null : openCreateCardDialog()"
      >
        <q-card-section class="text-center q-pa-lg">
          <q-icon
            :name="(subCards && subCards.length >= 1) ? 'block' : 'add_circle_outline'"
            size="56px"
            :color="(subCards && subCards.length >= 1) ? 'grey-5' : 'primary'"
            class="q-mb-sm"
          />
          <div 
            class="text-subtitle-1 text-weight-bold text-primary text-center"
            :class="(subCards && subCards.length >= 1) ? 'text-grey-6' : 'text-primary'"
          >
            {{ (subCards && subCards.length >= 1) ? 'Limit Reached' : 'Create Card' }}
          </div>
        </q-card-section>

        <q-tooltip v-if="subCards && subCards.length >= 1">
          You can only have one active card at a time.
        </q-tooltip>
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
  
</template>

<script>
  import { createCardLogic } from './createCard.js';

  export default {
    mixins: [createCardLogic]
  }
</script>
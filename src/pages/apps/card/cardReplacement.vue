<template>

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
<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" full-width>
    <q-card :class="darkMode ? 'pt-dark' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">{{ title }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section
        class="q-gutter-y-sm q-py-xs q-my-sm"
        style="max-height:calc(65vh);overflow:auto;"
      >
        <q-list bordered separator :dark="darkMode" class="rounded-borders">
          <q-item
            v-for="(hedgePositionOffer, index) in hedgePositionOffers"
            :key="index"
            clickable
            :dark="darkMode"
            v-ripple
            @click="toggleSelectedOffer(hedgePositionOffer)"
            :class="[
              hedgePositionOffer?.id === selectedOffer?.id ? 'selected' : '',
              'q-px-sm q-py-xs',
            ]"
          >
            <q-item-section side class="q-pr-sm">
              <q-checkbox
                size="sm"
                :model-value="hedgePositionOffer?.id === selectedOffer?.id"
                :dark="darkMode"
                @click="toggleSelectedOffer(hedgePositionOffer)"
              />
            </q-item-section>
            <q-item-section>
              <div class="row items-center">
                <div class="q-space">
                  ~ {{
                    estimateCounterPartySats({
                      satoshis: hedgePositionOffer?.satoshis,
                      position: hedgePositionOffer?.position,
                      lowLiquidationPriceMultiplier: hedgePositionOffer?.lowLiquidationPriceMultiplier,
                    }) / 10 ** 8 
                  }} BCH
                </div>
                <div>{{ formatDuration(hedgePositionOffer.durationSeconds) }}</div>
              </div>
              <div class="text-grey text-caption">
                <div class="q-space">
                  ({{ hedgePositionOffer.position === 'hedge' ? 'Hedge' : 'Long' }})
                  {{ hedgePositionOffer.satoshis / 10 ** 8 }} BCH
                </div>
                <div>
                  {{ hedgePositionOffer.lowLiquidationPriceMultiplier * 100 }}%
                  -
                  {{ hedgePositionOffer.highLiquidationPriceMultiplier * 100 }}%
                </div>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-section>
        <q-btn-group spread flat>
          <q-btn
            v-close-popup
            no-caps
            flat
            color="grey"
            label="Cancel"
          />
          <q-btn
            no-caps
            :disable="!selectedOffer"
            @click="onDialogOK(selectedOffer)"
            color="brandblue"
            label="Select"
          />
        </q-btn-group>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { formatDuration } from 'src/wallet/anyhedge/formatters'
import { estimateCounterPartySats } from 'src/wallet/anyhedge/utils'
import { computed, ref } from 'vue'
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

// misc
const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const $q = useQuasar()

const props = defineProps({
  title: {
    type: String,
    default: 'Select position offer',
  },
  hedgePositionOffers: {
    type: Array,
    required: true,
  },
})
const selectedOffer = ref(null)
function toggleSelectedOffer(hedgePositionOffer) {
  selectedOffer.value = hedgePositionOffer?.id === selectedOffer.value?.id ? null : hedgePositionOffer
}
</script>

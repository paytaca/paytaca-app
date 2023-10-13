<template>
  <div>
    <div v-if="!hideLabel" class="row">
      <div class="q-space">{{ label }}</div>
      <div v-if="!totalBottom">
        <div v-if="data?.total">
          {{ getAssetDenomination(denomination, data?.total / 10 ** 8) }}
        </div>
        <div v-else class="text-grey">---</div>
      </div>
    </div>
    <div v-if="data?.sats" class="row">
      <div class="q-space">Amount:</div>
      <div>
        {{ getAssetDenomination(denomination, data?.total / 10 ** 8) }}
      </div>
    </div>
    <div :class="darkMode ? 'text-grey' : 'text-grey-7'">
      <div v-if="data?.fees?.network" class="row q-pl-md">
        <div class="q-space">Network fee:</div>
        <div>{{ getAssetDenomination(denomination, data?.fees?.network / 10 ** 8) }}</div>
      </div>
      <div v-if="data?.fees?.premium" class="row q-pl-md">
        <div class="q-space">Premium:</div>
        <div>{{ getAssetDenomination(denomination, data?.fees?.premium / 10 ** 8) }}</div>
      </div>
      <div v-if="data?.fees?.service" class="row q-pl-md">
        <div class="q-space">Service fee{{ data?.fees?.serviceFees?.length > 1 ? 's' : '' }}:</div>
        <div>{{ getAssetDenomination(denomination, data?.fees?.service / 10 ** 8) }}</div>
        <q-popup-proxy :breakpoint="0">
          <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark info-banner' : 'text-black']">
            <div>
              <div v-for="(fee, index) in data?.fees?.serviceFees" :key="index" class="row no-wrap">
                <div class="q-space ellipsis">
                  {{ fee?.name || ellipsisText(fee?.address) }}
                  <q-icon v-if="fee?.description" name="description"/>
                </div>
                <div class="q-ml-xs" style="white-space:nowrap">
                  {{ getAssetDenomination(denomination, fee?.satoshis / 10 ** 8) }}
                </div>

                <q-popup-proxy v-if="fee?.description" :breakpoint="0">
                  <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark info-banner' : 'text-black']">
                    <template v-if="fee?.name">
                      <div class="text-subtitle1">{{ fee?.name }} </div>
                      <q-separator :dark="darkMode"/>
                    </template>
                    <div>{{ fee?.description }}</div>
                  </div>
                </q-popup-proxy>
              </div>
            </div>
          </div>
        </q-popup-proxy>
      </div>
    </div>
    <div v-if="totalBottom" class="row">
      <div class="q-space">Total:</div>
      <div v-if="data?.total">
        {{ getAssetDenomination(denomination, data?.total / 10 ** 8) }}
      </div>
      <div v-else class="text-grey">---</div>
    </div>
  </div>
</template>
<script setup>
import { ellipsisText } from 'src/wallet/anyhedge/formatters'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const denomination = computed(() => store.getters['global/denomination'])

const props = defineProps({
  darkMode: Boolean,
  label: String,
  hideLabel: Boolean,
  totalBottom: Boolean,
  data: Object,
})
</script>

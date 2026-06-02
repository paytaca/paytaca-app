<template>
    <q-dialog 
      :model-value="modelValue" 
      position="bottom"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-center no-wrap">
            <div class="text-h5">Select a Bidding Price</div>
            <q-space/>
            <q-btn
              no-caps
              flat
              padding="sm"
              v-close-popup
            >
              <div class="row items-center">
                <div class="ellipsis" style="max-width:10em;">{{ 'CUSTOMER NAME' }}</div>
                <q-icon class="q-pl-xs button button-text-primary" :class="getDarkModeClass(darkMode)" name="person"/>
              </div>
            </q-btn>
          </div>

          <div class="flex justify-center q-mt-md">
            <div class="flex row items-center q-gutter-md">
              <q-btn
                flat
                label="₱100"
                padding="xs md"
                style="text-wrap:nowrap; background-color: #097000;"
              />

              <q-btn
                flat
                label="₱150"
                padding="xs md"
                style="text-wrap:nowrap; background-color: #097000;"
              />

              <q-btn
                flat
                label="₱200"
                padding="xs md"
                style="text-wrap:nowrap; background-color: #097000;"
              />

              <q-btn
                flat
                label="₱300"
                padding="xs md"
                style="text-wrap:nowrap; background-color: #097000;"
              />
            </div>
          </div>
          

          <div class="q-mt-md q-mb-lg">
            <div class="text-h6 text-weight-regular">Or set a custom bidding price</div>
            <q-input
              v-model="price"
              type="number"
              label="Enter a price"
              outlined
              prefix="₱"
              min="0"
            />
          </div>
          
          <div class="q-mt-sm">
            <q-btn
              v-close-popup
              no-caps
              label="Place Bid"
              class="full-width button"
              
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
</template>

<script setup>
  import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
  import { computed } from 'vue'
  import { useStore } from 'vuex'

  const props = defineProps({
    modelValue: Boolean
  })
  const emit = defineEmits(['update:modelValue'])

  const $store = useStore();
  const darkMode = computed(() => $store.getters['darkmode/getStatus'])
</script>
    
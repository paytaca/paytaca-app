<template>
    <q-dialog 
      :model-value="modelValue" 
      position="bottom"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-center no-wrap">
            <div class="text-h5">Cart</div>
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

          <div class="row no-wrap items-center">
            <q-btn
              no-caps flat
              padding="none"
              class="text-underline ellipsis"
            >
              {{ 'N/A' }}
              #{{ 'N/A'}}
            </q-btn>
            <q-chip class="text-white" color="grey" size="sm">
              Inactive
            </q-chip>
            <q-space/>
            <q-btn
              no-caps
              flat
              label="Clear cart"
              color="red"
              padding="xs md"
              style="text-wrap:nowrap;"
            />
            </div>
          <div class="q-mt-sm">
            <q-btn
              v-close-popup
              no-caps
              label="Checkout"
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
    
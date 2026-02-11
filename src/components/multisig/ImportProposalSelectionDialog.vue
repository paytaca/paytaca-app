<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('ShareTransactionProposal')}}</div>
        <div class="text-caption text-center text-bow-muted">
            <q-banner class="q-ma-lg rounded" :class="getDarkModeClass(darkMode)">
              <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>
              {{ $t('ShareTransactionProposalDescription') }}
            </q-banner>
          </div>
          <q-list bordered separator class="pt-card br-15">
            <q-item v-for="p, i in proposals" :key="i" class="q-my-lg">
              <q-item-section avatar>
                <q-avatar>
                  {{ p.id }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <q-icon name="receipt" color="primary" size="md"></q-icon>
                </q-item-label>
                <q-item-label>
                  <div class="ellipsis text-bold">Purpose: {{ p.purpose || 'N/A'}}</div>
                </q-item-label>
                <q-item-label caption lines="3">
                  <div>ID: {{ p.id }}</div>
                  <div>Origin: {{ p.origin || 'N/A' }}</div>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn label="Import" color="primary" @click="() => onDialogOK(p)" outline rounded no-caps></q-btn>
              </q-item-section>
            </q-item>
            
          </q-list>
          
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close')" @click="onDialogCancel" color="red" v-close-popup></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup> 
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const { t: $t } = useI18n()

// eslint-disable-next-line no-undef
const props = defineProps({
  darkMode: Boolean,
  proposals: Array
})

// eslint-disable-next-line no-undef
defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()



</script>

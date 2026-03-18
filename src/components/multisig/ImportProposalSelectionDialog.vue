<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('ImportTransactionProposal')}}</div>
          <div class="text-caption text-center text-bow-muted">
            <q-banner class="q-ma-lg rounded br-15" :class="getDarkModeClass(darkMode)">
              <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>
              {{ $t('ImportTransactionProposalDescription') }}
            </q-banner>
          </div>
          <q-list v-if="proposals?.length > 0"  class="col-xs-12" :class="getDarkModeClass(darkMode)">
            <q-item-label header>
              {{$t("TransactionProposals")}} <q-icon name="mdi-file-document-multiple-outline"></q-icon>
            </q-item-label>
            <!-- <q-separator></q-separator> -->
            <q-item 
              v-for="p, i in proposals" :key="i"
              class="q-my-sm pt-card br-15"
                 >
              <q-item-section avatar top>
                <q-avatar>
                  <q-icon name="mdi-file-cloud-outline" color="primary" size="md"></q-icon>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  <div class="ellipsis text-bold">Purpose: {{ p.purpose || 'N/A'}}</div>
                </q-item-label>
                <q-item-label caption>
                  <div>Origin: {{ p.origin || 'N/A' }}</div>
                </q-item-label>
                <q-item-label caption class="flex items-center q-gutter-x-xs">
                  <div>ID: {{ p.id }}</div><q-icon name="mdi-cloud-outline"></q-icon>
                </q-item-label>
                <q-item-label v-if="p.coordinatorInfo" caption class="flex items-center q-gutter-x-xs"">
                  <div>Coordinator: {{ p.coordinatorInfo?.name }} </div><q-icon name="mdi-cloud-outline"></q-icon>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn icon="mdi-file-import-outline" label="Import" color="primary" @click="() => onDialogOK(p)" size="sm" outline rounded no-caps></q-btn>
              </q-item-section>
            </q-item>
          </q-list>
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close')" @click="onDialogCancel" color="red" v-close-popup rounded></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup> 
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { onMounted } from 'vue'

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

onMounted(async () => {
  for (const p of props.proposals) {
    await p.fetchCoordinatorInfo()
  }
})

</script>

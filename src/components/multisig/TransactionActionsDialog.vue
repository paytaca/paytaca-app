<template>
  <q-dialog ref="dialogRef" full-width position="bottom"
    transition-hide="slide-down" transition-show="slide-up" transition-duration="500"
    >
    <q-card class="q-dialog-plugin q-pb-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
       <q-toolbar>
          <q-toolbar-title>
            <span class="q-mr-sm">{{ $t('Transaction Proposal Options')}}</span>
          </q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
      <q-card-section class="flex justify-around"> 
        <q-btn flat dense no-caps @click="$emit('deleteTx')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-around">
              <q-icon name="delete_forever" class="col-12" color="red"></q-icon>
              <div class="col-12 tile-label">Delete</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('exportPst')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-export" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Export File</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('uploadTx')" class="tile" :disable="broadcastDone" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-cloud-upload" class="col-12" color="primary">
                <q-badge v-if="shared" color="green" style="margin-right: 25px;" floating>
                 <span style="color: white">&#10003;</span>
                </q-badge>
              </q-icon>
              <div class="col-12 tile-label">Share Online</div>
            </div>
          </template>
        </q-btn>
      </q-card-section>
      <q-card-section class="flex flex-wrap justify-evenly"> 
        <q-btn flat dense no-caps @click="$emit('loadCosignerPst')" class="tile" :disable="broadcastDone" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-upload" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Load Cosigner PST</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('broadcastTx')" class="tile" :disable="broadcastDone || signingProgress !== 'fully-signed'" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="cell_tower" class="col-12" color="primary" style="position:relative">
              </q-icon>
              <div class="col-12 tile-label">Broadcast</div>
            </div>
          </template>
        </q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $emit = defineEmits ([
  'deleteTx',
  'exportPst',
  'loadCosignerPst',
  'uploadTx',
  'broadcastTx',
  ...useDialogPluginComponent.emits
])

defineProps({
  darkMode: Boolean,
  broadcastDone: Boolean,
  shared: Boolean
})
</script>

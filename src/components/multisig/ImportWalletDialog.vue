<template>
  <q-dialog ref="dialogRef" full-width position="bottom"
    transition-hide="slide-down" transition-show="slide-up" transition-duration="500"
    >
    <q-card class="q-dialog-plugin q-pb-md pt-card" :class="getDarkModeClass(darkMode)">
       <q-toolbar>
          <q-toolbar-title><span class="q-mr-sm">Import Wallet</span><q-icon name="import_export"/></q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
      <q-card-section class="flex flex-wrap justify-around">
        <q-btn flat dense no-caps @click="$emit('importFromFile')" class="tile">
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="file_open" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">From File</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('importFromServer')" class="tile">
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="cloud_download" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">From Server</div>
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

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $emit = defineEmits ([
  'importFromFile',
  'importFromServer',
  ...useDialogPluginComponent.emits
])
defineProps({
  darkMode: Boolean
})
</script>

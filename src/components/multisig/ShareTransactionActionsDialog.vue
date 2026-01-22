<template>
  <q-dialog ref="dialogRef" full-width position="bottom"
    transition-hide="slide-down" transition-show="slide-up" transition-duration="500"
    >
    <q-card class="q-dialog-plugin q-pb-md pt-card text-bow bottom-card" :class="getDarkModeClass(darkMode)">
       <q-toolbar>
          <q-toolbar-title>
            <span class="q-mr-sm">{{ $t('Share Tx Proposal')}}</span>
          </q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
      <q-card-section class="flex flex-wrap justify-evenly"> 
        <q-btn flat dense no-caps @click="$emit('uploadTransaction')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-around">
              <q-icon name="cloud_upload" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Share Online</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('exportTransaction')" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-export" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Export File</div>
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
  'uploadTransaction',
  'exportTransaction',
  ...useDialogPluginComponent.emits
])

defineProps({
  darkMode: Boolean,
  txProposals: Array
})
</script>

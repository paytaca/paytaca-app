<template>
  <q-dialog ref="dialogRef" full-width full-height position="bottom"
    transition-hide="slide-down" transition-show="slide-up" transition-duration="500"
    seamless
    auto-close
    >
    <q-card :class ="`q-pb-lg pt-card text-bow ${darkMode}`">
      <q-bar class="full-width bg-inherit" style="padding: 0px;">
        <q-btn icon="close" @click="dialogRef.hide()" flat></q-btn>
      </q-bar>
      <q-card-section class="flex flex-wrap justify-around">
        <h6>Choose Format</h6>
        <q-btn flat dense no-caps @click="onDialogOk('paytaca')">
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="img:favicon-128x128.png" class="col-12"></q-icon>
              <div class="col-12">Paytaca Wallet Format</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="onDialogOk('electron')" disable>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="cell_tower" class="col-12"></q-icon>
              <div class="col-12">ElectronCash Wallet Format</div>
            </div>
          </template>
        </q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useDialogPluginComponent } from 'quasar'
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
defineEmits ([
  ...useDialogPluginComponent.emits
])
defineProps({
  darkMode: String
})
</script>

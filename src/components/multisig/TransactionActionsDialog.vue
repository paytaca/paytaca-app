<template>
  <q-dialog ref="dialogRef" full-width position="bottom"
    transition-hide="slide-down" transition-show="slide-up" transition-duration="500"
    seamless
    auto-close
    >
    <q-card :class ="`q-pb-lg pt-card text-bow ${darkMode}`">
      <q-bar class="full-width bg-inherit" style="padding: 0px;">
        <q-btn icon="keyboard_arrow_down" class="full-width" @click="dialogRef.hide()" flat></q-btn>
      </q-bar>
      <q-card-section class="flex flex-wrap justify-around">
        <q-btn flat dense no-caps @click="$emit('delete')">
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="delete" class="col-12"></q-icon>
              <div class="col-12">Delete</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('broadcast')">
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="cell_tower" class="col-12"></q-icon>
              <div class="col-12">Broadcast</div>
            </div>
          </template>
        </q-btn>
        <q-btn flat dense no-caps @click="$emit('export')">
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="share" class="col-12"></q-icon>
              <div class="col-12">Export</div>
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
const $emit = defineEmits ([
  'broadcast',
  'export',
  'delete',
  ...useDialogPluginComponent.emits
])
defineProps({
  darkMode: String
})
</script>

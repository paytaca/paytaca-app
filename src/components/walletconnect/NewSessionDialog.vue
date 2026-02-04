<template>
  <q-dialog ref="dialogRef" persistent seamless full-width position="bottom" rounded>
    <q-card 
      style="min-height: 90vh;" 
      class="br-15 text-bow pt-card bottom-card"
      :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark' : 'bg-pt-light']"
      >
      
      <div class="row no-wrap items-start justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          {{ $t('NewSession')}}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section>
        <div class="text-body1 q-my-sm">{{ $t('WcPasteSessionURLLabel', 'Paste session URL') }}</div>
        <q-input v-model="sessionURL" type="textarea" :label="$t('SessionURL')" filled/>
        
      </q-card-section>
      <q-card-actions class="row justify-around q-pa-md q-mt-xl">
        <q-btn
            outline
            color="grey"
            :label="$t('Cancel')"
            rounded
            class="col-5 col-sm-3"
            no-caps
            @click="onCancelClick"
          />
          <q-btn
            rounded
            color="primary"
            :label="$t('Ok')"
            no-caps
            class="col-5 col-sm-3"
            @click="onOkClick"
          />        
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const sessionURL = ref()

const props = defineProps({
  darkMode: Boolean,
})

const onOkClick = () => {
  onDialogOK(sessionURL.value)
}

const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}
</script>



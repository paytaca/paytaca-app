<template>
  <q-dialog ref="dialogRef" persistent seamless class="no-click-outside">
    <q-card class="q-dialog-plugin br-15 q-pb-xs pt-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="text-black">
        <div class="text-grad">
          Are you sure you want to disconnect 
          {{ session.peer?.metadata?.name }}?
        </div>
        <SessionInfo :session="session" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          outline
          padding="xs md"
          color="grey"
          :label="$t('No')"
          rounded
          flat
          @click="onNoClicked"
        />

        <q-btn
          padding="xs md"
          color="brandblue"
          :label="$t('Yes')"
          rounded
          @click="onYesClicked"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import SessionInfo from './SessionInfo.vue'

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } 
  = useDialogPluginComponent()

defineProps({
  session: { type: Object },
})

const onYesClicked = () => {
  onDialogOK(session)
}
const onNoClicked = () => {
  onDialogCancel()
  onDialogHide()
}
</script>

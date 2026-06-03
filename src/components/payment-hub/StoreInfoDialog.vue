<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6">{{ storeData?.id ? $t('EditStore', {}, 'Edit Store') : $t('AddStore', {}, 'Add Store') }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="form.name"
          :label="$t('StoreName', {}, 'Store Name')"
          outlined
          dense
          autofocus
          @keyup.enter="onOKClick"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$t('Cancel')" color="grey" @click="onCancelClick" />
        <q-btn unelevated rounded :label="$t('OK')" color="pt-primary1" @click="onOKClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  storeData: {
    type: Object,
    default: () => ({})
  }
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const form = reactive({
  name: ''
})

onMounted(() => {
  if (props.storeData?.name) {
    form.name = props.storeData.name
  }
})

function onOKClick() {
  // TODO: Add logic to save store (create/update)
  // This is where you would call your API to save the store data
  onDialogOK({
    ...props.storeData,
    name: form.name
  })
}

function onCancelClick() {
  onDialogCancel()
}
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 90vw;">
      <q-form ref="formRef" @submit="onOKClick">
        <q-card-section>
          <div class="text-h6">{{ $t('CreateKey', {}, 'Create API Key') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-y-md">
          <q-input
            v-model="form.name"
            :label="$t('KeyName', {}, 'Key Name (e.g. Mobile App)') + ' *'"
            outlined
            dense
            autofocus
            lazy-rules
            :rules="[val => !!val || $t('Required', {}, 'Required')]"
            hide-bottom-space
          />
          
          <div>
            <div class="text-caption text-grey q-mb-xs">{{ $t('ExpiryDateOptional', {}, 'Expiry Date & Time (Optional)') }}</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input outlined dense v-model="form.date" mask="date" :rules="['date']" placeholder="YYYY/MM/DD" hide-bottom-space>
                  <template v-slot:append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date v-model="form.date" color="pt-primary1">
                          <div class="row items-center justify-end">
                            <q-btn v-close-popup label="Close" color="pt-primary1" flat />
                          </div>
                        </q-date>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <div class="col-6">
                <q-input outlined dense v-model="form.time" mask="time" :rules="['time']" placeholder="HH:mm" hide-bottom-space>
                  <template v-slot:append>
                    <q-icon name="access_time" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.time" color="pt-primary1" format24h>
                          <div class="row items-center justify-end">
                            <q-btn v-close-popup label="Close" color="pt-primary1" flat />
                          </div>
                        </q-time>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel')" color="grey" @click="onCancelClick" />
          <q-btn unelevated rounded :label="$t('Create', {}, 'Create')" color="pt-primary1" type="submit" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const formRef = ref(null)

const form = reactive({
  name: '',
  date: '',
  time: ''
})

async function onOKClick() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  let expiryIso = null
  if (form.date) {
    // Construct ISO string
    const timePart = form.time ? form.time : '00:00'
    const dateStr = form.date.replace(/\//g, '-') // Quasar date is YYYY/MM/DD
    try {
      const dateObj = new Date(`${dateStr}T${timePart}:00`)
      expiryIso = dateObj.toISOString()
    } catch (e) {
      console.error('Invalid date construct', e)
    }
  }

  onDialogOK({
    name: form.name,
    expiry_date: expiryIso
  })
}

function onCancelClick() {
  onDialogCancel()
}
</script>

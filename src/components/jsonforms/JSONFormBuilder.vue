<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    position="bottom"
  >
    <q-card class="br-15 pt-card-2 text-bow json-form-builder-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="q-pa-none">
        <div class="row no-wrap items-center justify-between q-px-md q-py-sm builder-header">
          <div class="text-h6">
            <q-icon name="build" class="q-mr-sm" />
            {{ $t('FormBuilder', {}, 'Form Builder') }}
          </div>
          <div class="row q-gutter-x-sm">
            <!-- <q-btn
              flat
              dense
              icon="code"
              :label="$t('JSON', {}, 'JSON')"
              @click="showJson = !showJson"
              class="gt-xs"
            />
            <q-btn
              flat
              dense
              icon="preview"
              :label="$t('Preview', {}, 'Preview')"
              @click="showPreview = !showPreview"
            /> -->
            <q-btn flat padding="sm" icon="close" v-close-popup />
          </div>
        </div>

        <div class="text-subtitle2 text-grey q-mb-sm row items-center">
          <span>{{ $t('Fields', {}, 'Fields') }}</span>
          <q-space />
          <span class="text-caption">{{ fields.length }} {{ $t('Fields', {}, 'fields') }}</span>
        </div>
        <div class="q-gutter-y-sm">

        </div>
        <div class="q-mt-md">
          <q-btn no-caps outline icon="add" :label="$t('AddField', {}, 'Add field')" @click="showAddMenu = true">
            <q-menu auto-close>
              <q-list>
                <q-item v-for="ft in fieldTypes" :key="ft.value" clickable @click="addField(ft.value)">
                  <q-item-section avatar>
                    <q-icon :name="ft.icon" />
                  </q-item-section>
                  <q-item-section>{{ ft.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { useDialogPluginComponent } from 'quasar';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex'
import { defineComponent, ref, computed } from 'vue';
import { createUnserializedSchemaField } from 'src/marketplace/formschema';

export default defineComponent({
  name: 'JSONFormBuilder',
  setup() {
    const { dialogRef, onDialogOK, onDialogCancel, onDialogHide } = useDialogPluginComponent();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    /** @type {import('vue').Ref<import('@jsonforms/core').JsonSchema7>} */
    const dataSchema = computed(() => {
      const data = {
        type: 'object',
        title: '',
        properties: {
          
        },
      }
    });

    const fields = ref([]);

    function addField(type) {
      let schemaType = type
      let enumOptions = undefined
      if (type === 'string:enum') {
        schemaType = 'string'
        enumOptions = ['Option 1']
      }
      const newField = createUnserializedSchemaField({
        name: '',
        options: { type: schemaType },
      })
      if (enumOptions) {
        newField.options.enum = enumOptions
      }
      fields.value.push(newField)
      selectField(fields.value.length - 1)
    }



    return {
      dialogRef, onDialogOK, onDialogCancel, onDialogHide,
      darkMode,
      dataSchema,
    
      getDarkModeClass,
    }
  }
})
</script>
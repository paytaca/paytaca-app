<template>
  <div>
    <div class="row items-center justify-end q-gutter-y-sm builder-header">
      <div>
        <q-icon name="info" size="xs" color="primary" class="q-mr-xs cursor-pointer">
          <q-tooltip class="bg-grey-9 text-body2" style="max-width: 250px">
            {{ $t('FormBuilderTooltip', 'Define the custom fields that subscribers must provide when subscribing to this plan.') }}
          </q-tooltip>
        </q-icon>
        <span class="text-caption text-grey">{{ $t('SubscriberForm', 'Subscriber Form') }}</span>
      </div>
      <q-space/>
      <q-btn
        :flat="!showPreview"
        :outline="showPreview"
        dense
        icon="preview"
        no-caps
        :label="$t('Preview')"
        @click="showPreview = !showPreview"
      />
    </div>
    <q-separator />
    <q-banner v-if="errorMessage" class="bg-red-5 text-white rounded-borders">
      {{ errorMessage }}
    </q-banner>
    <q-tab-panels v-model="currentTab" animated keep-alive class="builder-tab-panels">
      <q-tab-panel name="main">
        <!-- Field List -->
        <div class="col-12 col-sm-7 col-md-8 canvas q-pa-md">
          <div class="text-subtitle2 text-grey q-mb-sm row items-center">
            <span>{{ $t('Fields', {}, 'Fields') }}</span>
            <q-space />
            <span class="text-caption">{{ fields.length }} {{ $t('fields', {}, 'fields') }}</span>
          </div>

          <transition-group tag="div" class="q-gutter-y-sm" name="field-list">
            <div
              v-for="(field, index) in fields"
              :key="field._index"
              class="field-item rounded-borders q-pa-sm"
              :class="selectedFieldIndex === index ? 'selected' : ''"
            >
              <div class="row items-center no-wrap q-gutter-x-sm">
                <div class="column q-gutter-y-xs">
                  <q-btn flat dense size="sm" icon="arrow_upward" :disable="index === 0" @click="moveField(index, -1)" />
                  <q-btn flat dense size="sm" icon="arrow_downward" :disable="index === fields.length - 1" @click="moveField(index, 1)" />
                </div>

                <div class="q-space cursor-pointer" @click="selectField(index)">
                  <div class="row items-center">
                    <q-icon :name="getFieldIcon(field)" class="q-mr-xs" size="xs" />
                    <span class="text-weight-medium">{{ field.name || $t('UnnamedField', {}, 'Unnamed field') }}</span>
                    <q-badge v-if="field.required" color="negative" class="q-ml-sm">{{ $t('Required', {}, 'Required') }}</q-badge>
                  </div>
                  <div class="text-caption text-grey">{{ getFieldTypeLabel(field) }}</div>
                </div>

                <q-btn flat dense icon="delete_outline" color="negative" @click="removeField(index)" />
              </div>
            </div>
          </transition-group>

          <div v-if="!fields.length" class="row column items-center text-grey q-py-xl">
            <q-icon name="add_box" size="48px" class="q-mb-sm block" />
            <div>{{ $t('NoFieldsYet', {}, 'No fields yet. Click Add field.') }}</div>
          </div>

          <div class="q-mt-md">
            <q-btn no-caps outline icon="add" :label="$t('AddField', {}, 'Add field')" class="full-width">
              <q-menu auto-close fit class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
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
        </div>
      </q-tab-panel>
      <q-tab-panel name="field">
        <!-- Config Panel -->
        <div class="config-panel">
          <template v-if="selectedField">
            <div class="text-subtitle2 text-grey q-mb-sm">
              {{ $t('FieldConfig', { index: selectedFieldIndex}, `Field #${selectedFieldIndex + 1} Configuration`) }}
            </div>
            <q-input
              outlined
              dense
              :dark="darkMode"
              :label="$t('FieldName', {}, 'Field name') + ' *'"
              v-model="selectedField.name"
              class="q-mb-sm"
              :rules="[val => !!val || $t('Required', {}, 'Required')]"
            />
            <q-select
              outlined
              dense
              :dark="darkMode"
              :label="$t('FieldType', {}, 'Field type')"
              v-model="selectedField.options.type"
              :options="fieldTypeOptions"
              option-value="value"
              option-label="label"
              map-options
              emit-value
              class="q-mb-sm"
              @update:model-value="onFieldTypeChange"
            />
            <q-toggle
              :dark="darkMode"
              :label="$t('Required', {}, 'Required')"
              v-model="selectedField.required"
              class="q-mb-sm"
            />
            <q-toggle
              v-if="selectedField.options.type === 'string'"
              :dark="darkMode"
              :label="$t('AddChoices', {}, 'Add Choices')"
              :model-value="Array.isArray(selectedField.options.enum)"
              @update:model-value="val => selectedField.options.enum = val ? [] : null"
              class="q-mb-sm"
            />

            <template v-if="selectedField.options.type === 'string' && selectedField.options.enum">
              <div class="text-caption text-grey q-mt-sm">{{ $t('Options', {}, 'Options') }}</div>
              <div v-for="(opt, i) in selectedField.options.enum" :key="i" class="row items-center q-gutter-x-sm q-mb-xs">
                <q-input outlined dense :dark="darkMode" v-model="selectedField.options.enum[i]" class="q-space" />
                <q-btn flat dense icon="close" color="negative" @click="removeEnumOption(i)" />
              </div>
              <q-btn flat dense icon="add" no-caps :label="$t('AddOption', {}, 'Add option')" @click="addEnumOption" class="q-mt-xs" />
            </template>
          </template>
          <div v-else class="row column items-center text-grey q-py-xl">
            <q-icon name="tune" size="48px" class="q-mb-sm block" />
            <div>{{ $t('SelectFieldToConfigure', {}, 'Select a field to configure') }}</div>
          </div>
        </div>
      </q-tab-panel>
      <q-tab-panel name="preview">
        <JSONFormPreview :schema-data="serializedFields" />
      </q-tab-panel>
    </q-tab-panels>
    <q-separator spaced />

    <div class="row items-center justify-end">
      <q-btn
        v-if="selectedField || showPreview"
        rounded
        dense
        no-caps
        padding="xs sm"
        :label="$t('BackToFields', 'Back to fields')"
        color="pt-primary2"
        @click="() => {
          selectedFieldIndex = -1
          showPreview = false
        }"
      />
      <q-btn
        v-else
        rounded
        dense
        no-caps
        padding="xs sm"
        color="pt-primary1"
        :label="$t('Create')"
        type="submit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar, useFormChild } from 'quasar'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  createUnserializedSchemaField,
  serializeSchemaFields,
  findDuplicateFields,
} from './jsonform-utils'
import JSONFormPreview from 'src/components/jsonforms/JSONFormPreview.vue'


const $emit = defineEmits([
  'update:unserializedSchemaData',
  'save',
  'cancel',
])

const props = defineProps({
  unserializedSchemaData: Array,
})

const $q = useQuasar()
const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const loading = ref(false)
const showPreview = ref(false)
const selectedFieldIndex = ref(-1)
const currentTab = computed(() => {
  if (showPreview.value) return 'preview'

  if(selectedFieldIndex.value >= 0 && selectedFieldIndex.value < fields.value.length) {
    return 'field';
  }

  return 'main'
})

const fieldTypes = [
  { value: 'string', label: $t('Text', {}, 'Text'), icon: 'text_fields' },
  { value: 'string:enum', label: $t('Select', {}, 'Select'), icon: 'list' },
  // { value: 'integer', label: $t('Integer', {}, 'Integer'), icon: 'numbers' },
  { value: 'number', label: $t('Number', {}, 'Number'), icon: 'exposure' },
  { value: 'boolean', label: $t('Boolean', {}, 'Boolean / Toggle'), icon: 'toggle_on' },
  // { value: 'object', label: $t('Group', {}, 'Group / Object'), icon: 'folder' },
  // { value: 'array', label: $t('Array', {}, 'Array / List'), icon: 'data_array' },
]

const fieldTypeOptions = [
  { value: 'string', label: $t('Text', {}, 'Text') },
  // { value: 'integer', label: $t('Integer', {}, 'Integer') },
  { value: 'number', label: $t('Number', {}, 'Number') },
  { value: 'boolean', label: $t('Boolean', {}, 'Boolean') },
  // { value: 'object', label: $t('Group', {}, 'Group') },
  // { value: 'array', label: $t('Array', {}, 'Array') },
]

const fields = ref([])
const serializedFields = computed(() => serializeSchemaFields(fields.value, { normalizeNames: true }))
const fieldsString = computed(() => JSON.stringify(fields.value))
watch(fieldsString, () => {
  const propString = JSON.stringify(props.unserializedSchemaData || [])
  if (propString !== fieldsString.value) {
    $emit('update:unserializedSchemaData', fields.value)
  }
})

watch(() => props.unserializedSchemaData, () => {
  const newFields = Array.isArray(props.unserializedSchemaData) ? props.unserializedSchemaData : []
  const propString = JSON.stringify(newFields)
  if (propString === fieldsString.value) return

  // Clone to avoid mutating the prop, while reusing old indices for transition stability
  fields.value = structuredClone(newFields).map((field, index) => {
    field._index = fields.value?.[index]?._index ?? field._index
    return field
  })
}, { immediate: true })

const selectedField = computed(() => {
  if (selectedFieldIndex.value >= 0 && selectedFieldIndex.value < fields.value.length) {
    return fields.value[selectedFieldIndex.value]
  }
  return null
})

function selectField(index) {
  if (index === selectedFieldIndex.value) selectedFieldIndex.value = -1;
  else selectedFieldIndex.value = index
}

function addField(type) {
  let schemaType = type
  let enumOptions = undefined
  if (type === 'string:enum') {
    schemaType = 'string'
    enumOptions = ['Option 1', 'Option 2'];
  }

  const newField = createUnserializedSchemaField({
    name: `Field ${fields.value.length + 1}`,
    options: { type: schemaType },
  })
  if (enumOptions) {
    newField.options.enum = enumOptions
  }
  fields.value.push(newField)
  selectField(fields.value.length - 1)
}

function removeField(index) {
  fields.value.splice(index, 1)
  if (selectedFieldIndex.value === index) {
    selectedFieldIndex.value = -1
  } else if (selectedFieldIndex.value > index) {
    selectedFieldIndex.value--
  }
}

function moveField(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= fields.value.length) return
  const item = fields.value.splice(index, 1)[0]
  fields.value.splice(newIndex, 0, item)
  if (selectedFieldIndex.value === index) {
    selectedFieldIndex.value = newIndex
  } else if (selectedFieldIndex.value === newIndex) {
    selectedFieldIndex.value = index
  }
}

function onFieldTypeChange() {
  const field = selectedField.value
  if (!field) return
  if (field.options.type === 'string' && !field.options.enum) {
    // switching to plain string, keep as is
  } else if (field.options.type === 'string' && field.options.enum) {
    // already has enum, keep it
  } else {
    delete field.options.enum
  }
}

function addEnumOption() {
  if (!selectedField.value.options.enum) selectedField.value.options.enum = []
  selectedField.value.options.enum.push(`Option ${selectedField.value.options.enum.length + 1}`)
}

function removeEnumOption(index) {
  selectedField.value.options.enum.splice(index, 1)
}

function getFieldIcon(field) {
  const map = {
    string: field.options.enum?.length ? 'list' : 'text_fields',
    integer: 'numbers',
    number: 'exposure',
    boolean: 'toggle_on',
    object: 'folder',
    array: 'data_array',
  }
  return map[field.options.type] || 'text_fields'
}

function getFieldTypeLabel(field) {
  if (field.options.enum?.length) return $t('Select', {}, 'Select')
  const ft = fieldTypeOptions.find(f => f.value === field.options.type)
  return ft?.label || field.options.type
}


const errorMessage = ref('')
function validate() {
  console.log('Running validations');
  const emptyFields = fields.value.find(f => !f.name)
  const duplicateFields = findDuplicateFields(fields.value.map(field => field.name))
  console.log({ duplicateFields, emptyFields });
  if (emptyFields) {
    errorMessage.value = $t('AllFieldsNeedName', {}, 'All fields must have a name');
  } else if (duplicateFields.length) {
    errorMessage.value = $t('DuplicateFieldsFound', 'Duplicate fields found') + ': ' + duplicateFields.map(field => field.field).join(', ')
  } else {
    errorMessage.value = '';
  }

  return !errorMessage.value
}

function resetValidation() {
  errorMessage.value = '';
}

useFormChild({
  validate, // Function; Can be async;
            // Should return a Boolean (or a Promise resolving to a Boolean)
  resetValidation,    // Optional function which resets validation
  requiresQForm: false // should it error out if no parent QForm is found?
})
</script>

<style scoped>
.json-form-builder-card {
  width: 100%;
  height: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
}
.builder-header {
  min-height: 56px;
}
.builder-body {
  flex: 1;
  overflow: hidden;
}
.canvas {
  overflow-y: auto;
  min-width: 250px;
}
.config-panel {
  overflow-y: auto;
  min-width: 200px;
}
.field-item {
  background: rgba(128, 128, 128, 0.05);
  border: 1px solid rgba(128, 128, 128, 0.2);
  transition: all 0.2s;
}

.field-item:hover {
  background: rgba(128, 128, 128, 0.1);
}
.field-item.selected {
  border-color: var(--q-primary);
  background: rgba(var(--q-primary-rgb), 0.1);
}
.json-preview {
  max-height: 60vh;
  overflow: auto;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 8px;
}
.builder-footer {
  min-height: 56px;
}

.builder-tab-panels {
  background: none;
}

::v-deep .builder-tab-panels .q-tab-panel {
  padding: 8px 0;
}


/* Transition group animation */
/* 1. declare transition */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

/* 2. declare enter from and leave to state */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(30px, 0);
}

/* 3. ensure leaving items are taken out of layout flow so that moving
      animations can be calculated correctly. */
.fade-leave-active {
  position: absolute;
}
</style>

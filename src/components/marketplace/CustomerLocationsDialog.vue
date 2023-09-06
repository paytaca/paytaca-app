<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <q-card-section class="q-pb-none">
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">Addresses</div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
        </div>
        <div class="row">
          <q-space/>
          <q-btn
            icon="add"
            no-caps label="Add new address"
            padding="2px md"
            @click="() => editLocation()"
          />
        </div>
      </q-card-section>
      <q-card-section v-if="!customerLocations?.length">
        <div class="text-center text-grey">
          No saved locations
        </div>
      </q-card-section>
      <q-item v-for="location in customerLocations" :key="location?.id">
        <q-item-section>
          <q-item-label>
            <template v-if="location?.name">
              {{ location?.name }} <span class="text-grey">#{{ location?.id }}</span>
            </template>
            <template v-else>Location #{{ location?.id }}</template>
          </q-item-label>
          <q-item-label class="text-caption-bottom ellipsis-2-lines">
            {{ location?.formatted }}
          </q-item-label>
        </q-item-section>
        <q-item-section side top style="padding-left:4px;">
          <q-icon name="more_vert" class="q-my-sm q-ml-sm"/>
          <q-menu :class="[ 'text-left', darkMode ? 'pt-dark' : 'text-black' ]">
            <q-list separator>
              <q-item
                clickable v-ripple
                v-close-popup
                @click="() => editLocation(location)"
              >
                <q-item-section>
                  <q-item-label>Edit</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator/>
              <q-item
                clickable v-ripple
                v-close-popup
                @click="() => deleteLocationConfirm(location?.id)"
              >
                <q-item-section>
                  <q-item-label>Delete</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-item-section>
      </q-item>
    </q-card>
  </q-dialog>
</template>
<script>
import { Location } from 'src/marketplace/objects'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, ref, watch } from 'vue'
import CustomerLocationFormDialog from 'src/components/marketplace/CustomerLocationFormDialog.vue'

export default defineComponent({
  name: 'CustomerLocationsDialog',
  props: {
    modelValue: Boolean,
  },
  emits: [
    'update:modelValue',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup(props, { emit: $emit }) {
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const customerLocations = computed(() => $store.getters['marketplace/customerLocations'])

    function editLocation(location = Location.parse()) {
      $q.dialog({
        component: CustomerLocationFormDialog,
        componentProps: {
          location: location,
          hideOnSave: true,
        }
      })
    }

    function deleteLocationConfirm(locationId) {
      $q.dialog({
        title: 'Delete address',
        message: 'Are you sure?',
        ok: { color: 'red', noCaps: true, label: 'Delete', outlined: true },
        cancel: { flat: true, color: 'grey', noCaps: true },
        class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
      }).onOk(() => deleteLocation(locationId))
    }

    function deleteLocation(locationId) {
      const dialog = $q.dialog({
        title: 'Removing address',
        progress: true,
        ok: false,
        cancel: false,
        class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
      })

      return $store.dispatch('marketplace/deleteCustomerLocation', locationId)
        .finally(() => dialog.hide())
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      customerLocations,
      editLocation,
      deleteLocationConfirm,
    }
  },
})
</script>

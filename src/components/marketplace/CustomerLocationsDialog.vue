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
      <q-list class="q-mb-md" separator>
        <q-item v-for="location in customerLocations" :key="location?.id">
          <q-item-section>
            <q-item-label class="text-subtitle1">
              <template v-if="location?.name">
                {{ location?.name }} <span class="text-grey">#{{ location?.id }}</span>
              </template>
              <template v-else>Address #{{ location?.id }}</template>
            </q-item-label>
            <q-item-label class="text-caption ellipsis-2-lines">
              {{ location?.formatted }}
            </q-item-label>
            <q-item-label v-if="location?.validCoordinates" class="text-body2 text-underline">
              <q-btn
                flat
                no-caps
                padding="none sm"
                class="q-r-mx-lg"
                @click="() => showLocationInDialog(location)"
              >
                <q-icon name="location_on"/>
                <span class="text-underline">View in map</span>
              </q-btn>
            </q-item-label>
          </q-item-section>
          <q-item-section side top style="padding-left:4px;">
            <slot name="actions" v-bind="{ editLocation, deleteLocationConfirm, location }">
              <div class="row items-center no-wrap q-gutter-x-sm">
                <q-btn flat icon="edit" padding="sm" @click="() => editLocation(location)"/>
                <q-separator vertical />
                <q-btn flat icon="delete" padding="sm" color="red" @click="() => deleteLocationConfirm(location?.id)"/>
              </div>
            </slot>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </q-dialog>
</template>
<script>
import { Location } from 'src/marketplace/objects'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, defineComponent, ref, watch } from 'vue'
import CustomerLocationFormDialog from 'src/components/marketplace/CustomerLocationFormDialog.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'

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
          openPinOnShow: !location?.id,
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

    function showLocationInDialog(location=Location.parse()) {
      $q.dialog({
        component: PinLocationDialog,
        componentProps: {
          initLocation: {
            latitude: parseFloat(location?.latitude),
            longitude: parseFloat(location?.longitude)
          },
          static: true,
          headerText: location?.name || undefined,
        }
      })
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      customerLocations,
      editLocation,
      deleteLocationConfirm,

      showLocationInDialog,
    }
  },
})
</script>

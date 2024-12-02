<template>
  <q-dialog ref="dialogRef" persistent seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-xs pt-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="text-grey-10">
        <!-- <div class="text-grad">Connect to this site?</div> -->
        <div class="row items-start justify-start no-wrap q-gutter-x-sm">
          <!-- TODO: word add to translate -->
          <span class="text-grad">{{ $t('SendChangeToAddress') }}</span>
        </div>
      </q-card-section>
      <q-card-section>
        <q-list bordered separator >
          <q-item v-for="addressSelection in addresses">
            <q-item-section>
              <q-option-group 
                v-model="selectedAddress" 
                :options="[{ label: `[${addressSelection.index}] - ${shortenAddressForDisplay(addressSelection.address)}`, value: addressSelection }]"></q-option-group>
            </q-item-section>
            <q-separator></q-separator>
            <q-item-section>
              <q-option-group 
                v-model="selectedAddress" 
                :options="[{ label: `${shortenAddressForDisplay(nominatedChangeAddress)}`, value: nominatedChangeAddress }]"></q-option-group>
            </q-item-section>
            <q-item-section side>
              <q-item-label caption class="row items-center">
                <!-- TODO: SHOW CONNECTED APP ICONS AT THE BOTTOM -->
                <!-- <q-badge v-forcolor="grey-8">Last Used</q-badge> -->
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <!-- buttons example -->
      <q-card-actions>
        <q-space />
        <q-btn
          outline
          color="grey"
          :label="$t('Cancel')"
          rounded
          flat
          @click="onCancelClick"
          no-caps
        />

        <q-btn
          color="green"
          :label="$t('Ok')"
          rounded
          no-caps
          @click="onOkClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } 
  = useDialogPluginComponent()
const emit = defineEmits(['ok', 'hide'])
const props = defineProps({
  addresses: Array, /* { address: string, index: number, wif: string, connectedAppIcons?: string[] }[] */
  nominatedChangeAddress: String
})
const selectedAddress = ref /* <{ address: string, wif: string, index: number } | string> */ ()
// const hideDialog = () => { emit('ok') }
const onOkClick = () => {
  if (typeof(selectedAddress.value) === 'string') {
    return onDialogOK({address: selectedAddress.value})
  }
  onDialogOK(selectedAddress.value)
}
const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}

</script>

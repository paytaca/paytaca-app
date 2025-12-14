<template>
  <q-dialog ref="dialogRef" persistent seamless full-width position="bottom" rounded>
    <q-card 
      style="min-height: 90vh;" 
      class="br-15 text-bow pt-card"
      :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark' : 'bg-pt-light']"
      >
      
      <div class="row no-wrap items-start justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          {{ $t('SpecifyAddress', 'Specify the address for this wallet connection session') }}
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
        <div class="text-body1 q-my-sm">{{ $t('PasteAddress', 'Paste the address') }}</div>
        <q-input 
          v-model="address" 
          :label="$t('Address')" 
          type="text"
          required
          :rules="addressRules"
          filled/>
        <div class="text-body1 q-my-sm">{{ $t('EnterAddressIndex') }}</div>
        <q-input 
          v-model="addressIndex"
          type="number"
          :label="$t('AddressIndexLabel', 'Address Index')" 
          :hint="$t('AddressIndexHint')"
          filled
          />
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
import { ref, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { decodeCashAddress } from '@bitauth/libauth'

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const address = ref()
const addressIndex = ref()

const props = defineProps({
  darkMode: Boolean,
})

const addressRules = computed(() => {
  const correctAddressFormat = (v) => {
    const decoded = decodeCashAddress(v)
    if (typeof decoded === 'string') {
      return decoded
    }
    return true
  }
  return [correctAddressFormat]
})

const onOkClick = () => {
  onDialogOK({ address: address.value, addressIndex: addressIndex.value })
}

const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}
</script>



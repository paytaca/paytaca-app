<template>
  <q-dialog ref="dialogRef" persistent seamless full-width position="bottom" rounded>
    <q-card 
      style="min-height: 90vh;" 
      class="br-15 text-bow pt-card bottom-card"
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
        <div v-if="validationError" class="validation-error-banner q-pa-md q-mt-sm rounded-borders">
          <div class="row items-start no-wrap">
            <q-icon name="error_outline" color="negative" size="24px" class="q-mr-sm" />
            <div class="text-body2 text-negative">{{ validationError }}</div>
          </div>
        </div>
        <div class="text-body1 q-mt-md q-my-sm">{{ $t('EnterAddressIndex') }}</div>
        <q-input 
          v-model="addressIndex"
          type="number"
          :label="$t('AddressIndexLabel', 'Address Index')" 
          :hint="$t('AddressIndexHintLabel')"
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
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { decodeCashAddress } from '@bitauth/libauth'

const { t } = useI18n()
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const props = defineProps({
  darkMode: Boolean,
  validateAddress: Function,
})

const address = ref()
const addressIndex = ref()
const validationError = ref('')

const addressRules = computed(() => {
  const correctAddressFormat = (v) => {
    if (!v) return true
    const decoded = decodeCashAddress(v)
    if (typeof decoded === 'string') {
      return decoded
    }
    return true
  }
  return [correctAddressFormat]
})

const onOkClick = async () => {
  validationError.value = ''
  if (props.validateAddress) {
    const result = await props.validateAddress(address.value, addressIndex.value)
    if (!result.ok) {
      validationError.value = result.error || t('AddressNotFoundOnThisWallet', 'Could not find address on this wallet. Try providing an address index.')
      return
    }
    onDialogOK({ address: address.value, addressIndex: addressIndex.value, wif: result.wif, addressIndexResult: result.addressIndex })
    return
  }
  onDialogOK({ address: address.value, addressIndex: addressIndex.value })
}

const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}
</script>

<style scoped>
.validation-error-banner {
  background-color: rgba(211, 47, 47, 0.1);
  border: 1px solid rgba(211, 47, 47, 0.3);
}
</style>



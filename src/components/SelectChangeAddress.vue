<template>
  <q-dialog ref="dialogRef" persistent seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-xs pt-card" :class="getDarkModeClass(darkMode)">
      <div class="text-grad text-center q-my-md text-h6">{{$t('SelectChangeAddress')}}</div>
      <div class="row q-my-md justify-center items-center q-gutter-md q-px-md">
        <q-checkbox v-model="useSystemGeneratedChangeAddress" :label="$t('UseSystemGeneratedChangeAddress')" /> 
        <q-icon name="help" @click="showHelpDialog" size="lg"></q-icon>
      </div>
      <q-card-section>
        <q-list bordered separator>
        <q-item v-if="useSystemGeneratedChangeAddress" active focused>
          <q-item-section>
            <div class="text-caption" >{{ shortenAddressForDisplay(defaultChangeAddress) }}</div>
          </q-item-section>
          <q-item-section side>
              <div class="row flex q-gutter-x-sm">
                <q-icon
                  name="check"
                  color="primary"
                  size="sm"
                />
              </div>
            </q-item-section>
        </q-item>
        <template v-else>
          <q-item
          v-for="addressOption in addressOptions"
            :key="addressOption.address"
            :clickable="!useSystemGeneratedChangeAddress"
            @click="selectAddress(addressOption.address)"
            :active="addressOption.selected"
            :focused="addressOption.selected"
          >
            <q-item-section>
              <div class="text-caption" >{{ `${addressOption.label}` }}</div>
              <div class="row">
                <div class="q-pa-md q-gutter-xs">
                  <q-avatar
                    v-for="connectedApp,i in addressOption.connectedApps"
                    :key="i"
                    size="sm"
                    :style="!connectedApp.app_icon ? 'border: 1px solid grey': ''"
                  >
                    <img v-if="connectedApp.app_icon" :src="connectedApp.app_icon">
                    <q-icon v-else name="image_not_supported" />
                  </q-avatar>
                </div>
              </div>
            </q-item-section>
            <q-item-section side>
              <div class="row flex q-gutter-x-sm">
                <q-icon
                  v-if="addressOption.selected"
                  name="check"
                  color="primary"
                  size="sm"
                />
              </div>
            </q-item-section>
        </q-item>
        </template>
        
      </q-list>
      </q-card-section>
      <q-card-actions class="q-pa-md q-gutter-md">
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
          color="brandblue"
          :label="$t('Select')"
          rounded
          no-caps
          :disable="!addressSelected"
          @click="onConfirmSelect"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } 
  = useDialogPluginComponent()
const props = defineProps({
  walletAddresses: Array,
  connectedApps: Array,
  defaultChangeAddress: {
    type: String,
    required: true
  }, /* Paytaca nominated change address */
  darkMode: Boolean
})

const $q = useQuasar()
const { t: $t } = useI18n()
const addressSelected = ref /*<string>*/ ('')
const addressOptions  = ref /*<{label: string, value: string }[]>*/ ([])
const useSystemGeneratedChangeAddress = ref(false)

const onConfirmSelect = () => {
  if (useSystemGeneratedChangeAddress.value) {
    return onDialogOK(props.defaultChangeAddress)    
  }
  onDialogOK(
    props.walletAddresses.find((walletAddress) => walletAddress.address === addressSelected.value)?.address
  )
}
const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}

const selectAddress = (address /*:string*/) => {
  console.log('🚀 ~ selectAddress ~ address:', address)
  
  addressOptions.value.forEach(addressOption => {
    addressOption.selected = (addressOption.address === address);
    if (addressOption.selected) {
      addressSelected.value = address
    }
  });
}

const showHelpDialog = () => {
  $q.dialog({
    message: $t('UseSystemGeneratedChangeAddressHelp'),
    ok: {
      color: 'brandblue'
    }
  })
}

watch(() => useSystemGeneratedChangeAddress.value, (yesUse) => {
  if (yesUse) {
    addressSelected.value = props.defaultChangeAddress
  } else {
    addressSelected.value = addressOptions.value?.find((addressOption) => addressOption.selected)?.address || ''
  }
})

onMounted(() => {
  // walletAddresses has wif we don't want to pass it as options to the dialog
  addressOptions.value = props.walletAddresses?.map((item) => ({ label: shortenAddressForDisplay(item.address), address: item.address }))
  addressOptions.value?.forEach((addressOption) => {
    const connectedAppsForAddressOption = props.connectedApps?.filter((connectedApp) => {
      return connectedApp.wallet_address === addressOption.address
    })
    addressOption.connectedApps = connectedAppsForAddressOption
  })
})
</script>

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit 
}
</style>

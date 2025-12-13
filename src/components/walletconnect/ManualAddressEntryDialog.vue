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
        <q-input v-model="address" :label="$t('Address')" filled/>
        <div class="text-body1 q-my-sm">{{ $t('EnterAddressIndex', 'Enter the address index (optional).') }}</div>
        <q-input 
          v-model="addressIndex" 
          :label="$t('AddressIndexLabel', 'Address Index')" 
          :hint="$t('AddressIndexHint', `Example: Enter 1 if you\'re referring to address at path 0/1. If you don\'t know the index, leave this blank. The device will try to find the address index based from 0 to last used addressindex`)"
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
import { ref, onMounted, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { convertCashAddress } from 'src/wallet/chipnet'
import PeerInfo from './PeerInfo.vue'

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const address = ref()
const addressIndex = ref()

const props = defineProps({
  darkMode: Boolean,
})

const onOkClick = () => {
  onDialogOK({ address: address.value, addressIndex: addressIndex.value })
}

const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}
</script>



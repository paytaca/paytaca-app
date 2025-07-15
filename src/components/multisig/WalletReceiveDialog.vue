<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" style="margin-top: -20px" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('Receive')}}</div>
        <div class="text-subtitle-2 text-center text-bow-muted">Scan the QR Code from your device</div>
        <div class="text-center" style="margin-top: 20px;">
          <q-img @click="isCt = false" src="bitcoin-cash-circle.svg" height="35px" width="35px" />
          <span @click="isCt = false">&nbsp;BCH</span>
          <q-toggle
            v-model="isCashtoken"
            class="text-bow"
            style="margin: auto;"
            keep-color
            color="teal-5"
            size="lg"
            checked-icon="img:ct-logo.png"
            unchecked-icon="img:bch-logo.png"
            :class="getDarkModeClass(darkMode)"
          />
          <q-img @click="isCashtoken = true" src="ct-logo.png" height="35px" width="35px" />
          <span @click="isCashtoken = true">&nbsp;{{ $t('CashToken') }}</span>
        </div>
        <qr-code :text="address" :size="220" :icon="isCashtoken ? 'ct-logo.png': 'bch-logo.png' "></qr-code>
        <div v-if="address" class="text-center text-caption flex flex-wrap justify-center items-center q-mt-sm q-gutter-x-sm">
            Address-{{ addressIndex }}: {{shortenAddressForDisplay(address)}}
            <CopyButton :text="address"/>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn label="Close" @click="onDialogOK" color="red" v-close-popup></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref, onMounted, watch, inject } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getMultisigCashAddress } from 'src/lib/multisig'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { CashAddressType, decodeCashAddress, encodeCashAddress } from 'bitauth-libauth-v3'
import CopyButton from 'src/components/CopyButton.vue'

// eslint-disable-next-line no-undef
const props = defineProps({
  multisigWallet: Object,
  darkMode: Boolean,
  cashAddressNetworkPrefix: String
})
const isCashtoken = ref(false)
const address = ref()
const addressIndex = ref(0)
const { dialogRef, onDialogOK } = useDialogPluginComponent()

watch(() => isCashtoken.value, (isTrue) => {
  if (!address.value) return
  const decoded = decodeCashAddress(address.value)
  if (isTrue) {
    const encoded = encodeCashAddress({
      prefix: props.cashAddressNetworkPrefix,
      type: CashAddressType.p2shWithTokens,
      payload: decoded.payload
    })
    address.value = encoded.address
    return
  }
  const encoded = encodeCashAddress({
    prefix: props.cashAddressNetworkPrefix,
    type: CashAddressType.p2sh,
    payload: decoded.payload
  })
  address.value = encoded.address
})

onMounted(() => {
  address.value = getMultisigCashAddress({
    lockingData: props.multisigWallet.lockingData,
    template: props.multisigWallet.template,
    cashAddressNetworkPrefix: props.cashAddressNetworkPrefix
  })
  addressIndex.value = props.multisigWallet.lockingData.hdKeys.addressIndex
})

</script>

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>
